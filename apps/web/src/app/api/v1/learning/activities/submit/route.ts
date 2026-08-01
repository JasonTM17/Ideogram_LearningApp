import { activityAttemptInputSchema } from '@ideogram/contracts';

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
import { submitActivityAttempt } from '@/server/learning/activity-submission-repository';

export const runtime = 'nodejs';

interface ActivitySubmissionRouteDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  readBody: typeof readJsonMutationBody;
  readTrustedOrigin: () => string;
  submitActivity: typeof submitActivityAttempt;
}

const readTrustedOrigin = (): string =>
  parseTrustedWebOrigin(process.env.APP_ORIGIN, {
    allowLocalHttp: process.env.NODE_ENV !== 'production',
  });

const defaultDependencies: ActivitySubmissionRouteDependencies = {
  authenticate: authenticateSupabaseRequest,
  readBody: readJsonMutationBody,
  readTrustedOrigin,
  submitActivity: submitActivityAttempt,
};

export const createPostActivitySubmissionRoute =
  (dependencies: ActivitySubmissionRouteDependencies = defaultDependencies) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();

    try {
      const authenticatedRequest = await dependencies.authenticate(request);
      const parsedInput = activityAttemptInputSchema.safeParse(
        await dependencies.readBody(request, {
          authenticationSource: authenticatedRequest.source,
          trustedOrigin: dependencies.readTrustedOrigin(),
        }),
      );
      if (!parsedInput.success) {
        throw new ApiHttpError({
          code: 'INVALID_REQUEST',
          message: 'Dữ liệu trả lời hoạt động không hợp lệ.',
          status: 400,
        });
      }
      const receipt = await dependencies.submitActivity({
        input: parsedInput.data,
        userId: authenticatedRequest.user.id,
      });

      return jsonNoStore(receipt, {
        headers: authenticatedRequest.responseHeaders,
        requestId,
      });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };

export const POST = createPostActivitySubmissionRoute();
