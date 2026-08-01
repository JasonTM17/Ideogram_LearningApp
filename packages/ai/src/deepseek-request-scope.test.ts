import { describe, expect, it } from 'vitest';

import { createDeepSeekRequestScope, DeepSeekRequestTimeoutError } from './deepseek-request-scope';

describe('DeepSeek request scope', () => {
  it('cancels the provider request when the caller disconnects', () => {
    const caller = new AbortController();
    const scope = createDeepSeekRequestScope(caller.signal, 5_000);
    caller.abort();

    expect(scope.signal.aborted).toBe(true);
    expect(() => scope.throwIfAborted()).toThrow(/cancelled/u);
    scope.dispose();
  });

  it('exposes a bounded timeout instead of leaving a provider request open', async () => {
    const scope = createDeepSeekRequestScope(undefined, 1);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(() => scope.throwIfAborted()).toThrow(DeepSeekRequestTimeoutError);
    scope.dispose();
  });
});
