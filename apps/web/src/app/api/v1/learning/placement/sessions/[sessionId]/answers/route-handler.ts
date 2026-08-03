import { placementAnswerInputSchema } from '@ideogram/contracts';

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
import { recordPlacementAnswer } from '@/server/learning/placement-repository';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

interface RecordPlacementAnswerDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  readBody: typeof readJsonMutationBody;
  readTrustedOrigin: () => string;
  record: typeof recordPlacementAnswer;
}

const readTrustedOrigin = (): string =>
  parseTrustedWebOrigin(process.env.APP_ORIGIN, {
    allowLocalHttp: process.env.NODE_ENV !== 'production',
  });

const defaults: RecordPlacementAnswerDependencies = {
  authenticate: authenticateSupabaseRequest,
  readBody: readJsonMutationBody,
  readTrustedOrigin,
  record: recordPlacementAnswer,
};

export const createPostPlacementAnswerRoute =
  (dependencies: RecordPlacementAnswerDependencies = defaults) =>
  async (request: Request, context: RouteContext): Promise<Response> => {
    const requestId = createRequestId();
    try {
      const authenticated = await dependencies.authenticate(request);
      const input = placementAnswerInputSchema.safeParse(
        await dependencies.readBody(request, {
          authenticationSource: authenticated.source,
          trustedOrigin: dependencies.readTrustedOrigin(),
        }),
      );
      const { sessionId } = await context.params;
      if (!input.success) {
        throw new ApiHttpError({
          code: 'INVALID_REQUEST',
          message: 'Dữ liệu câu trả lời placement không hợp lệ.',
          status: 400,
        });
      }
      const receipt = await dependencies.record({
        ...input.data,
        placementSessionId: sessionId,
        userId: authenticated.user.id,
      });
      return jsonNoStore(receipt, { headers: authenticated.responseHeaders, requestId });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };
