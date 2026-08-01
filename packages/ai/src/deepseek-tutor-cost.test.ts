import { describe, expect, it } from 'vitest';

import { calculateTutorTurnCostMicrousd } from './deepseek-tutor-cost';

describe('calculateTutorTurnCostMicrousd', () => {
  it('rounds the configured input/output token estimate up to one micro-USD', () => {
    expect(
      calculateTutorTurnCostMicrousd({
        configuration: {
          apiKey: 'test',
          baseUrl: 'https://api.deepseek.com',
          consentPolicyKey: 'ai-tutor-provider-processing-v1',
          enabled: true,
          inputPriceMicrousdPerMillionTokens: 140_000,
          model: 'deepseek-v4-flash',
          outputPriceMicrousdPerMillionTokens: 280_000,
          reasoningEffort: 'high',
          thinkingMode: 'disabled',
        },
        usage: { completionTokens: 3, promptTokens: 2, totalTokens: 5 },
      }),
    ).toBe(2);
  });
});
