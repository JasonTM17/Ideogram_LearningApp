import { beforeEach, describe, expect, it, vi } from 'vitest';

import { syncQueueSnapshotSchema } from '@ideogram/contracts';

import {
  createExpoSecureSyncStorage,
  createNativeOfflineSyncQueueKey,
} from './expo-secure-sync-storage';

import type { SyncNamespace } from '@ideogram/contracts';

const secureValues = vi.hoisted(() => new Map<string, string>());

vi.mock('../secure-session/expo-secure-session-storage', () => ({
  createExpoSecureSessionStorage: () => ({
    getItem: vi.fn(async (key: string) => secureValues.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => {
      secureValues.delete(key);
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      secureValues.set(key, value);
    }),
  }),
}));

const namespace = (suffix: string): SyncNamespace => ({
  sessionEpoch: 4,
  userId: `123e4567-e89b-42d3-a456-4266141740${suffix}`,
});

const snapshotFor = (owner: SyncNamespace) =>
  JSON.stringify(syncQueueSnapshotSchema.parse({ mutations: [], namespace: owner }));

describe('Expo secure sync storage', () => {
  beforeEach(() => secureValues.clear());

  it('marks adapters as shared and isolates queue keys by session namespace', () => {
    const first = namespace('00');
    const second = { ...first, sessionEpoch: first.sessionEpoch + 1 };

    expect(createExpoSecureSyncStorage(first).shared).toBe(true);
    expect(createNativeOfflineSyncQueueKey(first)).not.toBe(
      createNativeOfflineSyncQueueKey(second),
    );
  });

  it('migrates an owned v1 queue before reading the v2 namespace key', async () => {
    const owner = namespace('01');
    const serialized = snapshotFor(owner);
    secureValues.set('offline-sync-queue-v1', serialized);

    await expect(createExpoSecureSyncStorage(owner).read()).resolves.toBe(serialized);
    expect(secureValues.has('offline-sync-queue-v1')).toBe(false);
    expect(secureValues.get(createNativeOfflineSyncQueueKey(owner))).toBe(serialized);
  });

  it('removes a legacy queue owned by a superseded namespace', async () => {
    const previous = namespace('02');
    const current = namespace('03');
    secureValues.set('offline-sync-queue-v1', snapshotFor(previous));

    await expect(createExpoSecureSyncStorage(current).read()).resolves.toBeNull();
    expect(secureValues.has('offline-sync-queue-v1')).toBe(false);
    expect(secureValues.has(createNativeOfflineSyncQueueKey(current))).toBe(false);
  });

  it('replaces corrupt v2 bytes with the valid owned legacy queue', async () => {
    const owner = namespace('04');
    const legacy = snapshotFor(owner);
    secureValues.set('offline-sync-queue-v1', legacy);
    secureValues.set(createNativeOfflineSyncQueueKey(owner), 'corrupt-v2');

    await expect(createExpoSecureSyncStorage(owner).read()).resolves.toBe(legacy);
    expect(secureValues.has('offline-sync-queue-v1')).toBe(false);
  });

  it('keeps an existing valid v2 snapshot when a duplicate legacy value remains', async () => {
    const owner = namespace('05');
    const legacy = snapshotFor(owner);
    const current = JSON.stringify(JSON.parse(legacy), null, 2);
    secureValues.set('offline-sync-queue-v1', legacy);
    secureValues.set(createNativeOfflineSyncQueueKey(owner), current);

    await expect(createExpoSecureSyncStorage(owner).read()).resolves.toBe(current);
  });
});
