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
import { readPlacementSession } from '@/server/learning/placement-repository';

import type { PlacementSessionReceipt } from '@ideogram/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

interface ReadPlacementSessionDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  read: (client: SupabaseClient, sessionId: string) => Promise<PlacementSessionReceipt>;
}

const defaults: ReadPlacementSessionDependencies = {
  authenticate: authenticateSupabaseRequest,
  read: readPlacementSession,
};

export const createGetPlacementSessionRoute =
  (dependencies: ReadPlacementSessionDependencies = defaults) =>
  async (request: Request, context: RouteContext): Promise<Response> => {
    const requestId = createRequestId();
    try {
      const authenticated = await dependencies.authenticate(request);
      const { sessionId } = await context.params;
      if (!z.uuid().safeParse(sessionId).success) {
        throw new ApiHttpError({
          code: 'INVALID_REQUEST',
          message: 'Mã phiên placement không hợp lệ.',
          status: 400,
        });
      }
      const receipt = await dependencies.read(authenticated.client, sessionId);
      return jsonNoStore(receipt, { headers: authenticated.responseHeaders, requestId });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };
