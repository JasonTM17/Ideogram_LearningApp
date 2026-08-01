import { describe, expect, it } from 'vitest';

import { getNativeAuthRoutePolicy } from './native-auth-route-policy';

describe('native auth route policy', () => {
  it('keeps native learner routes closed while session hydration is incomplete', () => {
    expect(
      getNativeAuthRoutePolicy({ hasSession: false, isHydrating: true, isWeb: false }),
    ).toEqual({
      canAccessAuthentication: false,
      canAccessInitializing: true,
      canAccessLearner: false,
    });
  });

  it('permits only sign-in after anonymous native hydration', () => {
    expect(
      getNativeAuthRoutePolicy({ hasSession: false, isHydrating: false, isWeb: false }),
    ).toEqual({
      canAccessAuthentication: true,
      canAccessInitializing: false,
      canAccessLearner: false,
    });
  });

  it('permits native learner routes only for a verified session snapshot', () => {
    expect(
      getNativeAuthRoutePolicy({ hasSession: true, isHydrating: false, isWeb: false }),
    ).toEqual({
      canAccessAuthentication: false,
      canAccessInitializing: false,
      canAccessLearner: true,
    });
  });

  it('keeps both routes available in the web preview runtime', () => {
    expect(
      getNativeAuthRoutePolicy({ hasSession: false, isHydrating: false, isWeb: true }),
    ).toEqual({
      canAccessAuthentication: true,
      canAccessInitializing: false,
      canAccessLearner: true,
    });
  });
});
