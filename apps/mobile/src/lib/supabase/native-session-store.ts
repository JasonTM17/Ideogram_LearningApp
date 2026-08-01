export interface NativeSessionSnapshot {
  accessToken: string;
  sessionEpoch: number;
  userId: string;
}

export interface SupabaseSessionLike {
  access_token: unknown;
  user: {
    id: unknown;
  } | null;
}

export interface NativeSessionStoreOptions {
  onListenerError?: (error: unknown) => void;
}

export type NativeSessionListener = () => void;

const bearerTokenPattern = /^[A-Za-z0-9._~-]+$/;
const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeSession = (
  session: SupabaseSessionLike | null,
): Omit<NativeSessionSnapshot, 'sessionEpoch'> | null => {
  const accessToken = session?.access_token;
  const userId = session?.user?.id;

  if (
    typeof accessToken !== 'string' ||
    accessToken.length === 0 ||
    accessToken.length > 8_192 ||
    !bearerTokenPattern.test(accessToken) ||
    typeof userId !== 'string' ||
    !userIdPattern.test(userId)
  ) {
    return null;
  }

  return { accessToken, userId: userId.toLowerCase() };
};

export class NativeSessionStore {
  private epoch = 0;
  private initialized = false;
  private readonly listeners = new Set<NativeSessionListener>();
  private snapshot: Readonly<NativeSessionSnapshot> | null = null;

  constructor(private readonly options: NativeSessionStoreOptions = {}) {}

  applySession(session: SupabaseSessionLike | null): void {
    const isInitialSession = !this.initialized;
    const normalized = normalizeSession(session);
    const previousUserId = this.snapshot?.userId ?? null;
    const nextUserId = normalized?.userId ?? null;

    if (previousUserId !== nextUserId) {
      this.epoch += 1;
    }

    const nextSnapshot = normalized
      ? Object.freeze({
          ...normalized,
          sessionEpoch: this.epoch,
        })
      : null;
    const changed =
      this.snapshot?.accessToken !== nextSnapshot?.accessToken ||
      this.snapshot?.sessionEpoch !== nextSnapshot?.sessionEpoch ||
      this.snapshot?.userId !== nextSnapshot?.userId;

    this.snapshot = nextSnapshot;
    this.initialized = true;
    if (isInitialSession || changed) {
      this.notify();
    }
  }

  createSessionProvider(): () => Promise<NativeSessionSnapshot | null> {
    return async () => this.getSnapshot();
  }

  getSnapshot(): Readonly<NativeSessionSnapshot> | null {
    return this.snapshot;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  subscribe(listener: NativeSessionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        this.options.onListenerError?.(error);
      }
    }
  }
}
