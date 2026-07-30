import { getUtf8ByteLength, splitIntoUtf8Chunks } from './secure-session-chunks';
import {
  parseStorageManifest,
  sha256DigestPattern,
  type StorageManifest,
} from './secure-session-manifest';
import { SecureSessionStorageError, type Sha256Port } from './secure-session-storage-types';

export interface SecureSessionCodecOptions {
  chunkByteLimit?: number;
  maximumChunks?: number;
  namespace?: string;
}

const defaultChunkByteLimit = 1_536;
const defaultMaximumChunks = 64;
const defaultNamespace = 'ideogram.session.v1';

export class SecureSessionCodec {
  readonly maximumChunks: number;
  private readonly chunkByteLimit: number;
  private readonly namespace: string;

  constructor(
    private readonly sha256Port: Sha256Port,
    options: SecureSessionCodecOptions = {},
  ) {
    this.chunkByteLimit = options.chunkByteLimit ?? defaultChunkByteLimit;
    this.maximumChunks = options.maximumChunks ?? defaultMaximumChunks;
    this.namespace = options.namespace ?? defaultNamespace;

    if (
      !Number.isInteger(this.chunkByteLimit) ||
      this.chunkByteLimit < 64 ||
      !Number.isInteger(this.maximumChunks) ||
      this.maximumChunks < 1 ||
      !/^[a-zA-Z0-9._-]+$/.test(this.namespace)
    ) {
      throw new SecureSessionStorageError(
        'invalid_input',
        'Secure session storage options are invalid.',
      );
    }
  }

  async createBaseKey(key: string): Promise<string> {
    if (typeof key !== 'string' || key.trim().length === 0 || key.length > 1_024) {
      throw new SecureSessionStorageError('invalid_input', 'Secure session key is invalid.');
    }

    return `${this.namespace}.${await this.hash(key)}`;
  }

  createChunks(value: string) {
    try {
      return splitIntoUtf8Chunks(value, this.chunkByteLimit, this.maximumChunks);
    } catch (error) {
      throw new SecureSessionStorageError(
        'invalid_input',
        'Secure session value exceeds the storage limit.',
        error,
      );
    }
  }

  getByteLength(value: string): number {
    return getUtf8ByteLength(value);
  }

  async hash(value: string): Promise<string> {
    let digest: string;
    try {
      digest = await this.sha256Port.sha256(value);
    } catch (error) {
      throw new SecureSessionStorageError(
        'storage_failure',
        'Secure session integrity operation failed.',
        error,
      );
    }

    if (!sha256DigestPattern.test(digest)) {
      throw new SecureSessionStorageError(
        'storage_failure',
        'Secure session integrity service returned an invalid digest.',
      );
    }

    return digest.toLowerCase();
  }

  parseManifest(value: string): StorageManifest | null {
    return parseStorageManifest(
      value,
      this.maximumChunks,
      this.chunkByteLimit * this.maximumChunks,
    );
  }
}
