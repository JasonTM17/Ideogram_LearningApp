import { describe, expect, it } from 'vitest';

import { NativeApiCallerAbortError, NativeApiHttpError } from '@ideogram/api-client/native';

import { isRetryableNativeOfflineSyncError } from './native-offline-sync-drain';

describe('native offline sync retry classification', () => {
  it('preserves caller-aborted mutations for a later session-safe retry', () => {
    expect(isRetryableNativeOfflineSyncError(new NativeApiCallerAbortError())).toBe(true);
  });

  it('does not retry permanent API failures', () => {
    expect(isRetryableNativeOfflineSyncError(new NativeApiHttpError(403))).toBe(false);
  });
});
