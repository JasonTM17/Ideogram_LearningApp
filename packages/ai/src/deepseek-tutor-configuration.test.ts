import { describe, expect, it } from 'vitest';

import {
  DeepSeekTutorConfigurationError,
  readDeepSeekTutorConfiguration,
} from './deepseek-tutor-configuration';

const environment = {
  DEEPSEEK_API_KEY: 'test_key_without_whitespace',
  DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
  DEEPSEEK_MODEL: 'deepseek-v4-flash',
  DEEPSEEK_REASONING_EFFORT: 'high',
  DEEPSEEK_TUTOR_THINKING_MODE: 'disabled',
};

describe('readDeepSeekTutorConfiguration', () => {
  it('accepts the approved server-only DeepSeek V4 Flash configuration', () => {
    expect(readDeepSeekTutorConfiguration(environment)).toEqual({
      apiKey: environment.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
      reasoningEffort: 'high',
      thinkingMode: 'disabled',
    });
  });

  it.each([
    { ...environment, DEEPSEEK_BASE_URL: 'https://proxy.example.com' },
    { ...environment, DEEPSEEK_MODEL: 'deepseek-reasoner' },
    { ...environment, DEEPSEEK_REASONING_EFFORT: 'low' },
    { ...environment, DEEPSEEK_TUTOR_THINKING_MODE: 'sometimes' },
    { ...environment, DEEPSEEK_API_KEY: 'key with whitespace' },
  ])('rejects unapproved provider configuration', (candidate) => {
    expect(() => readDeepSeekTutorConfiguration(candidate)).toThrow(
      DeepSeekTutorConfigurationError,
    );
  });
});
