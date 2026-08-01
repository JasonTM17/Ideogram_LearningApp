import {
  SecureSessionStorageError,
  type AsyncKeyValueStorage,
} from './secure-session-storage-types';
import {
  createSupabasePkceFlowRegistryKey,
  createSupabasePkceFlowSlotKey,
  mergeSupabasePkceFlowId,
  parseSupabasePkceFlowId,
  readSupabasePkceFlowIds,
} from './supabase-pkce-flow-registry';

export interface InstallationSentinelPort {
  create: () => Promise<void>;
  exists: () => Promise<boolean>;
}

const sharedInstallationChecks = new Map<string, Promise<void>>();
const sharedFlowRegistryLocks = new Map<string, Promise<void>>();

export class InstallationBoundSessionStorage implements AsyncKeyValueStorage {
  private installationCheck: Promise<void> | undefined;

  constructor(
    private readonly storage: AsyncKeyValueStorage,
    private readonly supabaseStorageKey: string,
    private readonly sentinel: InstallationSentinelPort,
  ) {
    if (!supabaseStorageKey || supabaseStorageKey.length > 1_024) {
      throw new SecureSessionStorageError(
        'invalid_input',
        'Supabase session storage key is invalid.',
      );
    }
  }

  async getItem(key: string): Promise<string | null> {
    await this.ensureCurrentInstallation();
    return this.storage.getItem(key);
  }

  async removeItem(key: string): Promise<void> {
    await this.ensureCurrentInstallation();
    await this.storage.removeItem(key);

    const flowId = parseSupabasePkceFlowId(this.supabaseStorageKey, key);
    if (flowId) {
      await this.updateFlowRegistry((flowIds) =>
        flowIds.filter((candidate) => candidate !== flowId),
      );
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.ensureCurrentInstallation();

    const flowId = parseSupabasePkceFlowId(this.supabaseStorageKey, key);
    if (!flowId) {
      await this.storage.setItem(key, value);
      return;
    }

    await this.runFlowRegistryExclusive(async () => {
      await this.updateFlowRegistryUnlocked((flowIds) => mergeSupabasePkceFlowId(flowIds, flowId));
      await this.storage.setItem(key, value);
    });
  }

  private async ensureCurrentInstallation(): Promise<void> {
    this.installationCheck ??= this.runSharedInstallationCheck();

    try {
      await this.installationCheck;
    } catch (error) {
      this.installationCheck = undefined;
      throw error;
    }
  }

  private runSharedInstallationCheck(): Promise<void> {
    const existing = sharedInstallationChecks.get(this.supabaseStorageKey);
    if (existing) {
      return existing;
    }

    const check = this.initializeInstallation().finally(() => {
      if (sharedInstallationChecks.get(this.supabaseStorageKey) === check) {
        sharedInstallationChecks.delete(this.supabaseStorageKey);
      }
    });
    sharedInstallationChecks.set(this.supabaseStorageKey, check);
    return check;
  }

  private async initializeInstallation(): Promise<void> {
    if (await this.sentinel.exists()) {
      return;
    }

    await this.scrubRetainedSupabaseCredentials();
    await this.sentinel.create();
  }

  private async scrubRetainedSupabaseCredentials(): Promise<void> {
    const flowIndexKey = `${this.supabaseStorageKey}-flows-code-verifier`;
    const registryKey = createSupabasePkceFlowRegistryKey(this.supabaseStorageKey);
    const flowIds = [
      ...readSupabasePkceFlowIds(await this.storage.getItem(flowIndexKey)),
      ...readSupabasePkceFlowIds(await this.storage.getItem(registryKey)),
    ];
    const credentialKeys = [
      this.supabaseStorageKey,
      `${this.supabaseStorageKey}-user`,
      `${this.supabaseStorageKey}-code-verifier`,
      flowIndexKey,
      registryKey,
      ...[...new Set(flowIds)].map((flowId) =>
        createSupabasePkceFlowSlotKey(this.supabaseStorageKey, flowId),
      ),
    ];
    const results = await Promise.allSettled(
      credentialKeys.map((key) => this.storage.removeItem(key)),
    );
    const failure = results.find((result) => result.status === 'rejected');

    if (failure) {
      throw new SecureSessionStorageError(
        'storage_failure',
        'Retained native credentials could not be cleared.',
      );
    }
  }

  private updateFlowRegistry(
    update: (flowIds: string[]) => string[] | { evictedFlowIds: string[]; flowIds: string[] },
  ): Promise<void> {
    return this.runFlowRegistryExclusive(() => this.updateFlowRegistryUnlocked(update));
  }

  private async updateFlowRegistryUnlocked(
    update: (flowIds: string[]) => string[] | { evictedFlowIds: string[]; flowIds: string[] },
  ): Promise<void> {
    const registryKey = createSupabasePkceFlowRegistryKey(this.supabaseStorageKey);
    const current = readSupabasePkceFlowIds(await this.storage.getItem(registryKey));
    const result = update(current);
    const nextFlowIds = Array.isArray(result) ? result : result.flowIds;
    const evictedFlowIds = Array.isArray(result) ? [] : result.evictedFlowIds;

    await Promise.all(
      evictedFlowIds.map((flowId) =>
        this.storage.removeItem(createSupabasePkceFlowSlotKey(this.supabaseStorageKey, flowId)),
      ),
    );
    if (nextFlowIds.length === 0) {
      await this.storage.removeItem(registryKey);
    } else {
      await this.storage.setItem(registryKey, JSON.stringify(nextFlowIds));
    }
  }

  private runFlowRegistryExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = sharedFlowRegistryLocks.get(this.supabaseStorageKey) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    sharedFlowRegistryLocks.set(this.supabaseStorageKey, tail);

    return result.finally(() => {
      if (sharedFlowRegistryLocks.get(this.supabaseStorageKey) === tail) {
        sharedFlowRegistryLocks.delete(this.supabaseStorageKey);
      }
    });
  }
}
