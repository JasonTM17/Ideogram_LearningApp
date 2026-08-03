import {
  syncMutationSchema,
  syncNamespaceSchema,
  syncQueueSnapshotSchema,
} from '@ideogram/contracts';

import type {
  SyncMutation,
  SyncMutationKind,
  SyncNamespace,
  SyncQueueSnapshot,
} from '@ideogram/contracts';

const maxQueueBytes = 256 * 1024;
const maxQueueMutations = 50;

export interface SyncQueueStorage {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  clear: () => Promise<void>;
  exclusive?: <T>(operation: () => Promise<T>) => Promise<T>;
  shared?: boolean;
}

export type SyncDrainResult =
  { kind: 'blocked'; reason: string } | { kind: 'completed' } | { kind: 'retry'; reason: string };

export type SyncMutationHandler = (mutation: SyncMutation) => Promise<SyncDrainResult>;

export interface EnqueueSyncMutationInput {
  idempotencyKey: string;
  kind: SyncMutationKind;
  operationId: string;
  payload: Record<string, unknown>;
}

const emptySnapshot = (namespace: SyncNamespace): SyncQueueSnapshot => ({
  mutations: [],
  namespace,
});

const serializeSnapshot = (snapshot: SyncQueueSnapshot): string => {
  const serialized = JSON.stringify(snapshot);
  if (new TextEncoder().encode(serialized).byteLength > maxQueueBytes) {
    throw new SyncQueueError('queue_full', 'Hàng đợi ngoại tuyến đã đầy. Hãy đồng bộ trước.');
  }
  return serialized;
};

export class SyncQueueError extends Error {
  constructor(
    readonly code: 'conflict' | 'invalid' | 'queue_full' | 'storage',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SyncQueueError';
  }
}

export class DurableSyncQueue {
  private snapshot: SyncQueueSnapshot | null = null;
  private operation: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: SyncQueueStorage,
    private readonly namespace: SyncNamespace,
  ) {
    syncNamespaceSchema.parse(namespace);
  }

  async getPending(): Promise<readonly SyncMutation[]> {
    return this.withLock(async () => [...(await this.readSnapshot()).mutations]);
  }

  getNamespace(): SyncNamespace {
    return this.namespace;
  }

  async enqueue(input: EnqueueSyncMutationInput): Promise<SyncMutation> {
    return this.withLock(async () => {
      const snapshot = await this.readSnapshot();
      const existing = snapshot.mutations.find(
        (mutation) => mutation.operationId === input.operationId,
      );
      if (existing) return existing;

      if (snapshot.mutations.some((mutation) => mutation.idempotencyKey === input.idempotencyKey)) {
        throw new SyncQueueError('conflict', 'Mã idempotency đã được dùng trong hàng đợi.');
      }
      if (snapshot.mutations.length >= maxQueueMutations) {
        throw new SyncQueueError('queue_full', 'Hàng đợi ngoại tuyến đã đạt giới hạn.');
      }

      const mutation = syncMutationSchema.parse({
        createdAt: new Date().toISOString(),
        idempotencyKey: input.idempotencyKey,
        kind: input.kind,
        namespace: this.namespace,
        operationId: input.operationId,
        payload: input.payload,
        retryCount: 0,
        status: 'pending',
      });
      await this.writeSnapshot({ ...snapshot, mutations: [...snapshot.mutations, mutation] });
      return mutation;
    });
  }

  async drain(
    handler: SyncMutationHandler,
    options: { maxMutations?: number } = {},
  ): Promise<{ blocked: number; completed: number; retried: number }> {
    return this.withLock(async () => {
      const snapshot = await this.readSnapshot();
      const maxMutations = options.maxMutations ?? maxQueueMutations;
      if (!Number.isInteger(maxMutations) || maxMutations < 1 || maxMutations > maxQueueMutations) {
        throw new SyncQueueError('invalid', 'Giới hạn đồng bộ ngoại tuyến không hợp lệ.');
      }
      let blocked = 0;
      let completed = 0;
      let retried = 0;
      const remaining: SyncMutation[] = [];

      for (const [index, mutation] of snapshot.mutations.entries()) {
        if (completed + retried >= maxMutations) {
          remaining.push(...snapshot.mutations.slice(index));
          break;
        }
        if (mutation.status === 'blocked') {
          remaining.push(mutation, ...snapshot.mutations.slice(index + 1));
          blocked += 1;
          break;
        }

        const result = await handler(mutation);
        if (result.kind === 'completed') {
          completed += 1;
          continue;
        }

        if (result.kind === 'blocked' || mutation.retryCount >= 20) {
          remaining.push(
            { ...mutation, status: 'blocked' },
            ...snapshot.mutations.slice(index + 1),
          );
          blocked += 1;
          break;
        }

        remaining.push({ ...mutation, retryCount: mutation.retryCount + 1 });
        remaining.push(...snapshot.mutations.slice(index + 1));
        retried += 1;
        break;
      }
      await this.writeSnapshot({ ...snapshot, mutations: remaining });
      return { blocked, completed, retried };
    });
  }

  async clear(): Promise<void> {
    await this.withLock(async () => {
      this.snapshot = emptySnapshot(this.namespace);
      await this.storage.clear();
    });
  }

  async retryBlocked(): Promise<number> {
    return this.withLock(async () => {
      const snapshot = await this.readSnapshot();
      let changed = 0;
      const mutations = snapshot.mutations.map((mutation) => {
        if (mutation.status !== 'blocked') return mutation;
        changed += 1;
        return { ...mutation, retryCount: 0, status: 'pending' as const };
      });
      if (changed > 0) await this.writeSnapshot({ ...snapshot, mutations });
      return changed;
    });
  }

  async discardBlocked(): Promise<number> {
    return this.withLock(async () => {
      const snapshot = await this.readSnapshot();
      const mutations = snapshot.mutations.filter((mutation) => mutation.status !== 'blocked');
      const removed = snapshot.mutations.length - mutations.length;
      if (removed > 0) await this.writeSnapshot({ ...snapshot, mutations });
      return removed;
    });
  }

  private async readSnapshot(): Promise<SyncQueueSnapshot> {
    if (this.snapshot && !this.storage.shared) return this.snapshot;
    let raw: string | null;
    try {
      raw = await this.storage.read();
    } catch (error) {
      throw new SyncQueueError('storage', 'Không thể đọc hàng đợi ngoại tuyến.', { cause: error });
    }
    if (!raw) {
      this.snapshot = emptySnapshot(this.namespace);
      return this.snapshot;
    }

    try {
      const parsed = syncQueueSnapshotSchema.parse(JSON.parse(raw));
      if (
        parsed.namespace.userId !== this.namespace.userId ||
        parsed.namespace.sessionEpoch !== this.namespace.sessionEpoch
      ) {
        await this.storage.clear();
        this.snapshot = emptySnapshot(this.namespace);
        return this.snapshot;
      }
      this.snapshot = parsed;
      return parsed;
    } catch (error) {
      await this.storage.clear();
      throw new SyncQueueError('storage', 'Hàng đợi ngoại tuyến không hợp lệ và đã được dọn.', {
        cause: error,
      });
    }
  }

  private async writeSnapshot(snapshot: SyncQueueSnapshot): Promise<void> {
    const serialized = serializeSnapshot(syncQueueSnapshotSchema.parse(snapshot));
    try {
      await this.storage.write(serialized);
      this.snapshot = snapshot;
    } catch (error) {
      throw new SyncQueueError('storage', 'Không thể lưu hàng đợi ngoại tuyến.', { cause: error });
    }
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.operation;
    let release!: () => void;
    this.operation = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return this.storage.exclusive ? await this.storage.exclusive(operation) : await operation();
    } finally {
      release();
    }
  }
}
