const flowIdPattern = /^[a-zA-Z0-9_-]{8,64}$/;
const maximumTrackedFlowIds = 64;
const flowSlotSuffix = '-code-verifier';
const registrySuffix = '-ideogram-pkce-flow-registry-v1';

export const createSupabasePkceFlowRegistryKey = (storageKey: string): string =>
  `${storageKey}${registrySuffix}`;

export const createSupabasePkceFlowSlotKey = (storageKey: string, flowId: string): string =>
  `${storageKey}-flow-${flowId}${flowSlotSuffix}`;

export const parseSupabasePkceFlowId = (storageKey: string, key: string): string | null => {
  const prefix = `${storageKey}-flow-`;
  if (!key.startsWith(prefix) || !key.endsWith(flowSlotSuffix)) {
    return null;
  }

  const flowId = key.slice(prefix.length, -flowSlotSuffix.length);
  return flowIdPattern.test(flowId) ? flowId : null;
};

export const readSupabasePkceFlowIds = (value: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (candidate): candidate is string =>
              typeof candidate === 'string' && flowIdPattern.test(candidate),
          )
          .slice(-maximumTrackedFlowIds)
      : [];
  } catch {
    return [];
  }
};

export const mergeSupabasePkceFlowId = (
  flowIds: readonly string[],
  flowId: string,
): { evictedFlowIds: string[]; flowIds: string[] } => {
  const nextFlowIds = [...new Set([...flowIds, flowId])];
  const evictedFlowIds = nextFlowIds.splice(
    0,
    Math.max(0, nextFlowIds.length - maximumTrackedFlowIds),
  );
  return { evictedFlowIds, flowIds: nextFlowIds };
};
