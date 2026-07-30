export interface StorageManifest {
  byteLength: number;
  chunkCount: number;
  cleanupCount: number;
  digest: string;
  status: 'deleting' | 'ready' | 'writing';
  version: 1;
}

export const sha256DigestPattern = /^[a-fA-F0-9]{64}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const createDeletingManifest = (cleanupCount: number): StorageManifest => ({
  byteLength: 0,
  chunkCount: 1,
  cleanupCount,
  digest: '0'.repeat(64),
  status: 'deleting',
  version: 1,
});

export const parseStorageManifest = (
  value: string,
  maximumChunks: number,
  maximumBytes: number,
): StorageManifest | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) {
      return null;
    }

    const status = parsed.status;
    const chunkCount = parsed.chunkCount;
    const cleanupCount = parsed.cleanupCount;
    const byteLength = parsed.byteLength;
    const digest = parsed.digest;
    const validStatus = status === 'ready' || status === 'writing' || status === 'deleting';
    const validReadyCleanup = status !== 'ready' || cleanupCount === chunkCount;

    if (
      parsed.version !== 1 ||
      !validStatus ||
      !Number.isInteger(chunkCount) ||
      (chunkCount as number) < 1 ||
      (chunkCount as number) > maximumChunks ||
      !Number.isInteger(cleanupCount) ||
      (cleanupCount as number) < (chunkCount as number) ||
      (cleanupCount as number) > maximumChunks ||
      !validReadyCleanup ||
      !Number.isInteger(byteLength) ||
      (byteLength as number) < 0 ||
      (byteLength as number) > maximumBytes ||
      typeof digest !== 'string' ||
      !sha256DigestPattern.test(digest)
    ) {
      return null;
    }

    return parsed as unknown as StorageManifest;
  } catch {
    return null;
  }
};
