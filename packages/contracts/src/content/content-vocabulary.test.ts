import { describe, expect, it } from 'vitest';

import { isLanguageLevelCode, languageLevelCodes } from './content-vocabulary';

describe('content vocabulary', () => {
  it('freezes the public level-family contract for all supported languages', () => {
    expect(languageLevelCodes.ja).toEqual(['N5', 'N4', 'N3', 'N2', 'N1']);
    expect(languageLevelCodes.zh).toHaveLength(6);
    expect(languageLevelCodes.ko).toHaveLength(6);
  });

  it('does not accept another language family level by accident', () => {
    expect(isLanguageLevelCode('ja', 'N5')).toBe(true);
    expect(isLanguageLevelCode('ja', 'HSK_1')).toBe(false);
  });
});
