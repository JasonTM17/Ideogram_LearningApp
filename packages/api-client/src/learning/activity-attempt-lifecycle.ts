/**
 * A small client-side lifecycle for one learner mutation. It retains the exact
 * input only while a retry is safe, and keeps duplicate interactions from
 * allocating a second operation while a request is still in flight.
 */
export interface ActivityAttemptRequestScope {
  dispose: () => void;
  signal: AbortSignal;
}

export interface ActivityAttemptSubmitOptions {
  signal: AbortSignal;
}

export interface ActivityAttemptLifecycleOptions<TInput, TReceipt, TFeedback> {
  createInput: () => Promise<TInput>;
  createRequestScope: () => ActivityAttemptRequestScope;
  describeError: (error: unknown) => TFeedback;
  isRetryable: (feedback: TFeedback) => boolean;
  submit: (input: TInput, options: ActivityAttemptSubmitOptions) => Promise<TReceipt>;
}

export type ActivityAttemptLifecycleResult<TReceipt, TFeedback> =
  | { kind: 'aborted' }
  | { kind: 'busy' }
  | { feedback: TFeedback; kind: 'error' }
  | { kind: 'receipt'; receipt: TReceipt };

export class ActivityAttemptLifecycle<TInput, TReceipt, TFeedback> {
  private activeScope: ActivityAttemptRequestScope | null = null;
  private pendingInput: TInput | null = null;

  constructor(
    private readonly options: ActivityAttemptLifecycleOptions<TInput, TReceipt, TFeedback>,
  ) {}

  get isSubmitting(): boolean {
    return this.activeScope !== null;
  }

  /** The exact idempotent input retained after a retryable outcome. */
  getPendingInput(): TInput | null {
    return this.pendingInput;
  }

  discardPendingInput(): void {
    this.pendingInput = null;
  }

  stop(): boolean {
    if (this.activeScope === null) {
      return false;
    }

    this.activeScope.dispose();
    return true;
  }

  dispose(): void {
    this.stop();
  }

  async submit(): Promise<ActivityAttemptLifecycleResult<TReceipt, TFeedback>> {
    if (this.activeScope !== null) {
      return { kind: 'busy' };
    }

    let scope: ActivityAttemptRequestScope;
    try {
      scope = this.options.createRequestScope();
    } catch (error) {
      return this.errorResult(error);
    }

    this.activeScope = scope;
    try {
      const input = this.pendingInput ?? (await this.options.createInput());
      if (scope.signal.aborted) {
        return { kind: 'aborted' };
      }

      this.pendingInput = input;
      const receipt = await this.options.submit(input, { signal: scope.signal });
      if (scope.signal.aborted) {
        return { kind: 'aborted' };
      }

      this.pendingInput = null;
      return { kind: 'receipt', receipt };
    } catch (error) {
      if (scope.signal.aborted) {
        return { kind: 'aborted' };
      }

      return this.errorResult(error);
    } finally {
      scope.dispose();
      if (this.activeScope === scope) {
        this.activeScope = null;
      }
    }
  }

  private errorResult(error: unknown): ActivityAttemptLifecycleResult<TReceipt, TFeedback> {
    const feedback = this.options.describeError(error);
    if (!this.options.isRetryable(feedback)) {
      this.pendingInput = null;
    }

    return { feedback, kind: 'error' };
  }
}
