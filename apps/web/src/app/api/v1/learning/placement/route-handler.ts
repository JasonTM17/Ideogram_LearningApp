import {
  authenticateSupabaseRequest,
  type AuthenticatedSupabaseRequest,
} from '@/lib/supabase/request-auth';
import { createApiErrorResponse, createRequestId, jsonNoStore } from '@/server/http/api-response';
import { readPlacementCatalog } from '@/server/learning/placement-repository';

import type { PlacementCatalogResponse } from '@ideogram/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

interface PlacementCatalogDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  readCatalog: (client: SupabaseClient) => Promise<PlacementCatalogResponse>;
}

const defaults: PlacementCatalogDependencies = {
  authenticate: authenticateSupabaseRequest,
  readCatalog: readPlacementCatalog,
};

export const createGetPlacementCatalogRoute =
  (dependencies: PlacementCatalogDependencies = defaults) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();
    try {
      const authenticated = await dependencies.authenticate(request);
      const catalog = await dependencies.readCatalog(authenticated.client);
      return jsonNoStore(catalog, {
        headers: authenticated.responseHeaders,
        requestId,
      });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };
