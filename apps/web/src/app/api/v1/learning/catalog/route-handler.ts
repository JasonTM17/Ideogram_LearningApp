import {
  authenticateSupabaseRequest,
  type AuthenticatedSupabaseRequest,
} from '@/lib/supabase/request-auth';
import { createApiErrorResponse, createRequestId, jsonNoStore } from '@/server/http/api-response';
import { readLearnerCatalog } from '@/server/learning/learner-catalog-repository';

import type { LearnerCatalogResponse } from '@ideogram/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

interface LearnerCatalogRouteDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  readCatalog: (client: SupabaseClient) => Promise<LearnerCatalogResponse>;
}

const defaultDependencies: LearnerCatalogRouteDependencies = {
  authenticate: authenticateSupabaseRequest,
  readCatalog: readLearnerCatalog,
};

export const createGetLearnerCatalogRoute =
  (dependencies: LearnerCatalogRouteDependencies = defaultDependencies) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();

    try {
      const authenticatedRequest = await dependencies.authenticate(request);
      const catalog = await dependencies.readCatalog(authenticatedRequest.client);

      return jsonNoStore(catalog, {
        headers: authenticatedRequest.responseHeaders,
        requestId,
      });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };
