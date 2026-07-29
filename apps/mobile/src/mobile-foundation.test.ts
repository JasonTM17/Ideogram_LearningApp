import { describe, expect, it } from 'vitest';

import { betaMinimumOsMajor, isBetaOsSupported, mobileFoundation } from './mobile-foundation';

describe('mobileFoundation', () => {
  it('identifies the mobile shell as an internal beta instead of a released product', () => {
    expect(mobileFoundation.stage).toBe('Internal beta foundation');
  });

  it.each([
    ['android', betaMinimumOsMajor.android, true],
    ['android', betaMinimumOsMajor.android - 1, false],
    ['ios', betaMinimumOsMajor.ios, true],
    ['ios', betaMinimumOsMajor.ios - 1, false],
    ['ios', 17.5, false],
  ] as const)('validates the beta support boundary for %s %s', (platform, version, expected) => {
    expect(isBetaOsSupported(platform, version)).toBe(expected);
  });
});
