import { parseEmailOtpCallbackQuery } from '@ideogram/contracts';

const callbackEntropyPattern = /^[a-f0-9]{64}$/;
const nativeNonceParameter = 'native_nonce';
const nativeStateParameter = 'native_state';
const bearerParameterNames = ['access_token', 'id_token', 'refresh_token', 'token'];

export interface NativeEmailOtpCallback {
  code: string;
  flowId: string;
  nonce: string;
  state: string;
}

export type NativeEmailOtpCallbackParseResult =
  | { callback: NativeEmailOtpCallback; status: 'ok' }
  | {
      reason:
        | 'authorization_denied'
        | 'bearer_token_in_callback'
        | 'invalid_callback'
        | 'missing_code'
        | 'redirect_uri_mismatch';
      status: 'error';
    };

const hasBearerParameter = (url: URL): boolean => {
  const fragmentParameters = new URLSearchParams(url.hash.slice(1));
  return bearerParameterNames.some(
    (parameter) => url.searchParams.has(parameter) || fragmentParameters.has(parameter),
  );
};

const hasExactCallbackBase = (url: URL, callbackUrl: string): boolean => {
  const expected = new URL(callbackUrl);
  return (
    url.protocol === expected.protocol &&
    url.host === expected.host &&
    url.pathname === expected.pathname &&
    !url.username &&
    !url.password
  );
};

const readUniqueEntropy = (query: URLSearchParams, parameter: string): string | null => {
  const values = query.getAll(parameter);
  if (values.length !== 1) {
    return null;
  }

  const value = values[0]?.trim() ?? '';
  return callbackEntropyPattern.test(value) ? value : null;
};

export const parseNativeEmailOtpCallback = (
  callbackUrl: string,
  expectedCallbackUrl: string,
): NativeEmailOtpCallbackParseResult => {
  let receivedUrl: URL;

  try {
    receivedUrl = new URL(callbackUrl);
  } catch {
    return { reason: 'invalid_callback', status: 'error' };
  }

  if (!hasExactCallbackBase(receivedUrl, expectedCallbackUrl)) {
    return { reason: 'redirect_uri_mismatch', status: 'error' };
  }

  if (hasBearerParameter(receivedUrl)) {
    return { reason: 'bearer_token_in_callback', status: 'error' };
  }

  if (receivedUrl.hash) {
    return { reason: 'invalid_callback', status: 'error' };
  }

  const parsed = parseEmailOtpCallbackQuery(receivedUrl.searchParams);
  if (parsed.status === 'error') {
    return parsed;
  }

  const state = readUniqueEntropy(receivedUrl.searchParams, nativeStateParameter);
  const nonce = readUniqueEntropy(receivedUrl.searchParams, nativeNonceParameter);
  if (!parsed.flowId || !state || !nonce) {
    return { reason: 'invalid_callback', status: 'error' };
  }

  return {
    callback: { code: parsed.code, flowId: parsed.flowId, nonce, state },
    status: 'ok',
  };
};
