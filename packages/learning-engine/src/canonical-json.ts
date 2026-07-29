type JsonValue = boolean | null | number | string | JsonArray | JsonObject;
type JsonArray = JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Produces a stable JSON representation for server-side idempotency hashing.
 * It intentionally rejects non-JSON values instead of silently stringifying a
 * platform-specific value such as Date, Map, undefined, or NaN.
 */
export const serializeCanonicalJson = (value: unknown): string => {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical JSON accepts only finite numbers.');
    }

    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeCanonicalJson(item)).join(',')}]`;
  }

  if (isJsonObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serializeCanonicalJson(value[key])}`)
      .join(',')}}`;
  }

  throw new TypeError('Canonical JSON accepts only JSON-compatible values.');
};
