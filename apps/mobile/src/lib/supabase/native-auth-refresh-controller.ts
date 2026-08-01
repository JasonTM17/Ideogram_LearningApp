export interface NativeAuthRefreshPort {
  startAutoRefresh: () => Promise<void>;
  stopAutoRefresh: () => Promise<void>;
}

export interface NativeAppStateSubscription {
  remove: () => void;
}

export interface NativeAppStateSource {
  currentState: string | null;
  subscribe: (listener: (state: string) => void) => NativeAppStateSubscription;
}

export interface NativeAuthRefreshControllerOptions {
  onError?: (error: unknown) => void;
}

export class NativeAuthRefreshController {
  private disposed = false;
  private refreshState: 'running' | 'stopped' | 'unknown' = 'unknown';
  private started = false;
  private subscription: NativeAppStateSubscription | undefined;
  private transition: Promise<void> = Promise.resolve();

  constructor(
    private readonly auth: NativeAuthRefreshPort,
    private readonly appState: NativeAppStateSource,
    private readonly options: NativeAuthRefreshControllerOptions = {},
  ) {}

  start(): void {
    if (this.disposed) {
      throw new Error('A disposed auth refresh controller cannot be restarted.');
    }

    if (this.started) {
      return;
    }

    this.started = true;
    this.subscription = this.appState.subscribe((state) => {
      if (!this.disposed) {
        this.enqueueTransition(state === 'active');
      }
    });
    this.enqueueTransition(this.appState.currentState === 'active');
  }

  flush(): Promise<void> {
    return this.transition;
  }

  async dispose(): Promise<void> {
    if (!this.disposed) {
      this.disposed = true;
      this.subscription?.remove();
      this.subscription = undefined;
    }

    this.enqueueTransition(false);
    await this.flush();
  }

  private enqueueTransition(shouldRefresh: boolean): void {
    const operation = this.transition.then(async () => {
      const desiredState = shouldRefresh ? 'running' : 'stopped';
      if (desiredState === this.refreshState) {
        return;
      }

      if (shouldRefresh) {
        await this.auth.startAutoRefresh();
        this.refreshState = 'running';
        return;
      }

      await this.auth.stopAutoRefresh();
      this.refreshState = 'stopped';
    });

    this.transition = operation.catch((error: unknown) => {
      this.options.onError?.(error);
    });
  }
}
