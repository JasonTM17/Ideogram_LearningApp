export interface AuthorizationTransaction {
  codeChallenge: string;
  codeVerifier: string;
  expiresAt: string;
  nonce: string;
  redirectUri: string;
  state: string;
}

export interface RandomBytesSource {
  randomBytes: (byteLength: number) => Uint8Array;
}

export interface Sha256Source {
  sha256: (value: string) => Promise<Uint8Array>;
}

export interface CreateAuthorizationTransactionInput {
  lifetimeMilliseconds?: number;
  now?: Date;
  redirectUri: string;
}

const base64UrlAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const codeVerifierByteLength = 64;
const nonceByteLength = 32;
const sha256DigestByteLength = 32;
const stateByteLength = 32;

const encodeBase64Url = (bytes: Uint8Array): string => {
  let result = '';

  for (let offset = 0; offset < bytes.length; offset += 3) {
    const first = bytes[offset] ?? 0;
    const second = bytes[offset + 1];
    const third = bytes[offset + 2];

    result += base64UrlAlphabet[first >> 2];
    result += base64UrlAlphabet[((first & 0b00000011) << 4) | ((second ?? 0) >> 4)];

    if (second !== undefined) {
      result += base64UrlAlphabet[((second & 0b00001111) << 2) | ((third ?? 0) >> 6)];
    }

    if (third !== undefined) {
      result += base64UrlAlphabet[third & 0b00111111];
    }
  }

  return result;
};

const assertRedirectUri = (redirectUri: string): void => {
  if (redirectUri.trim().length === 0) {
    throw new TypeError('redirectUri must not be empty.');
  }
};

const readExactRandomBytes = (
  randomBytesSource: RandomBytesSource,
  byteLength: number,
  field: string,
): Uint8Array => {
  const bytes = randomBytesSource.randomBytes(byteLength);

  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== byteLength) {
    throw new TypeError(`${field} must provide exactly ${byteLength} random bytes.`);
  }

  return bytes;
};

const readSha256Digest = async (
  sha256Source: Sha256Source,
  codeVerifier: string,
): Promise<Uint8Array> => {
  const digest = await sha256Source.sha256(codeVerifier);

  if (!(digest instanceof Uint8Array) || digest.byteLength !== sha256DigestByteLength) {
    throw new TypeError('sha256 must provide a 32-byte digest.');
  }

  return digest;
};

/**
 * Creates opaque PKCE material without assuming a Node, browser, or Expo crypto
 * implementation. Each runtime provides an audited entropy and SHA-256 adapter.
 */
export const createAuthorizationTransaction = async (
  input: CreateAuthorizationTransactionInput,
  randomBytesSource: RandomBytesSource,
  sha256Source: Sha256Source,
): Promise<AuthorizationTransaction> => {
  assertRedirectUri(input.redirectUri);

  const lifetimeMilliseconds = input.lifetimeMilliseconds ?? 10 * 60 * 1_000;
  if (!Number.isInteger(lifetimeMilliseconds) || lifetimeMilliseconds <= 0) {
    throw new RangeError('lifetimeMilliseconds must be a positive integer.');
  }

  const now = input.now ?? new Date();
  const codeVerifier = encodeBase64Url(
    readExactRandomBytes(randomBytesSource, codeVerifierByteLength, 'codeVerifier'),
  );
  const state = encodeBase64Url(readExactRandomBytes(randomBytesSource, stateByteLength, 'state'));
  const nonce = encodeBase64Url(readExactRandomBytes(randomBytesSource, nonceByteLength, 'nonce'));
  const codeChallenge = encodeBase64Url(await readSha256Digest(sha256Source, codeVerifier));

  return {
    codeChallenge,
    codeVerifier,
    expiresAt: new Date(now.getTime() + lifetimeMilliseconds).toISOString(),
    nonce,
    redirectUri: input.redirectUri,
    state,
  };
};
