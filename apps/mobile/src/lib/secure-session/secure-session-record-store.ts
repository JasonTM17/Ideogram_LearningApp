import { SecureSessionStorageError, type SecureStorePort } from './secure-session-storage-types';

const toStorageError = (error: unknown): SecureSessionStorageError =>
  error instanceof SecureSessionStorageError
    ? error
    : new SecureSessionStorageError(
        'storage_failure',
        'Secure session storage operation failed.',
        error,
      );

const throwFirstFailure = (results: readonly PromiseSettledResult<unknown>[]): void => {
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );

  if (failure) {
    throw toStorageError(failure.reason);
  }
};

export class SecureSessionRecordStore {
  constructor(private readonly secureStore: SecureStorePort) {}

  createChunkKey(baseKey: string, index: number): string {
    return `${baseKey}.chunk.${index}`;
  }

  createManifestKey(baseKey: string): string {
    return `${baseKey}.manifest`;
  }

  async purge(baseKey: string, chunkCount: number): Promise<void> {
    await this.removeChunks(baseKey, chunkCount);
    await this.remove(this.createManifestKey(baseKey));
  }

  async read(key: string): Promise<string | null> {
    try {
      return await this.secureStore.getItem(key);
    } catch (error) {
      throw toStorageError(error);
    }
  }

  async readChunks(baseKey: string, chunkCount: number): Promise<Array<string | null>> {
    const results = await Promise.allSettled(
      Array.from({ length: chunkCount }, (_, index) =>
        this.secureStore.getItem(this.createChunkKey(baseKey, index)),
      ),
    );
    throwFirstFailure(results);

    return results.map((result) => (result.status === 'fulfilled' ? result.value : null));
  }

  async removeChunks(baseKey: string, count: number): Promise<void> {
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, index) =>
        this.secureStore.removeItem(this.createChunkKey(baseKey, index)),
      ),
    );
    throwFirstFailure(results);
  }

  async write(key: string, value: string): Promise<void> {
    try {
      await this.secureStore.setItem(key, value);
    } catch (error) {
      throw toStorageError(error);
    }
  }

  async writeChunks(baseKey: string, chunks: readonly string[]): Promise<void> {
    const results = await Promise.allSettled(
      chunks.map((chunk, index) =>
        this.secureStore.setItem(this.createChunkKey(baseKey, index), chunk),
      ),
    );
    throwFirstFailure(results);
  }

  private async remove(key: string): Promise<void> {
    try {
      await this.secureStore.removeItem(key);
    } catch (error) {
      throw toStorageError(error);
    }
  }
}
