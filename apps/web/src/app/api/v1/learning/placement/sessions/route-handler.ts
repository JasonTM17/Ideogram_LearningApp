import { placementSessionStartInputSchema } from '@ideogram/contracts';

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
import { startPlacementSession } from '@/server/learning/placement-repository';

interface StartPlacementDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  readBody: typeof readJsonMutationBody;
  readTrustedOrigin: () => string;
  start: typeof startPlacementSession;
}

const readTrustedOrigin = (): string =>
  parseTrustedWebOrigin(process.env.APP_ORIGIN, {
    allowLocalHttp: process.env.NODE_ENV !== 'production',
  });

const defaults: StartPlacementDependencies = {
  authenticate: authenticateSupabaseRequest,
  readBody: readJsonMutationBody,
  readTrustedOrigin,
  start: startPlacementSession,
};

export const createPostPlacementSessionRoute =
  (dependencies: StartPlacementDependencies = defaults) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();
    try {
      const authenticated = await dependencies.authenticate(request);
      const input = placementSessionStartInputSchema.safeParse(
        await dependencies.readBody(request, {
          authenticationSource: authenticated.source,
          trustedOrigin: dependencies.readTrustedOrigin(),
        }),
      );
      if (!input.success) {
        throw new ApiHttpError({
          code: 'INVALID_REQUEST',
          message: 'Dữ liệu bắt đầu placement không hợp lệ.',
          status: 400,
        });
      }
      const receipt = await dependencies.start({ ...input.data, userId: authenticated.user.id });
      return jsonNoStore(receipt, { headers: authenticated.responseHeaders, requestId });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };
