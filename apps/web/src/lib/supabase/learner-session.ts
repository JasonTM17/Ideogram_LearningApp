import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  AuthenticationServiceError,
  RequestAuthenticationError,
  requireAuthenticatedUser,
} from './request-auth';
import { readSupabasePublicConfiguration } from './environment';
import { hardenSessionCookieOptions } from './session-cookie';

import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface LearnerPageSession {
  client: SupabaseClient;
  user: User;
}

export class LearnerAccountUnavailableError extends RequestAuthenticationError {
  constructor() {
    super();
    this.name = 'LearnerAccountUnavailableError';
  }
}

interface ProfileAccessRow {
  account_state: unknown;
  revoked_at: unknown;
}

interface AccountRoleAccessRow {
  role: unknown;
  revoked_at: unknown;
}

const isActiveProfileRow = (profile: unknown): boolean => {
  const profileRow = profile as ProfileAccessRow | null;
  return profileRow?.account_state === 'active' && profileRow.revoked_at === null;
};

const isActiveLearnerRoleRow = (learnerRole: unknown): boolean => {
  const roleRow = learnerRole as AccountRoleAccessRow | null;
  return roleRow?.role === 'learner' && roleRow.revoked_at === null;
};

export const hasActiveLearnerAccess = ({
  profile,
  learnerRole,
}: {
  learnerRole: unknown;
  profile: unknown;
}): boolean => isActiveProfileRow(profile) && isActiveLearnerRoleRow(learnerRole);

const createLearnerServerClient = async (): Promise<SupabaseClient> => {
  const configuration = readSupabasePublicConfiguration();
  const cookieStore = await cookies();

  return createServerClient(configuration.url, configuration.publishableKey, {
    cookies: {
      encode: 'tokens-only',
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, options, value } of cookiesToSet) {
            cookieStore.set(name, value, hardenSessionCookieOptions(options));
          }
        } catch {
          // Server Components cannot write cookies. The request Proxy owns refresh writes.
        }
      },
    },
  });
};

export const requireActiveLearnerAccess = async (
  client: SupabaseClient,
  userId: string,
): Promise<void> => {
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('account_state, revoked_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    throw new AuthenticationServiceError();
  }
  if (!isActiveProfileRow(profile)) {
    throw new LearnerAccountUnavailableError();
  }

  const { data: learnerRole, error: roleError } = await client
    .from('account_roles')
    .select('role, revoked_at')
    .eq('user_id', userId)
    .eq('role', 'learner')
    .is('revoked_at', null)
    .maybeSingle();

  if (roleError) {
    throw new AuthenticationServiceError();
  }

  if (!hasActiveLearnerAccess({ learnerRole, profile })) {
    throw new LearnerAccountUnavailableError();
  }
};

export const requireLearnerPageSession = async (returnTo: string): Promise<LearnerPageSession> => {
  const client = await createLearnerServerClient();
  const { data, error } = await client.auth.getUser();

  try {
    const user = requireAuthenticatedUser(data.user, error);
    await requireActiveLearnerAccess(client, user.id);

    return {
      client,
      user,
    };
  } catch (authenticationError) {
    if (authenticationError instanceof RequestAuthenticationError) {
      const reason =
        authenticationError instanceof LearnerAccountUnavailableError
          ? '&reason=account_unavailable'
          : '';
      redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}${reason}`);
    }

    throw authenticationError;
  }
};
