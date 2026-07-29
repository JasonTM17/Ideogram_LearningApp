import { describe, expect, it } from 'vitest';

import { parseProfilePreferencesInput } from './profile-contract';

describe('profile preferences contract', () => {
  it('normalizes the learner-controlled preference fields only', () => {
    expect(
      parseProfilePreferencesInput({
        displayName: '  Minh  ',
        preferredUiLocale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
      }),
    ).toEqual({
      displayName: 'Minh',
      preferredUiLocale: 'vi-VN',
      timezone: 'Asia/Ho_Chi_Minh',
    });
  });

  it('rejects unsupported locale changes before they reach the profile boundary', () => {
    expect(() =>
      parseProfilePreferencesInput({
        preferredUiLocale: 'ja-JP',
        timezone: 'Asia/Ho_Chi_Minh',
      }),
    ).toThrow(TypeError);
  });

  it('rejects timezone strings that are not recognized IANA identifiers', () => {
    expect(() =>
      parseProfilePreferencesInput({
        preferredUiLocale: 'vi-VN',
        timezone: 'Not/A_Timezone',
      }),
    ).toThrow(TypeError);
  });
});
