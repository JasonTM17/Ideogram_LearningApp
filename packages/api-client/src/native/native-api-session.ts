import { NativeApiSessionChangedError, NativeApiSessionProviderError } from './native-api-errors';

export interface NativeApiSession {
  accessToken: string;
  sessionEpoch: number;
  userId: string;
}

export type NativeApiSessionProvider = () => Promise<NativeApiSession | null>;

export interface NativeApiSessionIdentity {
  sessionEpoch: number;
  userId: string;
}

const bearerTokenPattern = /^[A-Za-z0-9._~-]+$/u;

export const validateNativeApiSession = (input: unknown): NativeApiSession | null => {
  if (input === null) {
    return null;
  }

  if (!input || typeof input !== 'object') {
    throw new NativeApiSessionProviderError();
  }

  const candidate = input as Partial<NativeApiSession>;
  if (
    typeof candidate.accessToken !== 'string' ||
    candidate.accessToken.length === 0 ||
    candidate.accessToken.length > 8192 ||
    !bearerTokenPattern.test(candidate.accessToken) ||
    typeof candidate.userId !== 'string' ||
    candidate.userId.trim().length === 0 ||
    candidate.userId.length > 1024 ||
    !Number.isSafeInteger(candidate.sessionEpoch) ||
    (candidate.sessionEpoch ?? -1) < 0
  ) {
    throw new NativeApiSessionProviderError();
  }

  return {
    accessToken: candidate.accessToken,
    sessionEpoch: candidate.sessionEpoch as number,
    userId: candidate.userId,
  };
};

export const captureNativeApiSessionIdentity = (
  session: NativeApiSession,
): NativeApiSessionIdentity => ({
  sessionEpoch: session.sessionEpoch,
  userId: session.userId,
});

export const assertNativeApiSessionIdentity = (
  expected: NativeApiSessionIdentity,
  current: NativeApiSession | null,
): void => {
  if (
    current === null ||
    current.userId !== expected.userId ||
    current.sessionEpoch !== expected.sessionEpoch
  ) {
    throw new NativeApiSessionChangedError();
  }
};
