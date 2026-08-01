import { describe, expect, it } from 'vitest';

import { NativeApiHttpError, NativeApiSessionChangedError } from '@ideogram/api-client/native';

import {
  defaultTutorPreferences,
  describeAssistantError,
  isExpectedAssistantCancellation,
  resetTutorLevelForLanguage,
  tutorLevelsForLanguage,
} from './assistant-state';

describe('assistant state helpers', () => {
  it('starts with Vietnamese-friendly Japanese N5 preferences', () => {
    expect(defaultTutorPreferences).toEqual({
      explanationDepth: 'standard',
      preferredLanguageCode: 'ja',
      preferredObjectiveKey: 'communication',
      targetLevelCode: 'N5',
      tone: 'encouraging',
    });
  });

  it('switches language and level together', () => {
    expect(tutorLevelsForLanguage('zh')).toEqual([
      'HSK_1',
      'HSK_2',
      'HSK_3',
      'HSK_4',
      'HSK_5',
      'HSK_6',
    ]);
    expect(resetTutorLevelForLanguage('ko')).toEqual({
      preferredLanguageCode: 'ko',
      targetLevelCode: 'TOPIK_1',
    });
  });

  it('does not present account/session changes as provider failures', () => {
    expect(isExpectedAssistantCancellation(new NativeApiSessionChangedError())).toBe(true);
    expect(isExpectedAssistantCancellation(new NativeApiHttpError(503))).toBe(false);
  });

  it('maps opaque transport errors to Vietnamese learner-safe copy', () => {
    expect(describeAssistantError(new NativeApiHttpError(503))).toContain('tạm tắt');
    expect(describeAssistantError(new Error('provider secret'))).not.toContain('provider secret');
  });
});
