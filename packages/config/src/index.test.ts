import { describe, expect, it } from 'vitest';

import { isPlatformRuntimeName, platformRuntimeNames } from './index';

describe('platform runtime names', () => {
  it.each(platformRuntimeNames)('accepts the supported %s runtime', (runtimeName) => {
    expect(isPlatformRuntimeName(runtimeName)).toBe(true);
  });

  it.each(['api', 'browser', '', 'WEB'])('rejects unsupported runtime name %j', (runtimeName) => {
    expect(isPlatformRuntimeName(runtimeName)).toBe(false);
  });
});
