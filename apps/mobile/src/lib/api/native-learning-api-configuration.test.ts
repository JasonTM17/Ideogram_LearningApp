import { describe, expect, it } from 'vitest';

import {
  NativeLearningApiConfigurationError,
  readNativeLearningApiConfiguration,
} from './native-learning-api-configuration';

describe('readNativeLearningApiConfiguration', () => {
  it('reads a canonical HTTPS API origin for a production build', () => {
    expect(
      readNativeLearningApiConfiguration(
        { EXPO_PUBLIC_API_ORIGIN: 'https://api.example.com/' },
        false,
      ),
    ).toEqual({ allowHttpLoopback: false, apiOrigin: 'https://api.example.com' });
  });

  it('allows a loopback HTTP origin only for development', () => {
    expect(
      readNativeLearningApiConfiguration({ EXPO_PUBLIC_API_ORIGIN: 'http://127.0.0.1:3000' }, true),
    ).toEqual({ allowHttpLoopback: true, apiOrigin: 'http://127.0.0.1:3000' });

    expect(() =>
      readNativeLearningApiConfiguration(
        { EXPO_PUBLIC_API_ORIGIN: 'http://127.0.0.1:3000' },
        false,
      ),
    ).toThrow(NativeLearningApiConfigurationError);
  });

  it.each([
    undefined,
    'https://api.example.com/v1',
    'https://user:password@api.example.com',
    'https://api.example.com?mode=test',
  ])('rejects an unsafe or incomplete API origin: %s', (apiOrigin) => {
    expect(() =>
      readNativeLearningApiConfiguration({ EXPO_PUBLIC_API_ORIGIN: apiOrigin }, false),
    ).toThrow(NativeLearningApiConfigurationError);
  });
});
