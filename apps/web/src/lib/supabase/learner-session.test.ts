import { describe, expect, it, vi } from 'vitest';

import {
  LearnerAccountUnavailableError,
  hasActiveLearnerAccess,
  requireActiveLearnerAccess,
} from './learner-session';
import { AuthenticationServiceError } from './request-auth';

import type { SupabaseClient } from '@supabase/supabase-js';

const createQuery = (result: { data: unknown; error: unknown }) => {
  const query = {
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    select: vi.fn(),
  };
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return query;
};

const createAccessClient = ({
  learnerRole = { role: 'learner', revoked_at: null },
  profile = { account_state: 'active', revoked_at: null },
  profileError = null,
  roleError = null,
}: {
  learnerRole?: unknown;
  profile?: unknown;
  profileError?: unknown;
  roleError?: unknown;
} = {}) => {
  const profileQuery = createQuery({ data: profile, error: profileError });
  const roleQuery = createQuery({ data: learnerRole, error: roleError });
  const from = vi.fn((table: string) => (table === 'profiles' ? profileQuery : roleQuery));

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    profileQuery,
    roleQuery,
  };
};

describe('learner session access policy', () => {
  const activeProfile = { account_state: 'active', revoked_at: null };
  const activeLearnerRole = { role: 'learner', revoked_at: null };

  it('accepts an active profile with an active learner role', () => {
    expect(
      hasActiveLearnerAccess({
        learnerRole: activeLearnerRole,
        profile: activeProfile,
      }),
    ).toBe(true);
  });

  it.each([
    [{ account_state: 'frozen', revoked_at: '2026-07-30T00:00:00Z' }, activeLearnerRole],
    [{ account_state: 'pending_deletion', revoked_at: '2026-07-30T00:00:00Z' }, activeLearnerRole],
    [activeProfile, { role: 'learner', revoked_at: '2026-07-30T00:00:00Z' }],
    [activeProfile, { role: 'admin', revoked_at: null }],
    [activeProfile, null],
  ])('rejects stale, revoked, wrong-role, or missing access: %o / %o', (profile, learnerRole) => {
    expect(hasActiveLearnerAccess({ learnerRole, profile })).toBe(false);
  });

  it('verifies the current profile and learner role from the database', async () => {
    const { client, from } = createAccessClient();

    await expect(
      requireActiveLearnerAccess(client, '00000000-0000-4000-8000-000000000001'),
    ).resolves.toBeUndefined();
    expect(from).toHaveBeenNthCalledWith(1, 'profiles');
    expect(from).toHaveBeenNthCalledWith(2, 'account_roles');
  });

  it('denies a frozen profile before reading roles', async () => {
    const { client, from } = createAccessClient({
      profile: { account_state: 'frozen', revoked_at: '2026-07-30T00:00:00Z' },
    });

    await expect(
      requireActiveLearnerAccess(client, '00000000-0000-4000-8000-000000000001'),
    ).rejects.toBeInstanceOf(LearnerAccountUnavailableError);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('denies a missing or revoked learner role', async () => {
    const { client } = createAccessClient({ learnerRole: null });

    await expect(
      requireActiveLearnerAccess(client, '00000000-0000-4000-8000-000000000001'),
    ).rejects.toBeInstanceOf(LearnerAccountUnavailableError);
  });

  it('distinguishes a profile lookup outage from an unavailable account', async () => {
    const { client } = createAccessClient({ profileError: { code: 'UPSTREAM_TIMEOUT' } });

    await expect(
      requireActiveLearnerAccess(client, '00000000-0000-4000-8000-000000000001'),
    ).rejects.toBeInstanceOf(AuthenticationServiceError);
  });
});
