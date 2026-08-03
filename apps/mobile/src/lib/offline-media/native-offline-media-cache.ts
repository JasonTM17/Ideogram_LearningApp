import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import { matchesExpectedSha256, toHexChecksum } from './offline-media-checksum';
import { withNativeOfflineMediaLock } from './native-offline-media-lock';

import {
  offlineMediaCacheNamespaceSchema,
  type OfflineMediaAsset,
  type OfflineMediaCacheNamespace,
} from '@ideogram/contracts';

const cacheDirectoryName = 'ideogram-learning-offline-media-v1';
const maxCacheBytes = 50 * 1024 * 1024;

export const verifyNativeOfflineMediaChecksum = async (
  bytes: Uint8Array,
  expectedSha256: string,
): Promise<boolean> =>
  matchesExpectedSha256(
    toHexChecksum(await digest(CryptoDigestAlgorithm.SHA256, bytes as unknown as BufferSource)),
    expectedSha256,
  );

const getCacheDirectory = (namespace?: OfflineMediaCacheNamespace): Directory =>
  namespace
    ? new Directory(Paths.cache, cacheDirectoryName, namespace.userId, namespace.contentReleaseId)
    : new Directory(Paths.cache, cacheDirectoryName);

const getUserCacheDirectory = (namespace: OfflineMediaCacheNamespace): Directory =>
  new Directory(Paths.cache, cacheDirectoryName, namespace.userId);

const ensureCacheDirectory = (namespace: OfflineMediaCacheNamespace): Directory => {
  const directory = getCacheDirectory(namespace);
  if (!directory.exists) directory.create({ idempotent: true, intermediates: true });
  return directory;
};

const makeFileName = (asset: OfflineMediaAsset): string => `${asset.assetId}.mp3`;
const makeMetadataFileName = (asset: OfflineMediaAsset): string => `${asset.assetId}.json`;

const readDestination = (asset: OfflineMediaAsset, namespace: OfflineMediaCacheNamespace): File => {
  const validNamespace = offlineMediaCacheNamespaceSchema.parse(namespace);
  if (asset.contentReleaseId !== validNamespace.contentReleaseId) {
    throw new TypeError('Offline media asset belongs to a different content release.');
  }
  const directory = ensureCacheDirectory(validNamespace);
  const destination = new File(directory, makeFileName(asset));
  const metadata = new File(directory, makeMetadataFileName(asset));
  const backup = new File(directory, `${asset.assetId}.backup`);
  if (!destination.exists && backup.exists) backup.move(destination);
  if (!destination.exists || !metadata.exists) return destination;
  try {
    const record = JSON.parse(metadata.textSync()) as Record<string, unknown>;
    if (
      record.sha256 !== asset.sha256 ||
      record.sizeBytes !== asset.sizeBytes ||
      record.url !== asset.url
    ) {
      destination.delete();
      metadata.delete();
    }
  } catch {
    destination.delete();
    metadata.delete();
  }
  return destination;
};

export const clearNativeOfflineMediaCache = (): void => {
  const directory = getCacheDirectory();
  if (directory.exists) directory.delete();
};

export const readNativeOfflineMediaAssetUri = async (
  asset: OfflineMediaAsset,
  namespace: OfflineMediaCacheNamespace,
): Promise<string | null> => {
  const destination = readDestination(asset, namespace);
  if (!destination.exists || destination.size !== asset.sizeBytes) {
    if (destination.exists) destination.delete();
    return null;
  }
  if (!(await verifyNativeOfflineMediaChecksum(await destination.bytes(), asset.sha256))) {
    destination.delete();
    return null;
  }
  return destination.uri;
};

export const removeNativeOfflineMediaAsset = (
  asset: OfflineMediaAsset,
  namespace: OfflineMediaCacheNamespace,
): boolean => {
  const destination = readDestination(asset, namespace);
  if (!destination.exists) return false;
  destination.delete();
  const metadata = new File(destination.parentDirectory, makeMetadataFileName(asset));
  if (metadata.exists) metadata.delete();
  return true;
};

const cacheNativeOfflineMediaAssetUnsafe = async (
  asset: OfflineMediaAsset,
  namespace: OfflineMediaCacheNamespace,
  options: {
    onProgress?: (writtenBytes: number, totalBytes: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<string> => {
  const validNamespace = offlineMediaCacheNamespaceSchema.parse(namespace);
  if (asset.contentReleaseId !== validNamespace.contentReleaseId) {
    throw new TypeError('Offline media asset belongs to a different content release.');
  }
  if (asset.sizeBytes > maxCacheBytes) {
    throw new RangeError('Offline media asset exceeds the allowed cache quota.');
  }

  const directory = ensureCacheDirectory(validNamespace);
  const destination = new File(directory, makeFileName(asset));
  const metadata = new File(directory, makeMetadataFileName(asset));
  const temporary = new File(directory, `${asset.assetId}.partial`);
  const backup = new File(directory, `${asset.assetId}.backup`);
  const existingSize = destination.exists ? (destination.size ?? 0) : 0;
  const userDirectory = getUserCacheDirectory(validNamespace);
  if (!userDirectory.exists) userDirectory.create({ idempotent: true, intermediates: true });
  if ((userDirectory.size ?? 0) - existingSize + asset.sizeBytes > maxCacheBytes) {
    throw new RangeError('Offline media cache is full. Remove a download and try again.');
  }
  if (temporary.exists) temporary.delete();
  if (backup.exists) backup.delete();

  const task = File.createDownloadTask(asset.url, temporary, {
    onProgress: ({ bytesWritten, totalBytes }) => options.onProgress?.(bytesWritten, totalBytes),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  try {
    const downloaded = await task.downloadAsync();
    if (!downloaded) throw new Error('Offline media download was paused before completion.');
    if (downloaded.size !== asset.sizeBytes)
      throw new TypeError('Offline media size did not match.');

    const validChecksum = await verifyNativeOfflineMediaChecksum(
      await downloaded.bytes(),
      asset.sha256,
    );
    if (!validChecksum) throw new TypeError('Offline media checksum did not match.');

    if (destination.exists) await destination.move(backup);
    try {
      await downloaded.move(destination);
    } catch (error) {
      if (backup.exists && !destination.exists) await backup.move(destination);
      throw error;
    }
    if (backup.exists) backup.delete();
    if (metadata.exists) metadata.delete();
    metadata.create({ overwrite: true, intermediates: true });
    metadata.write(
      JSON.stringify({
        contentReleaseId: asset.contentReleaseId,
        sha256: asset.sha256,
        sizeBytes: asset.sizeBytes,
        url: asset.url,
      }),
    );
    return destination.uri;
  } catch (error) {
    if (temporary.exists) temporary.delete();
    if (metadata.exists && !destination.exists) metadata.delete();
    if (backup.exists && !destination.exists) await backup.move(destination);
    throw error;
  } finally {
    task.release();
  }
};

export const cacheNativeOfflineMediaAsset = (
  asset: OfflineMediaAsset,
  namespace: OfflineMediaCacheNamespace,
  options: {
    onProgress?: (writtenBytes: number, totalBytes: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<string> =>
  withNativeOfflineMediaLock(namespace.userId, () =>
    cacheNativeOfflineMediaAssetUnsafe(asset, namespace, options),
  );
