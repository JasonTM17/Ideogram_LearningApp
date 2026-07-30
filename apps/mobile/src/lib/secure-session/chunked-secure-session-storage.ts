import { SecureSessionCodec, type SecureSessionCodecOptions } from './secure-session-codec';
import { createDeletingManifest, type StorageManifest } from './secure-session-manifest';
import { SecureSessionRecordStore } from './secure-session-record-store';
import {
  SecureSessionStorageError,
  type AsyncKeyValueStorage,
  type SecureStorePort,
  type Sha256Port,
} from './secure-session-storage-types';

export type ChunkedSecureSessionStorageOptions = SecureSessionCodecOptions;

export class ChunkedSecureSessionStorage implements AsyncKeyValueStorage {
  private readonly codec: SecureSessionCodec;
  private readonly locks = new Map<string, Promise<void>>();
  private readonly records: SecureSessionRecordStore;

  constructor(
    private readonly secureStore: SecureStorePort,
    private readonly sha256Port: Sha256Port,
    options: ChunkedSecureSessionStorageOptions = {},
  ) {
    this.codec = new SecureSessionCodec(sha256Port, options);
    this.records = new SecureSessionRecordStore(secureStore);
  }

  getItem(key: string): Promise<string | null> {
    return this.runExclusive(key, async () => {
      const baseKey = await this.codec.createBaseKey(key);
      const manifestKey = this.records.createManifestKey(baseKey);
      const serializedManifest = await this.records.read(manifestKey);

      if (serializedManifest === null) {
        return null;
      }

      const manifest = this.codec.parseManifest(serializedManifest);
      if (!manifest || manifest.status !== 'ready') {
        await this.recoverInvalidState(baseKey, manifest);
        return null;
      }

      const chunks = await this.records.readChunks(baseKey, manifest.chunkCount);
      if (chunks.some((chunk) => chunk === null)) {
        await this.invalidateAndPurge(baseKey, manifest);
        return null;
      }

      const value = chunks.join('');
      const digest = await this.codec.hash(value);
      if (this.codec.getByteLength(value) !== manifest.byteLength || digest !== manifest.digest) {
        await this.invalidateAndPurge(baseKey, manifest);
        return null;
      }

      return value;
    });
  }

  removeItem(key: string): Promise<void> {
    return this.runExclusive(key, async () => {
      const baseKey = await this.codec.createBaseKey(key);
      const serializedManifest = await this.records.read(this.records.createManifestKey(baseKey));
      if (serializedManifest === null) {
        return;
      }

      const manifest = this.codec.parseManifest(serializedManifest);
      await this.invalidateAndPurge(baseKey, manifest);
    });
  }

  setItem(key: string, value: string): Promise<void> {
    return this.runExclusive(key, async () => {
      if (typeof value !== 'string') {
        throw new SecureSessionStorageError(
          'invalid_input',
          'Secure session values must be strings.',
        );
      }

      const baseKey = await this.codec.createBaseKey(key);
      const { byteLength, chunks } = this.codec.createChunks(value);
      const digest = await this.codec.hash(value);
      const manifestKey = this.records.createManifestKey(baseKey);
      const previousManifestValue = await this.records.read(manifestKey);
      const previousManifest = previousManifestValue
        ? this.codec.parseManifest(previousManifestValue)
        : null;
      const cleanupCount = Math.max(
        chunks.length,
        previousManifest?.cleanupCount ?? (previousManifestValue ? this.codec.maximumChunks : 0),
      );
      const writingManifest: StorageManifest = {
        byteLength,
        chunkCount: chunks.length,
        cleanupCount,
        digest,
        status: 'writing',
        version: 1,
      };

      try {
        await this.writeManifest(manifestKey, writingManifest);
        await this.records.removeChunks(baseKey, cleanupCount);
        await this.records.writeChunks(baseKey, chunks);
        await this.writeManifest(manifestKey, {
          ...writingManifest,
          cleanupCount: chunks.length,
          status: 'ready',
        });
      } catch (error) {
        await this.purgeBestEffort(baseKey, cleanupCount);
        throw this.toStorageError(error);
      }
    });
  }

  private async invalidateAndPurge(
    baseKey: string,
    manifest: StorageManifest | null,
  ): Promise<void> {
    const cleanupCount = manifest?.cleanupCount ?? this.codec.maximumChunks;
    const recoveryManifest = createDeletingManifest(cleanupCount);

    await this.writeManifest(this.records.createManifestKey(baseKey), recoveryManifest);
    await this.purge(baseKey, cleanupCount);
  }

  private async purge(baseKey: string, chunkCount: number): Promise<void> {
    await this.records.purge(baseKey, chunkCount);
  }

  private async purgeBestEffort(baseKey: string, chunkCount: number): Promise<void> {
    try {
      await this.purge(baseKey, chunkCount);
    } catch {
      // Keep the original write failure. A retained non-ready manifest makes
      // the next read fail closed and retry cleanup.
    }
  }

  private async recoverInvalidState(
    baseKey: string,
    manifest: StorageManifest | null,
  ): Promise<void> {
    await this.invalidateAndPurge(baseKey, manifest);
  }

  private runExclusive<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.locks.set(key, tail);

    return result.finally(() => {
      if (this.locks.get(key) === tail) {
        this.locks.delete(key);
      }
    });
  }

  private toStorageError(error: unknown): SecureSessionStorageError {
    return error instanceof SecureSessionStorageError
      ? error
      : new SecureSessionStorageError(
          'storage_failure',
          'Secure session storage operation failed.',
          error,
        );
  }

  private writeManifest(key: string, manifest: StorageManifest): Promise<void> {
    return this.records.write(key, JSON.stringify(manifest));
  }
}
