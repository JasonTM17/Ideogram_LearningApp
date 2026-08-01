import {
  ActivityOperationIdentityError,
  activityOperationIdentityStorageKey,
} from './activity-operation-identity-contracts';

import type {
  ActivityOperationIdentity,
  ActivityOperationIdentityStoreOptions,
  AsyncKeyValueStorage,
} from './activity-operation-identity-contracts';

const persistedStateVersion = 1 as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const storageKeyPattern = /^[a-z0-9_.-]+$/iu;
const sharedIdentityLocks = new Map<string, Promise<void>>();

interface PersistedActivityOperationIdentity {
  readonly deviceId: string;
  readonly nextDeviceSequence: number;
  readonly version: typeof persistedStateVersion;
}

const isValidDeviceId = (value: unknown): value is string =>
  typeof value === 'string' && uuidPattern.test(value);

const isPersistedIdentity = (value: unknown): value is PersistedActivityOperationIdentity => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    Object.keys(candidate).length === 3 &&
    candidate.version === persistedStateVersion &&
    isValidDeviceId(candidate.deviceId) &&
    Number.isSafeInteger(candidate.nextDeviceSequence) &&
    (candidate.nextDeviceSequence as number) > 0
  );
};

/**
 * Creates a stable device identity plus monotonic sequence for public learning
 * mutations. The store only reserves operation metadata; callers retain the
 * complete request body when they need to retry an uncertain submission.
 */
export class ActivityOperationIdentityStore {
  private readonly createDeviceId: () => string;
  private readonly ensureInstallation: () => Promise<void>;
  private readonly storage: AsyncKeyValueStorage;
  private readonly storageKey: string;

  constructor(options: ActivityOperationIdentityStoreOptions) {
    if (
      !options ||
      typeof options.createDeviceId !== 'function' ||
      !options.storage ||
      typeof options.storage.getItem !== 'function' ||
      typeof options.storage.setItem !== 'function' ||
      typeof options.storage.removeItem !== 'function' ||
      (options.ensureInstallation !== undefined && typeof options.ensureInstallation !== 'function')
    ) {
      throw new ActivityOperationIdentityError(
        'invalid_input',
        'Activity operation identity storage configuration is invalid.',
      );
    }

    const storageKey = options.storageKey ?? activityOperationIdentityStorageKey;
    if (
      storageKey.trim() !== storageKey ||
      storageKey.length === 0 ||
      storageKey.length > 2_048 ||
      !storageKeyPattern.test(storageKey)
    ) {
      throw new ActivityOperationIdentityError(
        'invalid_input',
        'Activity operation identity storage key is invalid.',
      );
    }

    this.createDeviceId = options.createDeviceId;
    this.ensureInstallation = options.ensureInstallation ?? (async () => undefined);
    this.storage = options.storage;
    this.storageKey = storageKey;
  }

  async reserve(): Promise<ActivityOperationIdentity> {
    return this.runExclusive(async () => {
      try {
        await this.ensureInstallation();
      } catch (error) {
        throw new ActivityOperationIdentityError(
          'storage_failure',
          'The activity operation installation could not be prepared.',
          error,
        );
      }

      const current = await this.readPersistedIdentity();
      if (current === null) {
        const deviceId = this.createValidatedDeviceId();
        await this.writePersistedIdentity({
          deviceId,
          nextDeviceSequence: 2,
          version: persistedStateVersion,
        });
        return { deviceId, deviceSequence: 1 };
      }

      if (current.nextDeviceSequence >= Number.MAX_SAFE_INTEGER) {
        throw new ActivityOperationIdentityError(
          'sequence_exhausted',
          'Activity operation device sequence is exhausted.',
        );
      }

      const deviceSequence = current.nextDeviceSequence;
      await this.writePersistedIdentity({
        deviceId: current.deviceId,
        nextDeviceSequence: deviceSequence + 1,
        version: persistedStateVersion,
      });
      return { deviceId: current.deviceId, deviceSequence };
    });
  }

  private createValidatedDeviceId(): string {
    let deviceId: string;
    try {
      deviceId = this.createDeviceId();
    } catch (error) {
      throw new ActivityOperationIdentityError(
        'device_id_failure',
        'A stable activity operation device identity could not be created.',
        error,
      );
    }

    if (!isValidDeviceId(deviceId)) {
      throw new ActivityOperationIdentityError(
        'device_id_failure',
        'The activity operation device identity is invalid.',
      );
    }

    return deviceId;
  }

  private async readPersistedIdentity(): Promise<PersistedActivityOperationIdentity | null> {
    let rawValue: string | null;
    try {
      rawValue = await this.storage.getItem(this.storageKey);
    } catch (error) {
      throw new ActivityOperationIdentityError(
        'storage_failure',
        'The activity operation identity could not be read.',
        error,
      );
    }

    if (rawValue === null) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawValue);
    } catch (error) {
      throw new ActivityOperationIdentityError(
        'corrupt_state',
        'The stored activity operation identity is invalid.',
        error,
      );
    }

    if (!isPersistedIdentity(parsed)) {
      throw new ActivityOperationIdentityError(
        'corrupt_state',
        'The stored activity operation identity is invalid.',
      );
    }

    return parsed;
  }

  private async writePersistedIdentity(state: PersistedActivityOperationIdentity): Promise<void> {
    try {
      await this.storage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      throw new ActivityOperationIdentityError(
        'storage_failure',
        'The activity operation identity could not be persisted.',
        error,
      );
    }
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = sharedIdentityLocks.get(this.storageKey) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    sharedIdentityLocks.set(this.storageKey, tail);

    return result.finally(() => {
      if (sharedIdentityLocks.get(this.storageKey) === tail) {
        sharedIdentityLocks.delete(this.storageKey);
      }
    });
  }
}
