import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cacheOfflineMediaAsset,
  clearOfflineMediaCache,
  listOfflineMediaAssets,
  offlineMediaCacheName,
  readOfflineMediaAsset,
  removeOfflineMediaAsset,
} from './browser-offline-media-cache';

const asset = {
  activityId: 'ja-n5-listening-01',
  assetId: 'ja-n5-listening-01',
  contentReleaseId: 'ja-n5-v1',
  contentType: 'audio/mpeg' as const,
  lessonId: 'ja-n5-lesson-01',
  sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  sizeBytes: 3,
  titleVietnamese: 'Hội thoại chào hỏi',
  url: 'https://media.example.test/ja-n5-listening-01.mp3',
};
const namespace = {
  contentReleaseId: 'ja-n5-v1',
  userId: '12000000-0000-4000-8000-000000000001',
};

const cacheEntries = new Map<string, Response>();
const cache = {
  delete: vi.fn(async (request: RequestInfo | URL) => cacheEntries.delete(String(request))),
  match: vi.fn(async (request: RequestInfo | URL) => cacheEntries.get(String(request))?.clone()),
  put: vi.fn(async (request: RequestInfo | URL, response: Response) => {
    cacheEntries.set(String(request), response.clone());
  }),
};

describe('browser offline media cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheEntries.clear();
    vi.stubGlobal('caches', {
      delete: vi.fn(async () => true),
      keys: vi.fn(async () => [offlineMediaCacheName(namespace), 'unrelated-cache']),
      open: vi.fn(async () => cache),
    });
    vi.stubGlobal('crypto', globalThis.crypto);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('abc', { status: 200 })),
    );
  });

  it('verifies a checksum before caching a media response', async () => {
    await cacheOfflineMediaAsset(asset, namespace);

    expect(cache.put).toHaveBeenCalledWith(
      expect.stringContaining(`/${asset.assetId}/${asset.sha256}`),
      expect.any(Response),
    );
    await expect(listOfflineMediaAssets(namespace)).resolves.toMatchObject([
      { assetId: asset.assetId, sha256: asset.sha256 },
    ]);
    await expect(readOfflineMediaAsset(asset, namespace)).resolves.toBeInstanceOf(Response);
    await expect(removeOfflineMediaAsset(asset.assetId, namespace)).resolves.toBe(true);
    await expect(listOfflineMediaAssets(namespace)).resolves.toEqual([]);
  });

  it('rejects a response that fails its declared checksum', async () => {
    await expect(
      cacheOfflineMediaAsset({ ...asset, sha256: 'a'.repeat(64) }, namespace),
    ).rejects.toThrow('checksum');
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('can clear the cache on explicit account cleanup', async () => {
    await expect(clearOfflineMediaCache()).resolves.toBe(true);
    expect(caches.delete).toHaveBeenCalledWith(offlineMediaCacheName(namespace));
  });

  it('rejects a cross-release asset before it can enter the account cache', async () => {
    await expect(
      cacheOfflineMediaAsset({ ...asset, contentReleaseId: 'ja-n5-v2' }, namespace),
    ).rejects.toThrow('different content release');
  });

  it('removes a cached entry that fails integrity verification during inspection', async () => {
    await cacheOfflineMediaAsset(asset, namespace);
    const cacheKey = [...cacheEntries.keys()].find((key) => key.includes(asset.sha256));
    expect(cacheKey).toBeDefined();
    cacheEntries.set(cacheKey!, new Response('bad'));

    await expect(
      readOfflineMediaAsset(asset, namespace, { verifyIntegrity: true }),
    ).resolves.toBeNull();
    await expect(listOfflineMediaAssets(namespace)).resolves.toEqual([]);
  });

  it('does not present bytes from an older manifest checksum as current', async () => {
    await cacheOfflineMediaAsset(asset, namespace);
    await expect(
      readOfflineMediaAsset({ ...asset, sha256: 'c'.repeat(64) }, namespace),
    ).resolves.toBeNull();
  });
});
