import {
  createEmailOtpAcceptedResponse,
  normalizeAuthEmailAddress,
  normalizeWebAuthReturnPath,
} from '@ideogram/contracts';

import {
  createSupabaseAuthRouteClient,
  type SupabaseAuthRouteClient,
} from '@/lib/supabase/auth-server-client';
import {
  readWebAuthRouteConfiguration,
  type WebAuthRouteConfiguration,
} from '@/lib/supabase/auth-route-config';
import { storeAuthReturnPath } from '@/lib/supabase/auth-return-path';
import {
  ApiHttpError,
  createApiErrorResponse,
  createRequestId,
  jsonNoStore,
} from '@/server/http/api-response';
import { readJsonMutationBody } from '@/server/http/mutation-policy';

import {
  defaultEmailOtpRateLimiter,
  readEmailOtpNetworkIdentity,
  type EmailOtpRateLimiter,
} from './email-otp-rate-limit';

type OtpSender = Pick<SupabaseAuthRouteClient['client']['auth'], 'signInWithOtp'>;

interface EmailOtpRouteDependencies {
  createClient: () => Promise<SupabaseAuthRouteClient>;
  readConfiguration: () => WebAuthRouteConfiguration;
  readBody: typeof readJsonMutationBody;
  rateLimiter?: EmailOtpRateLimiter;
  readNetworkIdentity?: typeof readEmailOtpNetworkIdentity;
}

const defaultDependencies: EmailOtpRouteDependencies = {
  createClient: createSupabaseAuthRouteClient,
  readBody: readJsonMutationBody,
  readConfiguration: readWebAuthRouteConfiguration,
  rateLimiter: defaultEmailOtpRateLimiter,
  readNetworkIdentity: readEmailOtpNetworkIdentity,
};

const invalidRequest = (message: string, status = 400): ApiHttpError =>
  new ApiHttpError({
    code: 'INVALID_REQUEST',
    message,
    status,
  });

const rateLimited = (retryAfterSeconds?: number): ApiHttpError =>
  new ApiHttpError({
    code: 'RATE_LIMITED',
    ...(retryAfterSeconds
      ? { headers: { 'Retry-After': String(Math.ceil(retryAfterSeconds)) } }
      : {}),
    message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
    status: 429,
  });

const serviceUnavailable = (): ApiHttpError =>
  new ApiHttpError({
    code: 'UNAVAILABLE',
    message: 'Dịch vụ xác thực tạm thời chưa sẵn sàng. Vui lòng thử lại.',
    status: 503,
  });

const otpConfigurationErrorCodes = new Set(['email_provider_disabled', 'otp_disabled']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseEmailOtpBody = (value: unknown) => {
  if (!isRecord(value)) {
    throw invalidRequest('Nội dung yêu cầu không hợp lệ.');
  }

  const keys = Object.keys(value);
  if (keys.some((key) => key !== 'email' && key !== 'returnTo')) {
    throw invalidRequest('Nội dung yêu cầu không hợp lệ.');
  }

  if (typeof value.email !== 'string') {
    throw invalidRequest('Email không hợp lệ.');
  }

  const returnToValue = value.returnTo;
  if (returnToValue !== undefined && typeof returnToValue !== 'string') {
    throw invalidRequest('Đường dẫn quay lại không hợp lệ.');
  }

  try {
    return {
      email: normalizeAuthEmailAddress(value.email),
      returnTo: normalizeWebAuthReturnPath(returnToValue),
    };
  } catch (error) {
    if (error instanceof TypeError) {
      const message = error.message.includes('returnTo')
        ? 'Đường dẫn quay lại không hợp lệ.'
        : 'Email không hợp lệ.';
      throw invalidRequest(message);
    }

    throw error;
  }
};

const readErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  const status = error.status;
  return typeof status === 'number' ? status : undefined;
};

const readErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined;
  }

  const code = error.code;
  return typeof code === 'string' ? code : undefined;
};

const sendEmailOtp = async ({
  callbackUrl,
  email,
  otpSender,
}: {
  callbackUrl: string;
  email: string;
  otpSender: OtpSender;
}): Promise<void> => {
  const { error } = await otpSender.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl,
      shouldCreateUser: false,
    },
  });

  if (!error) {
    return;
  }

  const status = readErrorStatus(error);
  if (status === 400 || status === 422) {
    const code = readErrorCode(error);
    if (code && otpConfigurationErrorCodes.has(code)) {
      console.error('Supabase email OTP is unavailable due to provider configuration.', {
        code,
        status,
      });
      throw serviceUnavailable();
    }

    return;
  }

  if (status === 429) {
    throw rateLimited();
  }

  throw serviceUnavailable();
};

export const createEmailOtpRoute =
  (dependencies: EmailOtpRouteDependencies = defaultDependencies) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();

    try {
      const configuration = dependencies.readConfiguration();
      const parsedBody = parseEmailOtpBody(
        await dependencies.readBody(request, {
          authenticationSource: 'cookie',
          trustedOrigin: configuration.trustedOrigin,
        }),
      );
      const rateLimitDecision = (dependencies.rateLimiter ?? defaultEmailOtpRateLimiter).consume({
        email: parsedBody.email,
        networkIdentity: (dependencies.readNetworkIdentity ?? readEmailOtpNetworkIdentity)(
          request,
          configuration.trustProxyIpHeaders === true,
        ),
      });
      if (!rateLimitDecision.allowed) {
        throw rateLimited(rateLimitDecision.retryAfterSeconds);
      }

      const authClient = await dependencies.createClient();

      await sendEmailOtp({
        callbackUrl: configuration.callbackUrl,
        email: parsedBody.email,
        otpSender: authClient.client.auth,
      });

      const flowId = authClient.pkceFlowIds.at(-1);
      storeAuthReturnPath({
        cookieStore: authClient.cookieStore,
        ...(flowId ? { flowId } : {}),
        isProduction: configuration.isProduction,
        returnTo: parsedBody.returnTo,
      });

      return jsonNoStore(createEmailOtpAcceptedResponse(), {
        headers: authClient.responseHeaders,
        requestId,
        status: 202,
      });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };
