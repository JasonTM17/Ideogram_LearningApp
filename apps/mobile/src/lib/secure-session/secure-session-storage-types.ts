export interface AsyncKeyValueStorage {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
}

export interface SecureStorePort {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
}

export interface Sha256Port {
  sha256: (value: string) => Promise<string>;
}

export type SecureSessionStorageErrorCode = 'invalid_input' | 'storage_failure' | 'unavailable';

export class SecureSessionStorageError extends Error {
  readonly code: SecureSessionStorageErrorCode;

  constructor(code: SecureSessionStorageErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'SecureSessionStorageError';
    this.code = code;
  }
}
