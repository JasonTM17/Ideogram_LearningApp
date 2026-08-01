export interface NativeAuthRoutePolicy {
  canAccessAuthentication: boolean;
  canAccessInitializing: boolean;
  canAccessLearner: boolean;
}

export const getNativeAuthRoutePolicy = ({
  hasSession,
  isHydrating,
  isWeb,
}: {
  hasSession: boolean;
  isHydrating: boolean;
  isWeb: boolean;
}): NativeAuthRoutePolicy => {
  if (isWeb) {
    return {
      canAccessAuthentication: true,
      canAccessInitializing: false,
      canAccessLearner: true,
    };
  }

  return {
    canAccessAuthentication: !isHydrating && !hasSession,
    canAccessInitializing: isHydrating,
    canAccessLearner: !isHydrating && hasSession,
  };
};
