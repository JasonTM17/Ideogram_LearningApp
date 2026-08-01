import { describe, expect, it } from 'vitest';

import { isTutorLanguageAvailable, tutorLanguageAvailability } from './tutor-language-availability';

describe('tutor language availability', () => {
  it('exposes Japanese as the only selectable tutor pack in the current release', () => {
    expect(tutorLanguageAvailability).toEqual({ ja: true, ko: false, zh: false });
    expect(isTutorLanguageAvailable('ja')).toBe(true);
    expect(isTutorLanguageAvailable('zh')).toBe(false);
    expect(isTutorLanguageAvailable('ko')).toBe(false);
  });
});
