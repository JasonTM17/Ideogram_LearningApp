import { reviewSubmissionInputSchema } from '@ideogram/contracts';

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
import { submitReviewEvent } from '@/server/learning/review-submission-repository';

export const runtime = 'nodejs';

interface ReviewSubmissionRouteDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  readBody: typeof readJsonMutationBody;
  readTrustedOrigin: () => string;
  submitReview: typeof submitReviewEvent;
}

const readTrustedOrigin = (): string =>
  parseTrustedWebOrigin(process.env.APP_ORIGIN, {
    allowLocalHttp: process.env.NODE_ENV !== 'production',
  });

const defaultDependencies: ReviewSubmissionRouteDependencies = {
  authenticate: authenticateSupabaseRequest,
  readBody: readJsonMutationBody,
  readTrustedOrigin,
  submitReview: submitReviewEvent,
};

export const createPostReviewSubmissionRoute =
  (dependencies: ReviewSubmissionRouteDependencies = defaultDependencies) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();

    try {
      const authenticatedRequest = await dependencies.authenticate(request);
      const parsedInput = reviewSubmissionInputSchema.safeParse(
        await dependencies.readBody(request, {
          authenticationSource: authenticatedRequest.source,
          trustedOrigin: dependencies.readTrustedOrigin(),
        }),
      );
      if (!parsedInput.success) {
        throw new ApiHttpError({
          code: 'INVALID_REQUEST',
          message: 'Dữ liệu ôn tập không hợp lệ.',
          status: 400,
        });
      }
      const receipt = await dependencies.submitReview({
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

export const POST = createPostReviewSubmissionRoute();
