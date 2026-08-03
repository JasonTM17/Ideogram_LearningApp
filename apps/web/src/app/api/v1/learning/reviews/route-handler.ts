import {
  authenticateSupabaseRequest,
  type AuthenticatedSupabaseRequest,
} from '@/lib/supabase/request-auth';
import { createApiErrorResponse, createRequestId, jsonNoStore } from '@/server/http/api-response';
import { readLearnerReviewQueue } from '@/server/learning/review-queue-repository';

import type { ReviewQueueResponse } from '@ideogram/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

interface LearnerReviewQueueRouteDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  readReviewQueue: (client: SupabaseClient) => Promise<ReviewQueueResponse>;
}

const defaultDependencies: LearnerReviewQueueRouteDependencies = {
  authenticate: authenticateSupabaseRequest,
  readReviewQueue: readLearnerReviewQueue,
};

export const createGetLearnerReviewQueueRoute =
  (dependencies: LearnerReviewQueueRouteDependencies = defaultDependencies) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();

    try {
      const authenticatedRequest = await dependencies.authenticate(request);
      const queue = await dependencies.readReviewQueue(authenticatedRequest.client);

      return jsonNoStore(queue, {
        headers: authenticatedRequest.responseHeaders,
        requestId,
      });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };
