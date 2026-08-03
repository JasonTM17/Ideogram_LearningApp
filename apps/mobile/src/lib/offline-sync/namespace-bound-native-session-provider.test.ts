import { describe, expect, it } from 'vitest';

import { bindNativeSessionProviderToNamespace } from './namespace-bound-native-session-provider';

import type { NativeApiSession } from '@ideogram/api-client/native';

const session: NativeApiSession = {
  accessToken: 'local-test-token',
  sessionEpoch: 4,
  userId: '123e4567-e89b-42d3-a456-426614174000',
};

describe('namespace-bound native session provider', () => {
  it('returns a session only while it owns the queue namespace', async () => {
    const provider = bindNativeSessionProviderToNamespace(async () => session, session);

    await expect(provider()).resolves.toEqual(session);
  });

  it('rejects an account or session switch before transport can use the new token', async () => {
    const provider = bindNativeSessionProviderToNamespace(
      async () => ({ ...session, sessionEpoch: 5 }),
      session,
    );

    await expect(provider()).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
  });
});
