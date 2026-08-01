import {
  calculateTutorTurnCostMicrousd,
  createDeepSeekTutorGateway,
  DeepSeekRequestTimeoutError,
  DeepSeekTutorGatewayError,
  readDeepSeekTutorConfiguration,
  type DeepSeekTutorConfiguration,
  type DeepSeekTutorGateway,
} from '@ideogram/ai';
import { tutorTurnRequestSchema, type TutorTurnRequest } from '@ideogram/contracts';

import {
  authenticateSupabaseRequest,
  type AuthenticatedSupabaseRequest,
} from '@/lib/supabase/request-auth';
import {
  ApiHttpError,
  createApiErrorResponse,
  createRequestId,
  jsonNoStore,
} from '@/server/http/api-response';
import { parseTrustedWebOrigin, readJsonMutationBody } from '@/server/http/mutation-policy';
import {
  beginTutorTurn,
  completeTutorTurn,
  failTutorTurn,
  readTutorTurnReplay,
  type TutorTurnReservation,
} from '@/server/ai/tutor-turn-repository';

export const runtime = 'nodejs';

export interface TutorTurnRouteDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  beginTurn: typeof beginTutorTurn;
  calculateCost: typeof calculateTutorTurnCostMicrousd;
  completeTurn: typeof completeTutorTurn;
  createGateway: (configuration: DeepSeekTutorConfiguration) => DeepSeekTutorGateway;
  failTurn: typeof failTutorTurn;
  readBody: typeof readJsonMutationBody;
  readReplay: typeof readTutorTurnReplay;
  readConfiguration: () => DeepSeekTutorConfiguration;
  readTrustedOrigin: () => string;
}

const readTrustedOrigin = (): string =>
  parseTrustedWebOrigin(process.env.APP_ORIGIN, {
    allowLocalHttp: process.env.NODE_ENV !== 'production',
  });

const readTutorConfiguration = (): DeepSeekTutorConfiguration => {
  if (process.env.AI_TUTOR_ENABLED !== 'true') {
    throw new ApiHttpError({
      code: 'UNAVAILABLE',
      message: 'Gia sư AI chưa được bật cho môi trường này.',
      status: 503,
    });
  }

  const configuration = readDeepSeekTutorConfiguration();
  if (!configuration.enabled) {
    throw new ApiHttpError({
      code: 'UNAVAILABLE',
      message: 'Gia sư AI chưa được bật cho môi trường này.',
      status: 503,
    });
  }
  return configuration;
};

const configurationVersion = (configuration: DeepSeekTutorConfiguration): string =>
  `${configuration.model}:${configuration.reasoningEffort}:${configuration.thinkingMode}`;

const classifyProviderFailure = (error: unknown): string => {
  if (error instanceof DeepSeekRequestTimeoutError) return 'provider_timeout';
  if (error instanceof DOMException && error.name === 'AbortError') return 'provider_cancelled';
  if (error instanceof DeepSeekTutorGatewayError) return 'provider_unavailable';
  return 'provider_failed';
};

const providerUnavailable = (): ApiHttpError =>
  new ApiHttpError({
    code: 'UNAVAILABLE',
    message: 'Gia sư AI tạm thời chưa trả lời được. Vui lòng thử lại sau.',
    status: 503,
  });

const defaultDependencies: TutorTurnRouteDependencies = {
  authenticate: authenticateSupabaseRequest,
  beginTurn: beginTutorTurn,
  calculateCost: calculateTutorTurnCostMicrousd,
  completeTurn: completeTutorTurn,
  createGateway: (configuration) =>
    createDeepSeekTutorGateway({
      configuration,
      fetch: (input, init) => globalThis.fetch(input, init),
    }),
  failTurn: failTutorTurn,
  readBody: readJsonMutationBody,
  readReplay: readTutorTurnReplay,
  readConfiguration: readTutorConfiguration,
  readTrustedOrigin,
};

const readTutorRequest = (value: unknown): TutorTurnRequest => {
  const parsed = tutorTurnRequestSchema.safeParse(value);
  if (!parsed.success) {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Dữ liệu lượt gia sư không hợp lệ.',
      status: 400,
    });
  }
  return parsed.data;
};

const markTutorTurnFailed = async (
  dependencies: TutorTurnRouteDependencies,
  reservation: TutorTurnReservation,
  request: TutorTurnRequest,
  requestId: string,
  userId: string,
  errorCode: string,
): Promise<void> => {
  try {
    await dependencies.failTurn({
      conversationId: reservation.conversationId,
      errorCode,
      leaseToken: reservation.leaseToken,
      request,
      userId,
    });
  } catch {
    console.error('AI tutor failure transition was not persisted.', {
      errorCode,
      requestId,
      turnId: request.turnId,
    });
  }
};

export const createPostTutorTurnRoute =
  (dependencies: TutorTurnRouteDependencies = defaultDependencies) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();
    let parsedRequest: TutorTurnRequest | undefined;
    let reservation: TutorTurnReservation | undefined;
    let userId: string | undefined;

    try {
      const authenticatedRequest = await dependencies.authenticate(request);
      userId = authenticatedRequest.user.id;
      parsedRequest = readTutorRequest(
        await dependencies.readBody(request, {
          authenticationSource: authenticatedRequest.source,
          trustedOrigin: dependencies.readTrustedOrigin(),
        }),
      );
      const replay = await dependencies.readReplay({ request: parsedRequest, userId });
      if (replay) {
        return jsonNoStore(replay, {
          headers: authenticatedRequest.responseHeaders,
          requestId,
        });
      }

      const configuration = dependencies.readConfiguration();

      reservation = await dependencies.beginTurn({
        consentPolicyKey: configuration.consentPolicyKey,
        request: parsedRequest,
        userId,
      });

      if (reservation.receipt) {
        return jsonNoStore(reservation.receipt, {
          headers: authenticatedRequest.responseHeaders,
          requestId,
        });
      }
      if (reservation.state !== 'pending') {
        throw new ApiHttpError({
          code: 'RATE_LIMITED',
          headers: { 'Retry-After': '30' },
          message: 'Lượt gia sư chưa sẵn sàng để xử lý. Vui lòng thử lại sau.',
          status: 429,
        });
      }

      const gateway = dependencies.createGateway(configuration);
      let providerResult: Awaited<ReturnType<DeepSeekTutorGateway['respond']>>;
      try {
        providerResult = await gateway.respond(parsedRequest, {
          signal: request.signal,
        });
      } catch (error) {
        await markTutorTurnFailed(
          dependencies,
          reservation,
          parsedRequest,
          requestId,
          userId,
          classifyProviderFailure(error),
        );
        throw providerUnavailable();
      }

      try {
        const receipt = await dependencies.completeTurn({
          configurationVersion: configurationVersion(configuration),
          conversationId: reservation.conversationId,
          estimatedCostMicrousd: dependencies.calculateCost({
            configuration,
            usage: providerResult.usage,
          }),
          leaseToken: reservation.leaseToken,
          providerModel: configuration.model,
          request: parsedRequest,
          response: providerResult.response,
          usage: providerResult.usage,
          userId,
        });

        return jsonNoStore(receipt, {
          headers: authenticatedRequest.responseHeaders,
          requestId,
        });
      } catch (error) {
        await markTutorTurnFailed(
          dependencies,
          reservation,
          parsedRequest,
          requestId,
          userId,
          'completion_failed',
        );
        throw error;
      }
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };

export const POST = createPostTutorTurnRoute();
