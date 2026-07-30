import {
  defaultWebAuthReturnPath,
  normalizePkceFlowId,
  normalizeWebAuthReturnPath,
} from '@ideogram/contracts';

import type { AuthCookieSetOptions, AuthCookieStore } from './auth-cookie-store';

export const authReturnPathCookieName = 'ideogram_auth_return_to';
export const authReturnPathCookieMaxAgeSeconds = 60 * 15;
export const authReturnPathCookiePath = '/auth/callback';
export const maximumPendingAuthReturnPathCookies = 4;

export const createAuthReturnPathCookieName = (flowId?: string): string =>
  flowId ? `${authReturnPathCookieName}_${normalizePkceFlowId(flowId)}` : authReturnPathCookieName;

const createAuthReturnPathCookieOptions = (isProduction: boolean): AuthCookieSetOptions => ({
  httpOnly: true,
  maxAge: authReturnPathCookieMaxAgeSeconds,
  path: authReturnPathCookiePath,
  sameSite: 'lax',
  secure: isProduction,
});

const clearAuthReturnPathCookie = ({
  cookieStore,
  cookieName,
  isProduction,
}: {
  cookieName: string;
  cookieStore: AuthCookieStore;
  isProduction: boolean;
}): void => {
  cookieStore.set(cookieName, '', {
    ...createAuthReturnPathCookieOptions(isProduction),
    maxAge: 0,
  });
};

const trimPendingFlowReturnCookies = ({
  cookieStore,
  currentCookieName,
  isProduction,
}: {
  cookieStore: AuthCookieStore;
  currentCookieName: string;
  isProduction: boolean;
}): void => {
  const flowCookiePrefix = `${authReturnPathCookieName}_`;
  const existingFlowCookies = cookieStore
    .getAll()
    .filter(({ name }) => name.startsWith(flowCookiePrefix) && name !== currentCookieName);
  const numberToClear = Math.max(
    0,
    existingFlowCookies.length - maximumPendingAuthReturnPathCookies + 1,
  );

  for (const { name } of existingFlowCookies.slice(0, numberToClear)) {
    clearAuthReturnPathCookie({ cookieName: name, cookieStore, isProduction });
  }
};

export const storeAuthReturnPath = ({
  cookieStore,
  isProduction,
  returnTo,
  flowId,
}: {
  cookieStore: AuthCookieStore;
  flowId?: string;
  isProduction: boolean;
  returnTo: string;
}): void => {
  const normalizedReturnTo = normalizeWebAuthReturnPath(returnTo);
  const cookieName = createAuthReturnPathCookieName(flowId);
  if (flowId) {
    clearAuthReturnPathCookie({
      cookieName: authReturnPathCookieName,
      cookieStore,
      isProduction,
    });
    trimPendingFlowReturnCookies({
      cookieStore,
      currentCookieName: cookieName,
      isProduction,
    });
  }

  cookieStore.set(cookieName, normalizedReturnTo, createAuthReturnPathCookieOptions(isProduction));
};

export const consumeAuthReturnPath = ({
  cookieStore,
  flowId,
  isProduction,
}: {
  cookieStore: AuthCookieStore;
  flowId?: string;
  isProduction: boolean;
}): string => {
  const cookieName = createAuthReturnPathCookieName(flowId);
  const rawValue = cookieStore.get(cookieName)?.value;

  clearAuthReturnPathCookie({ cookieName, cookieStore, isProduction });

  if (!rawValue) {
    return defaultWebAuthReturnPath;
  }

  try {
    return normalizeWebAuthReturnPath(rawValue);
  } catch {
    return defaultWebAuthReturnPath;
  }
};
