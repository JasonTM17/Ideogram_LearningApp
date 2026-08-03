import { describe, expect, it } from 'vitest';

import { matchesExpectedSha256, toHexChecksum } from './offline-media-checksum';

describe('native offline media checksum', () => {
  it('serializes an exact checksum from native digest bytes', () => {
    expect(toHexChecksum(new Uint8Array([186, 120, 22, 191]).buffer)).toBe('ba7816bf');
  });

  it('rejects a changed checksum before a download is promoted', () => {
    expect(matchesExpectedSha256('ba7816bf', 'a'.repeat(64))).toBe(false);
  });
});
