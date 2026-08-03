import {
  offlineMediaCacheNamespaceSchema,
  type OfflineMediaAsset,
  type OfflineMediaCacheNamespace,
} from '@ideogram/contracts';

import { withBrowserExclusiveLock } from '@/lib/browser-exclusive-lock';

const cacheNamePrefix = 'ideogram-learning-offline-media-v1';
const indexRequest = new Request('https://offline-media.index.local/v1');
const maxBytes = 50 * 1024 * 1024;

interface CachedMediaRecord {
  assetId: string;
  contentReleaseId: string;
  cacheKey: string;
  cachedAt: number;
  sha256: string;
  sizeBytes: number;
}

interface CachedMediaIndex {
  assets: CachedMediaRecord[];
}

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, '0')).join('');

const verifyResponse = async (
  response: Response,
  expectedSize: number,
  expectedSha256: string,
): Promise<void> => {
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== expectedSize) throw new TypeError('Offline media size did not match.');

  const digest = await crypto.subtle.digest('SHA-256', bytes);
  if (toHex(digest) !== expectedSha256)
    throw new TypeError('Offline media checksum did not match.');
};

const readIndex = async (cache: Cache): Promise<CachedMediaIndex> => {
  const response = await cache.match(indexRequest);
  if (!response) return { assets: [] };

  const parsed: unknown = await response.json();
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as CachedMediaIndex).assets)
  ) {
    return { assets: [] };
  }

  return {
    assets: (parsed as CachedMediaIndex).assets.filter(
      (asset): asset is CachedMediaRecord =>
        typeof asset.assetId === 'string' &&
        typeof asset.contentReleaseId === 'string' &&
        typeof asset.cacheKey === 'string' &&
        typeof asset.cachedAt === 'number' &&
        typeof asset.sha256 === 'string' &&
        typeof asset.sizeBytes === 'number',
    ),
  };
};

const writeIndex = (cache: Cache, index: CachedMediaIndex): Promise<void> =>
  cache.put(
    indexRequest,
    new Response(JSON.stringify(index), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    }),
  );

const planEviction = (
  index: CachedMediaIndex,
  incomingSizeBytes: number,
): { evicted: CachedMediaRecord[]; retained: CachedMediaRecord[] } => {
  const retained = [...index.assets].sort((left, right) => left.cachedAt - right.cachedAt);
  const evicted: CachedMediaRecord[] = [];
  let totalBytes = retained.reduce((total, item) => total + item.sizeBytes, 0);

  while (retained.length > 0 && totalBytes + incomingSizeBytes > maxBytes) {
    const record = retained.shift();
    if (!record) break;
    totalBytes -= record.sizeBytes;
    evicted.push(record);
  }

  if (totalBytes + incomingSizeBytes > maxBytes) {
    throw new RangeError('Offline media asset exceeds the allowed cache quota.');
  }

  return { evicted, retained };
};

const createAssetCacheKey = (asset: OfflineMediaAsset): string =>
  `https://offline-media.asset.local/v1/${encodeURIComponent(asset.contentReleaseId)}/${encodeURIComponent(asset.assetId)}/${asset.sha256}`;

export const cacheOfflineMediaAsset = async (
  asset: OfflineMediaAsset,
  namespace: OfflineMediaCacheNamespace,
  options: { signal?: AbortSignal } = {},
): Promise<void> => {
  if (!('caches' in globalThis) || !globalThis.crypto?.subtle) {
    throw new TypeError('Offline media cache is unavailable in this browser.');
  }

  const validNamespace = offlineMediaCacheNamespaceSchema.parse(namespace);
  if (asset.contentReleaseId !== validNamespace.contentReleaseId) {
    throw new TypeError('Offline media asset belongs to a different content release.');
  }

  const response = await fetch(asset.url, {
    cache: 'no-store',
    credentials: 'omit',
    ...(options.signal ? { signal: options.signal } : {}),
  });
  if (!response.ok) throw new TypeError(`Offline media download failed with ${response.status}.`);
  await verifyResponse(response.clone(), asset.sizeBytes, asset.sha256);

  await withBrowserExclusiveLock(
    `ideogram-learning-offline-media:${validNamespace.userId}`,
    async () => {
      const cache = await caches.open(offlineMediaCacheName(validNamespace));
      const index = await readIndex(cache);
      const replaced = index.assets.filter(
        (item) =>
          item.assetId === asset.assetId && item.contentReleaseId === asset.contentReleaseId,
      );
      const previous = index.assets.filter(
        (item) =>
          !(item.assetId === asset.assetId && item.contentReleaseId === asset.contentReleaseId),
      );
      const eviction = planEviction({ assets: previous }, asset.sizeBytes);
      const cacheKey = createAssetCacheKey(asset);
      await cache.put(cacheKey, response);
      try {
        await writeIndex(cache, {
          assets: [
            ...eviction.retained,
            {
              assetId: asset.assetId,
              cacheKey,
              cachedAt: Date.now(),
              contentReleaseId: asset.contentReleaseId,
              sha256: asset.sha256,
              sizeBytes: asset.sizeBytes,
            },
          ],
        });
      } catch (error) {
        if (!replaced.some((record) => record.cacheKey === cacheKey)) await cache.delete(cacheKey);
        throw error;
      }
      await Promise.all(
        [...replaced, ...eviction.evicted]
          .filter((record) => record.cacheKey !== cacheKey)
          .map((record) => cache.delete(record.cacheKey)),
      );
    },
  );
};

export const listOfflineMediaAssets = async (
  namespace: OfflineMediaCacheNamespace,
): Promise<readonly CachedMediaRecord[]> => {
  if (!('caches' in globalThis)) return [];
  const validNamespace = offlineMediaCacheNamespaceSchema.parse(namespace);
  const cache = await caches.open(offlineMediaCacheName(validNamespace));
  return (await readIndex(cache)).assets.filter(
    (record) => record.contentReleaseId === validNamespace.contentReleaseId,
  );
};

export const readOfflineMediaAsset = async (
  asset: OfflineMediaAsset,
  namespace: OfflineMediaCacheNamespace,
  options: { verifyIntegrity?: boolean } = {},
): Promise<Response | null> => {
  const validNamespace = offlineMediaCacheNamespaceSchema.parse(namespace);
  if (asset.contentReleaseId !== validNamespace.contentReleaseId) return null;
  const cache = await caches.open(offlineMediaCacheName(validNamespace));
  const index = await readIndex(cache);
  const record = index.assets.find(
    (item) =>
      item.assetId === asset.assetId &&
      item.contentReleaseId === asset.contentReleaseId &&
      item.sha256 === asset.sha256 &&
      item.sizeBytes === asset.sizeBytes,
  );
  if (!record) return null;
  const response = await cache.match(record.cacheKey);
  if (!response) return null;
  if (!options.verifyIntegrity) return response;
  try {
    await verifyResponse(response.clone(), record.sizeBytes, record.sha256);
    return response;
  } catch {
    await writeIndex(cache, {
      assets: index.assets.filter((item) => item.cacheKey !== record.cacheKey),
    });
    await cache.delete(record.cacheKey);
    return null;
  }
};

export const removeOfflineMediaAsset = async (
  assetId: string,
  namespace: OfflineMediaCacheNamespace,
): Promise<boolean> => {
  const validNamespace = offlineMediaCacheNamespaceSchema.parse(namespace);
  return withBrowserExclusiveLock(
    `ideogram-learning-offline-media:${validNamespace.userId}`,
    async () => {
      const cache = await caches.open(offlineMediaCacheName(validNamespace));
      const index = await readIndex(cache);
      const removed = index.assets.filter(
        (item) =>
          item.assetId === assetId && item.contentReleaseId === validNamespace.contentReleaseId,
      );
      if (removed.length === 0) return false;
      await writeIndex(cache, {
        assets: index.assets.filter((item) => !removed.includes(item)),
      });
      await Promise.all(removed.map((record) => cache.delete(record.cacheKey)));
      return true;
    },
  );
};

export const clearOfflineMediaCache = async (): Promise<boolean> => {
  if (!('caches' in globalThis)) return false;
  const names = await caches.keys();
  const matchingNames = names.filter((name) => name.startsWith(`${cacheNamePrefix}:`));
  await Promise.all(matchingNames.map((name) => caches.delete(name)));
  return true;
};

export const offlineMediaCacheName = (namespace: OfflineMediaCacheNamespace): string => {
  const validNamespace = offlineMediaCacheNamespaceSchema.parse(namespace);
  return `${cacheNamePrefix}:${validNamespace.userId}`;
};
