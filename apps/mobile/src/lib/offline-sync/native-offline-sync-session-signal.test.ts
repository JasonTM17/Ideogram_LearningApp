import { describe, expect, it } from 'vitest';

import {
  invalidateNativeOfflineSyncRequests,
  updateNativeOfflineSyncRequestNamespace,
} from './native-offline-sync-session-signal';

const accountA = {
  sessionEpoch: 1,
  userId: '123e4567-e89b-42d3-a456-426614174000',
};
const accountB = {
  sessionEpoch: 2,
  userId: '123e4567-e89b-42d3-a456-426614174001',
};

describe('native offline sync session signal', () => {
  it('aborts an active background request when the namespace changes', () => {
    const signalA = updateNativeOfflineSyncRequestNamespace(accountA);

    const signalB = updateNativeOfflineSyncRequestNamespace(accountB);

    expect(signalA.aborted).toBe(true);
    expect(signalB.aborted).toBe(false);
  });

  it('keeps the signal stable while the namespace identity is unchanged', () => {
    const first = updateNativeOfflineSyncRequestNamespace(accountA);

    const second = updateNativeOfflineSyncRequestNamespace(accountA);

    expect(first).toBe(second);
    expect(second.aborted).toBe(false);
  });

  it('aborts active work immediately on logout invalidation', () => {
    const active = updateNativeOfflineSyncRequestNamespace(accountA);

    invalidateNativeOfflineSyncRequests();

    expect(active.aborted).toBe(true);
  });
});
