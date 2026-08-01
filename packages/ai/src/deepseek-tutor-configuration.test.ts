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
  AI_TUTOR_CONSENT_POLICY_KEY: 'ai-tutor-provider-processing-v1',
  AI_TUTOR_ENABLED: 'true',
  AI_TUTOR_INPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS: '140000',
  AI_TUTOR_OUTPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS: '280000',
};

describe('readDeepSeekTutorConfiguration', () => {
  it('accepts the approved server-only DeepSeek V4 Flash configuration', () => {
    expect(readDeepSeekTutorConfiguration(environment)).toEqual({
      apiKey: environment.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com',
      consentPolicyKey: environment.AI_TUTOR_CONSENT_POLICY_KEY,
      enabled: true,
      inputPriceMicrousdPerMillionTokens: 140_000,
      model: 'deepseek-v4-flash',
      outputPriceMicrousdPerMillionTokens: 280_000,
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
    { ...environment, AI_TUTOR_ENABLED: 'yes' },
    { ...environment, AI_TUTOR_CONSENT_POLICY_KEY: 'bad key with spaces' },
    { ...environment, AI_TUTOR_INPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS: '1.2' },
  ])('rejects unapproved provider configuration', (candidate) => {
    expect(() => readDeepSeekTutorConfiguration(candidate)).toThrow(
      DeepSeekTutorConfigurationError,
    );
  });
});
