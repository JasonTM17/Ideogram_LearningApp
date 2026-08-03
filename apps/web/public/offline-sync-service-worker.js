const DATABASE_NAME = 'ideogram-learning-offline-sync-v1';
const STORE_NAME = 'snapshots';
const SYNC_TAG = 'ideogram-learning-offline-sync-v1';
const MEDIA_CACHE_NAME_PREFIX = 'ideogram-learning-offline-media-v1';
const MEDIA_INDEX_URL = 'https://offline-media.index.local/v1';
const MEDIA_CACHE_MAX_BYTES = 50 * 1024 * 1024;

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onerror = () => reject(request.error || new Error('IndexedDB is unavailable.'));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

const withStore = async (mode, action) => {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      let result;
      transaction.onerror = () =>
        reject(transaction.error || new Error('IndexedDB operation failed.'));
      transaction.oncomplete = () => resolve(result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
      request.onsuccess = () => {
        result = request.result;
      };
    });
  } finally {
    database.close();
  }
};

const readSnapshot = async (userId) => {
  const record = await withStore('readonly', (store) => store.get(`user:${userId}`));
  if (!record || typeof record.value !== 'string') return null;
  try {
    const snapshot = JSON.parse(record.value);
    if (!Array.isArray(snapshot.mutations) || snapshot.namespace?.userId !== userId) return null;
    return snapshot;
  } catch {
    return null;
  }
};

const writeSnapshot = async (userId, snapshot) =>
  withStore('readwrite', (store) =>
    store.put({ key: `user:${userId}`, value: JSON.stringify(snapshot) }),
  );

const readCurrentIdentity = async () => {
  const response = await fetch('/api/v1/auth/session', {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const value = await response.json();
  return typeof value?.userId === 'string' &&
    Number.isSafeInteger(value?.sessionEpoch) &&
    value.sessionEpoch > 0
    ? { sessionEpoch: value.sessionEpoch, userId: value.userId.toLowerCase() }
    : null;
};

const sendMutation = async (mutation) => {
  let body = mutation.payload;
  let path = '/api/v1/learning/activities/submit';
  if (mutation.kind === 'review') path = '/api/v1/learning/reviews/submit';
  if (mutation.kind === 'placement-answer') {
    const sessionId = mutation.payload?.placementSessionId;
    const input = mutation.payload?.input;
    if (typeof sessionId !== 'string' || !input || typeof input !== 'object') return 'blocked';
    path = `/api/v1/learning/placement/sessions/${sessionId}/answers`;
    body = input;
  }
  if (mutation.kind === 'placement-submit') {
    const sessionId = mutation.payload?.placementSessionId;
    if (typeof sessionId !== 'string') return 'blocked';
    path = `/api/v1/learning/placement/sessions/${sessionId}/submit`;
    body = {};
  }
  try {
    const response = await fetch(path, {
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      method: 'POST',
      redirect: 'error',
    });
    if (response.ok) return 'completed';
    return [400, 401, 403, 404, 409].includes(response.status) ? 'blocked' : 'retry';
  } catch {
    return 'retry';
  }
};

const drainForIdentity = async (identity) => {
  const userId = identity.userId;
  const snapshot = await readSnapshot(userId);
  if (!snapshot) return;
  if (snapshot.namespace?.sessionEpoch !== identity.sessionEpoch) return;
  const remaining = [];
  for (const mutation of snapshot.mutations) {
    if (mutation.status === 'blocked') {
      remaining.push(
        mutation,
        ...snapshot.mutations.slice(snapshot.mutations.indexOf(mutation) + 1),
      );
      break;
    }
    const result = await sendMutation(mutation);
    if (result === 'completed') continue;
    if (result === 'blocked' || mutation.retryCount >= 20) {
      remaining.push(
        { ...mutation, status: 'blocked' },
        ...snapshot.mutations.slice(snapshot.mutations.indexOf(mutation) + 1),
      );
      break;
    }
    remaining.push(
      { ...mutation, retryCount: mutation.retryCount + 1 },
      ...snapshot.mutations.slice(snapshot.mutations.indexOf(mutation) + 1),
    );
    await writeSnapshot(userId, { ...snapshot, mutations: remaining });
    throw new Error('Sync requires a later retry.');
  }
  await writeSnapshot(userId, { ...snapshot, mutations: remaining });
};

const drain = async () => {
  const identity = await readCurrentIdentity();
  if (!identity) return;
  if (!self.navigator?.locks) throw new Error('Browser queue lock is unavailable.');
  return self.navigator.locks.request(
    `ideogram-learning-offline-sync:${identity.userId}`,
    { mode: 'exclusive' },
    () => drainForIdentity(identity),
  );
};

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(drain());
});

const hexDigest = (buffer) =>
  Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, '0')).join('');

const validMediaAsset = (asset) =>
  asset &&
  typeof asset.assetId === 'string' &&
  typeof asset.contentReleaseId === 'string' &&
  typeof asset.url === 'string' &&
  (() => {
    try {
      const url = new URL(asset.url);
      return (
        url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
      );
    } catch {
      return false;
    }
  })() &&
  typeof asset.sizeBytes === 'number' &&
  asset.sizeBytes > 0 &&
  asset.sizeBytes <= MEDIA_CACHE_MAX_BYTES &&
  typeof asset.sha256 === 'string' &&
  /^[a-f0-9]{64}$/u.test(asset.sha256);

const validMediaNamespace = (namespace) =>
  namespace &&
  typeof namespace.contentReleaseId === 'string' &&
  /^[a-z0-9][a-z0-9-]{2,119}$/u.test(namespace.contentReleaseId) &&
  typeof namespace.userId === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    namespace.userId,
  );

const mediaCacheName = (namespace) =>
  `${MEDIA_CACHE_NAME_PREFIX}:${namespace.userId.toLowerCase()}`;

const readMediaIndex = async (cache) => {
  const response = await cache.match(MEDIA_INDEX_URL);
  if (!response) return { assets: [] };
  try {
    const parsed = await response.json();
    return Array.isArray(parsed?.assets)
      ? {
          assets: parsed.assets.filter(
            (asset) =>
              typeof asset?.assetId === 'string' &&
              typeof asset?.contentReleaseId === 'string' &&
              typeof asset?.cacheKey === 'string' &&
              typeof asset?.sha256 === 'string' &&
              typeof asset?.sizeBytes === 'number',
          ),
        }
      : { assets: [] };
  } catch {
    return { assets: [] };
  }
};

const writeMediaIndex = (cache, index) =>
  cache.put(
    MEDIA_INDEX_URL,
    new Response(JSON.stringify(index), {
      headers: { 'cache-control': 'no-store', 'content-type': 'application/json' },
    }),
  );

const mediaAssetCacheKey = (asset) =>
  `https://offline-media.asset.local/v1/${encodeURIComponent(asset.contentReleaseId)}/${encodeURIComponent(asset.assetId)}/${asset.sha256}`;

const cacheMediaAssetUnsafe = async (asset, namespace) => {
  if (!validMediaAsset(asset) || !validMediaNamespace(namespace)) {
    throw new TypeError('Invalid offline media asset.');
  }
  if (asset.contentReleaseId !== namespace.contentReleaseId) {
    throw new TypeError('Offline media asset belongs to a different content release.');
  }
  const response = await fetch(asset.url, { cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw new TypeError(`Offline media download failed with ${response.status}.`);
  const bytes = await response.clone().arrayBuffer();
  if (bytes.byteLength !== asset.sizeBytes)
    throw new TypeError('Offline media size did not match.');
  if (hexDigest(await crypto.subtle.digest('SHA-256', bytes)) !== asset.sha256) {
    throw new TypeError('Offline media checksum did not match.');
  }

  const cache = await caches.open(mediaCacheName(namespace));
  const index = await readMediaIndex(cache);
  const replaced = index.assets.filter(
    (item) => item.assetId === asset.assetId && item.contentReleaseId === asset.contentReleaseId,
  );
  const retained = index.assets
    .filter(
      (item) =>
        !(item.assetId === asset.assetId && item.contentReleaseId === asset.contentReleaseId),
    )
    .sort((left, right) => left.cachedAt - right.cachedAt);
  const evicted = [];
  let totalBytes = retained.reduce((total, item) => total + item.sizeBytes, 0);
  while (retained.length > 0 && totalBytes + asset.sizeBytes > MEDIA_CACHE_MAX_BYTES) {
    const record = retained.shift();
    totalBytes -= record.sizeBytes;
    evicted.push(record);
  }
  if (totalBytes + asset.sizeBytes > MEDIA_CACHE_MAX_BYTES) {
    throw new RangeError('Offline media asset exceeds the allowed cache quota.');
  }

  const cacheKey = mediaAssetCacheKey(asset);
  await cache.put(cacheKey, response);
  try {
    retained.push({
      assetId: asset.assetId,
      cacheKey,
      cachedAt: Date.now(),
      contentReleaseId: asset.contentReleaseId,
      sha256: asset.sha256,
      sizeBytes: asset.sizeBytes,
    });
    await writeMediaIndex(cache, { assets: retained });
  } catch (error) {
    if (!replaced.some((record) => record.cacheKey === cacheKey)) await cache.delete(cacheKey);
    throw error;
  }
  await Promise.all(
    [...replaced, ...evicted]
      .filter((record) => record.cacheKey !== cacheKey)
      .map((record) => cache.delete(record.cacheKey)),
  );
};

const cacheMediaAsset = async (asset, namespace) => {
  if (!self.navigator?.locks) throw new Error('Browser queue lock is unavailable.');
  return self.navigator.locks.request(
    `ideogram-learning-offline-media:${namespace.userId.toLowerCase()}`,
    { mode: 'exclusive' },
    () => cacheMediaAssetUnsafe(asset, namespace),
  );
};

self.addEventListener('message', (event) => {
  if (event.data?.type === 'cache-offline-media')
    event.waitUntil(cacheMediaAsset(event.data.asset, event.data.namespace));
  if (event.data?.type === 'clear-offline-media')
    event.waitUntil(
      caches
        .keys()
        .then((names) =>
          Promise.all(
            names
              .filter((name) => name.startsWith(`${MEDIA_CACHE_NAME_PREFIX}:`))
              .map((name) => caches.delete(name)),
          ),
        ),
    );
});
