export interface EmailOtpRequestBody {
  email: string;
  returnTo: string;
}

export interface EmailOtpAcceptedResponse {
  accepted: true;
  message: string;
}

export interface SignOutSuccessResponse {
  signedOut: true;
}

export interface AuthCallbackQueryValueReader {
  get: (name: string) => string | null | undefined;
  getAll?: (name: string) => string[];
  has: (name: string) => boolean;
}

export const emailOtpCallbackFailureReasons = [
  'authorization_denied',
  'bearer_token_in_callback',
  'invalid_callback',
  'missing_code',
] as const;

export type EmailOtpCallbackFailureReason = (typeof emailOtpCallbackFailureReasons)[number];

export type EmailOtpCallbackQueryParseResult =
  | {
      code: string;
      flowId?: string;
      status: 'ok';
    }
  | {
      reason: EmailOtpCallbackFailureReason;
      status: 'error';
    };

export const defaultWebAuthReturnPath = '/' as const;

export const genericEmailOtpAcceptedMessage =
  'Nếu email hợp lệ và đã được phê duyệt, chúng tôi sẽ gửi liên kết đăng nhập.';

export const maximumAuthEmailLength = 320;
export const maximumWebAuthReturnPathLength = 256;
export const maximumWebAuthReturnPathEncodedLength = 768;
export const maximumEmailOtpCallbackCodeLength = 4_096;
export const maximumPkceFlowIdLength = 64;
export const supabasePkceFlowIdQueryParameter = 'sb_flow_id';

const emailLocalPartPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const emailDomainLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const pkceFlowIdPattern = /^[a-z0-9_-]{8,64}$/;
const bearerTokenFields = new Set(['access_token', 'id_token', 'refresh_token', 'token']);

const isAsciiText = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit > 0x7f) {
      return false;
    }
  }

  return true;
};

export const normalizeAuthEmailAddress = (email: string): string => {
  const trimmed = email.trim();
  if (!isAsciiText(trimmed)) {
    throw new TypeError('email must be a valid email address.');
  }

  const normalized = trimmed.toLowerCase();
  const separatorIndex = normalized.indexOf('@');
  const localPart = normalized.slice(0, separatorIndex);
  const domain = normalized.slice(separatorIndex + 1);
  const domainLabels = domain.split('.');

  if (
    normalized.length > maximumAuthEmailLength ||
    separatorIndex <= 0 ||
    separatorIndex !== normalized.lastIndexOf('@') ||
    localPart.length > 64 ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    !emailLocalPartPattern.test(localPart) ||
    domain.length > 253 ||
    domainLabels.length < 2 ||
    domainLabels.some((label) => !emailDomainLabelPattern.test(label))
  ) {
    throw new TypeError('email must be a valid email address.');
  }

  return normalized;
};

const hasInvalidReturnPathCharacter = (value: string): boolean => {
  for (const character of value) {
    if (/\s/u.test(character)) {
      return true;
    }

    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }

    if (codePoint <= 0x1f || codePoint === 0x7f) {
      return true;
    }
  }

  return false;
};

export const normalizeWebAuthReturnPath = (value: string | undefined): string => {
  if (value === undefined) {
    return defaultWebAuthReturnPath;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return defaultWebAuthReturnPath;
  }

  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    throw new TypeError('returnTo must be a same-origin relative path.');
  }

  if (
    normalized.length > maximumWebAuthReturnPathLength ||
    normalized.includes('\\') ||
    hasInvalidReturnPathCharacter(normalized)
  ) {
    throw new TypeError('returnTo must be a same-origin relative path.');
  }

  try {
    if (encodeURIComponent(normalized).length > maximumWebAuthReturnPathEncodedLength) {
      throw new TypeError('returnTo must fit within the authentication cookie budget.');
    }
  } catch {
    throw new TypeError('returnTo must be a same-origin relative path.');
  }

  return normalized;
};

export const createEmailOtpAcceptedResponse = (): EmailOtpAcceptedResponse => ({
  accepted: true,
  message: genericEmailOtpAcceptedMessage,
});

export const createSignOutSuccessResponse = (): SignOutSuccessResponse => ({
  signedOut: true,
});

export const normalizePkceFlowId = (value: string): string => {
  if (value.length > maximumPkceFlowIdLength || !pkceFlowIdPattern.test(value)) {
    throw new TypeError('flowId must match the Supabase PKCE flow identifier format.');
  }

  return value;
};

const readNonEmptyQueryValue = (
  reader: AuthCallbackQueryValueReader,
  key: string,
): string | undefined => {
  const value = reader.get(key);
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const parseEmailOtpCallbackQuery = (
  query: AuthCallbackQueryValueReader,
): EmailOtpCallbackQueryParseResult => {
  if (
    query.getAll &&
    (query.getAll('code').length > 1 || query.getAll(supabasePkceFlowIdQueryParameter).length > 1)
  ) {
    return { reason: 'invalid_callback', status: 'error' };
  }

  if ([...bearerTokenFields].some((field) => query.has(field))) {
    return { reason: 'bearer_token_in_callback', status: 'error' };
  }

  if (readNonEmptyQueryValue(query, 'error')) {
    return { reason: 'authorization_denied', status: 'error' };
  }

  const rawCode = query.get('code');
  if (typeof rawCode === 'string' && rawCode.length > maximumEmailOtpCallbackCodeLength) {
    return { reason: 'invalid_callback', status: 'error' };
  }

  const code = readNonEmptyQueryValue(query, 'code');
  if (!code) {
    return { reason: 'missing_code', status: 'error' };
  }

  if (code.length > maximumEmailOtpCallbackCodeLength) {
    return { reason: 'invalid_callback', status: 'error' };
  }

  const rawFlowId = query.get(supabasePkceFlowIdQueryParameter);
  let flowId: string | undefined;
  if (rawFlowId !== null && rawFlowId !== undefined) {
    try {
      flowId = normalizePkceFlowId(rawFlowId);
    } catch {
      return { reason: 'invalid_callback', status: 'error' };
    }
  }

  return {
    code,
    ...(flowId ? { flowId } : {}),
    status: 'ok',
  };
};
