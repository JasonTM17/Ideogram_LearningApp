import { placementSessionReceiptSchema } from '@ideogram/contracts';
import { z } from 'zod';

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
import { submitPlacementSession } from '@/server/learning/placement-repository';

export const runtime = 'nodejs';
const emptySubmitBodySchema = z.object({}).strict();

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

interface SubmitPlacementDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  readBody: typeof readJsonMutationBody;
  readTrustedOrigin: () => string;
  submit: typeof submitPlacementSession;
}

const readTrustedOrigin = (): string =>
  parseTrustedWebOrigin(process.env.APP_ORIGIN, {
    allowLocalHttp: process.env.NODE_ENV !== 'production',
  });

const defaults: SubmitPlacementDependencies = {
  authenticate: authenticateSupabaseRequest,
  readBody: readJsonMutationBody,
  readTrustedOrigin,
  submit: submitPlacementSession,
};

export const createPostPlacementSubmitRoute =
  (dependencies: SubmitPlacementDependencies = defaults) =>
  async (request: Request, context: RouteContext): Promise<Response> => {
    const requestId = createRequestId();
    try {
      const authenticated = await dependencies.authenticate(request);
      const body = emptySubmitBodySchema.safeParse(
        await dependencies.readBody(request, {
          authenticationSource: authenticated.source,
          trustedOrigin: dependencies.readTrustedOrigin(),
        }),
      );
      if (!body.success) {
        throw new ApiHttpError({
          code: 'INVALID_REQUEST',
          message: 'Dữ liệu hoàn tất placement không hợp lệ.',
          status: 400,
        });
      }
      const { sessionId } = await context.params;
      const receipt = await dependencies.submit({
        placementSessionId: sessionId,
        userId: authenticated.user.id,
      });
      return jsonNoStore(placementSessionReceiptSchema.parse(receipt), {
        headers: authenticated.responseHeaders,
        requestId,
      });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };
