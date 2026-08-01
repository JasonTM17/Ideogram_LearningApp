import { describe, expect, it } from 'vitest';

import { NativeSessionRequestScope } from './native-session-request-scope';

const session = (
  accessToken: string,
  userId = '11111111-1111-4111-8111-111111111111',
  sessionEpoch = 1,
) => ({
  accessToken,
  sessionEpoch,
  userId,
});

describe('native session request scope', () => {
  it('keeps a request scope for token refresh within the same user and epoch', () => {
    const scope = new NativeSessionRequestScope();
    scope.update(session('first-token'));
    const signal = scope.getSignal();

    scope.update(session('rotated-token'));

    expect(signal.aborted).toBe(false);
    expect(scope.getSignal()).toBe(signal);
  });

  it('aborts outstanding work when the account or session epoch changes', () => {
    const scope = new NativeSessionRequestScope();
    scope.update(session('first-token'));
    const firstSignal = scope.getSignal();

    scope.update(session('next-token', '22222222-2222-4222-8222-222222222222', 2));

    expect(firstSignal.aborted).toBe(true);
    expect(scope.getSignal().aborted).toBe(false);
  });

  it('aborts outstanding work on sign-out and disposal', () => {
    const scope = new NativeSessionRequestScope();
    scope.update(session('first-token'));
    const signedInSignal = scope.getSignal();

    scope.update(null);
    const signedOutSignal = scope.getSignal();
    scope.dispose();

    expect(signedInSignal.aborted).toBe(true);
    expect(signedOutSignal.aborted).toBe(true);
    expect(() => scope.update(null)).toThrow('disposed');
  });
});
