import { defaultWebAuthReturnPath, parseEmailOtpCallbackQuery } from '@ideogram/contracts';

import {
  createSupabaseAuthRouteClient,
  type SupabaseAuthRouteClient,
} from '@/lib/supabase/auth-server-client';
import { consumeAuthReturnPath } from '@/lib/supabase/auth-return-path';
import {
  readWebAuthRouteConfiguration,
  type WebAuthRouteConfiguration,
} from '@/lib/supabase/auth-route-config';
import { ApiHttpError, createApiErrorResponse, createRequestId } from '@/server/http/api-response';

import { redirectNoStore } from './auth-route-response';

interface CallbackRouteDependencies {
  createClient: () => Promise<SupabaseAuthRouteClient>;
  readConfiguration: () => WebAuthRouteConfiguration;
}

const defaultDependencies: CallbackRouteDependencies = {
  createClient: createSupabaseAuthRouteClient,
  readConfiguration: readWebAuthRouteConfiguration,
};

const invalidCallback = (status = 400): ApiHttpError =>
  new ApiHttpError({
    code: status === 401 ? 'UNAUTHORIZED' : 'INVALID_REQUEST',
    message: 'Liên kết đăng nhập không hợp lệ hoặc đã hết hạn.',
    status,
  });

const serviceUnavailable = (): ApiHttpError =>
  new ApiHttpError({
    code: 'UNAVAILABLE',
    message: 'Dịch vụ xác thực tạm thời chưa sẵn sàng. Vui lòng thử lại.',
    status: 503,
  });

const redirectToSignIn = ({
  configuration,
  headers,
  reason,
  requestId,
  returnTo,
}: {
  configuration: WebAuthRouteConfiguration;
  headers?: HeadersInit;
  reason: string;
  requestId: string;
  returnTo?: string;
}): Response => {
  const signInUrl = new URL('/sign-in', configuration.trustedOrigin);
  signInUrl.searchParams.set('reason', reason);
  if (returnTo) {
    signInUrl.searchParams.set('returnTo', returnTo);
  }

  return redirectNoStore(signInUrl.toString(), {
    ...(headers ? { headers } : {}),
    requestId,
  });
};

const readErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  const status = error.status;
  return typeof status === 'number' ? status : undefined;
};

const exchangeCodeForSession = async ({
  authClient,
  code,
  flowId,
}: {
  authClient: SupabaseAuthRouteClient['client']['auth'];
  code: string;
  flowId?: string;
}): Promise<void> => {
  const { error } = flowId
    ? await authClient.exchangeCodeForSession(code, { flowId })
    : await authClient.exchangeCodeForSession(code);
  const status = readErrorStatus(error);

  if (!error) {
    return;
  }

  if (status === 400 || status === 401 || status === 403) {
    throw invalidCallback(401);
  }

  throw serviceUnavailable();
};

export const createAuthCallbackRoute =
  (dependencies: CallbackRouteDependencies = defaultDependencies) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();
    let configuration: WebAuthRouteConfiguration;

    try {
      configuration = dependencies.readConfiguration();
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }

    const parsedCallback = parseEmailOtpCallbackQuery(new URL(request.url).searchParams);
    if (parsedCallback.status === 'error') {
      return redirectToSignIn({
        configuration,
        reason: parsedCallback.reason,
        requestId,
      });
    }

    let authClient: SupabaseAuthRouteClient;
    try {
      authClient = await dependencies.createClient();
    } catch {
      return redirectToSignIn({
        configuration,
        reason: 'service_unavailable',
        requestId,
      });
    }

    let returnTo: string = defaultWebAuthReturnPath;
    try {
      returnTo = consumeAuthReturnPath({
        cookieStore: authClient.cookieStore,
        ...(parsedCallback.flowId ? { flowId: parsedCallback.flowId } : {}),
        isProduction: configuration.isProduction,
      });
      await exchangeCodeForSession({
        authClient: authClient.client.auth,
        code: parsedCallback.code,
        ...(parsedCallback.flowId ? { flowId: parsedCallback.flowId } : {}),
      });

      return redirectNoStore(new URL(returnTo, configuration.trustedOrigin).toString(), {
        headers: authClient.responseHeaders,
        requestId,
      });
    } catch (error) {
      return redirectToSignIn({
        configuration,
        headers: authClient.responseHeaders,
        reason:
          error instanceof ApiHttpError && error.status === 401
            ? 'exchange_failed'
            : 'service_unavailable',
        requestId,
        returnTo,
      });
    }
  };
