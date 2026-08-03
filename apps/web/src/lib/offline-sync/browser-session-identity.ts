const rememberedSessionKey = 'ideogram-learning:browser-sync-session:v1';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type BrowserSessionIdentity =
  | { kind: 'authenticated'; sessionEpoch: number; userId: string }
  | { kind: 'signed-out' }
  | { kind: 'unknown' };

type AuthenticatedBrowserSessionIdentity = Extract<
  BrowserSessionIdentity,
  { kind: 'authenticated' }
>;

const parseAuthenticatedIdentity = (value: unknown): AuthenticatedBrowserSessionIdentity | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { sessionEpoch?: unknown; userId?: unknown };
  return typeof candidate.userId === 'string' &&
    uuidPattern.test(candidate.userId) &&
    Number.isSafeInteger(candidate.sessionEpoch) &&
    (candidate.sessionEpoch as number) > 0
    ? {
        kind: 'authenticated',
        sessionEpoch: candidate.sessionEpoch as number,
        userId: candidate.userId.toLowerCase(),
      }
    : null;
};

export const readBrowserSessionIdentity = async (
  request: typeof fetch = fetch,
): Promise<BrowserSessionIdentity> => {
  try {
    const response = await request('/api/v1/auth/session', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (response.status === 401) return { kind: 'signed-out' };
    if (!response.ok) return { kind: 'unknown' };
    return parseAuthenticatedIdentity(await response.json()) ?? { kind: 'unknown' };
  } catch {
    return { kind: 'unknown' };
  }
};

export const readRememberedSessionIdentity = (
  storage: Storage,
): AuthenticatedBrowserSessionIdentity | null => {
  try {
    const raw = storage.getItem(rememberedSessionKey);
    return raw ? parseAuthenticatedIdentity(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

export const rememberSessionIdentity = (
  storage: Storage,
  identity: AuthenticatedBrowserSessionIdentity,
): void => {
  try {
    storage.setItem(
      rememberedSessionKey,
      JSON.stringify({ sessionEpoch: identity.sessionEpoch, userId: identity.userId }),
    );
  } catch {
    // IndexedDB still validates the stored queue namespace if localStorage is unavailable.
  }
};

export const forgetRememberedSessionIdentity = (storage: Storage): void => {
  try {
    storage.removeItem(rememberedSessionKey);
  } catch {
    // A confirmed sign-out must still complete if localStorage is unavailable.
  }
};
