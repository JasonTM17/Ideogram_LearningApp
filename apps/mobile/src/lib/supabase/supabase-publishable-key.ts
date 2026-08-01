const base64UrlAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
const privilegedRolePattern = /"role"\s*:\s*"(?:service_role|supabase_admin)"/;
const anonymousRolePattern = /"role"\s*:\s*"anon"/;

const decodeBase64UrlAscii = (value: string): string | null => {
  if (!base64UrlPattern.test(value) || value.length % 4 === 1) {
    return null;
  }

  let bitBuffer = 0;
  let bitCount = 0;
  let decoded = '';

  for (const symbol of value) {
    const index = base64UrlAlphabet.indexOf(symbol);
    if (index < 0) {
      return null;
    }

    bitBuffer = (bitBuffer << 6) | index;
    bitCount += 6;

    if (bitCount >= 8) {
      bitCount -= 8;
      decoded += String.fromCharCode((bitBuffer >> bitCount) & 0xff);
    }
  }

  return decoded;
};

const isSafeLegacyAnonymousKey = (key: string): boolean => {
  const segments = key.split('.');
  if (segments.length !== 3) {
    return false;
  }

  const payload = decodeBase64UrlAscii(segments[1] ?? '');
  return (
    payload !== null && anonymousRolePattern.test(payload) && !privilegedRolePattern.test(payload)
  );
};

export const validateSupabasePublishableKey = (rawKey: string): string => {
  const key = rawKey.trim();

  if (key.length === 0 || key.length > 8_192 || /\s/.test(key)) {
    throw new TypeError('Supabase publishable key is invalid.');
  }

  if (key.startsWith('sb_publishable_') && key.length > 'sb_publishable_'.length) {
    return key;
  }

  if (key.startsWith('sb_') || !isSafeLegacyAnonymousKey(key)) {
    throw new TypeError('A privileged or unsupported Supabase key cannot be used on mobile.');
  }

  return key;
};
