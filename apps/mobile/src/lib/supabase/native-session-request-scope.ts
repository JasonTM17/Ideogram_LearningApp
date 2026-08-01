import type { NativeSessionSnapshot } from './native-session-store';

const createSessionIdentity = (session: Readonly<NativeSessionSnapshot> | null): string | null =>
  session ? `${session.userId}:${session.sessionEpoch}` : null;

export class NativeSessionRequestScope {
  private controller = new AbortController();
  private disposed = false;
  private identity: string | null = null;

  dispose(): void {
    if (!this.disposed) {
      this.disposed = true;
      this.controller.abort();
    }
  }

  getSignal(): AbortSignal {
    return this.controller.signal;
  }

  update(session: Readonly<NativeSessionSnapshot> | null): void {
    if (this.disposed) {
      throw new Error('A disposed native session request scope cannot be updated.');
    }

    const nextIdentity = createSessionIdentity(session);
    if (nextIdentity === this.identity) {
      return;
    }

    this.controller.abort();
    this.controller = new AbortController();
    this.identity = nextIdentity;
  }
}
