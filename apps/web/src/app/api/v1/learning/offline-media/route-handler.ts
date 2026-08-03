import {
  authenticateSupabaseRequest,
  type AuthenticatedSupabaseRequest,
} from '@/lib/supabase/request-auth';
import { createApiErrorResponse, createRequestId, jsonNoStore } from '@/server/http/api-response';
import { readOfflineMediaManifest } from '@/server/learning/offline-media-manifest';

import type { OfflineMediaManifest } from '@ideogram/contracts';

export const runtime = 'nodejs';

interface OfflineMediaManifestRouteDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  readManifest: () => OfflineMediaManifest;
}

const defaults: OfflineMediaManifestRouteDependencies = {
  authenticate: authenticateSupabaseRequest,
  readManifest: readOfflineMediaManifest,
};

export const createGetOfflineMediaManifestRoute =
  (dependencies: OfflineMediaManifestRouteDependencies = defaults) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();
    try {
      const authenticated = await dependencies.authenticate(request);
      return jsonNoStore(dependencies.readManifest(), {
        headers: authenticated.responseHeaders,
        requestId,
      });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };
