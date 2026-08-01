export const activityOperationIdentityStorageKey =
  'ideogram-learning.activity-operation-identity.v1';

export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

export type ActivityOperationIdentityErrorCode =
  | 'corrupt_state'
  | 'device_id_failure'
  | 'invalid_input'
  | 'sequence_exhausted'
  | 'storage_failure';

export class ActivityOperationIdentityError extends Error {
  readonly code: ActivityOperationIdentityErrorCode;

  constructor(code: ActivityOperationIdentityErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ActivityOperationIdentityError';
    this.code = code;
  }
}

export interface ActivityOperationIdentity {
  readonly deviceId: string;
  readonly deviceSequence: number;
}

export interface ActivityOperationIdentityStoreOptions {
  readonly createDeviceId: () => string;
  readonly storage: AsyncKeyValueStorage;
  readonly ensureInstallation?: () => Promise<void>;
  readonly storageKey?: string;
}
