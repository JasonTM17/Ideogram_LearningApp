export interface DeepSeekTutorConfiguration {
  apiKey: string;
  consentPolicyKey: string;
  enabled: boolean;
  baseUrl: string;
  inputPriceMicrousdPerMillionTokens: number;
  model: 'deepseek-v4-flash';
  outputPriceMicrousdPerMillionTokens: number;
  reasoningEffort: 'high' | 'max';
  thinkingMode: 'disabled' | 'enabled';
}

export class DeepSeekTutorConfigurationError extends Error {
  constructor() {
    super('DeepSeek tutor configuration is unavailable.');
    this.name = 'DeepSeekTutorConfigurationError';
  }
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const serverEnvironment: EnvironmentSource = {
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  DEEPSEEK_REASONING_EFFORT: process.env.DEEPSEEK_REASONING_EFFORT,
  DEEPSEEK_TUTOR_THINKING_MODE: process.env.DEEPSEEK_TUTOR_THINKING_MODE,
  AI_TUTOR_CONSENT_POLICY_KEY: process.env.AI_TUTOR_CONSENT_POLICY_KEY,
  AI_TUTOR_ENABLED: process.env.AI_TUTOR_ENABLED,
  AI_TUTOR_INPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS:
    process.env.AI_TUTOR_INPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS,
  AI_TUTOR_OUTPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS:
    process.env.AI_TUTOR_OUTPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS,
};

const required = (environment: EnvironmentSource, name: string): string => {
  const value = environment[name]?.trim();

  if (!value) throw new DeepSeekTutorConfigurationError();
  return value;
};

const validateBaseUrl = (value: string): string => {
  try {
    const url = new URL(value);
    if (
      url.origin !== 'https://api.deepseek.com' ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new Error();
    }
    return url.origin;
  } catch {
    throw new DeepSeekTutorConfigurationError();
  }
};

const parseBoolean = (value: string): boolean => {
  if (value !== 'true' && value !== 'false') {
    throw new DeepSeekTutorConfigurationError();
  }

  return value === 'true';
};

const parsePrice = (value: string): number => {
  if (!/^\d+$/u.test(value)) throw new DeepSeekTutorConfigurationError();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 10_000_000) {
    throw new DeepSeekTutorConfigurationError();
  }
  return parsed;
};

export const readDeepSeekTutorConfiguration = (
  environment: EnvironmentSource = serverEnvironment,
): DeepSeekTutorConfiguration => {
  const apiKey = required(environment, 'DEEPSEEK_API_KEY');
  const model = required(environment, 'DEEPSEEK_MODEL');
  const thinkingMode = required(environment, 'DEEPSEEK_TUTOR_THINKING_MODE');
  const reasoningEffort = required(environment, 'DEEPSEEK_REASONING_EFFORT');
  const consentPolicyKey = required(environment, 'AI_TUTOR_CONSENT_POLICY_KEY');
  const enabled = parseBoolean(required(environment, 'AI_TUTOR_ENABLED'));
  const inputPriceMicrousdPerMillionTokens = parsePrice(
    required(environment, 'AI_TUTOR_INPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS'),
  );
  const outputPriceMicrousdPerMillionTokens = parsePrice(
    required(environment, 'AI_TUTOR_OUTPUT_PRICE_MICRO_USD_PER_MILLION_TOKENS'),
  );

  if (
    apiKey.length > 2_048 ||
    /\s/u.test(apiKey) ||
    model !== 'deepseek-v4-flash' ||
    (thinkingMode !== 'disabled' && thinkingMode !== 'enabled') ||
    (reasoningEffort !== 'high' && reasoningEffort !== 'max') ||
    !/^[-a-z0-9.]{3,120}$/u.test(consentPolicyKey)
  ) {
    throw new DeepSeekTutorConfigurationError();
  }

  return {
    apiKey,
    baseUrl: validateBaseUrl(required(environment, 'DEEPSEEK_BASE_URL')),
    consentPolicyKey,
    enabled,
    inputPriceMicrousdPerMillionTokens,
    model,
    outputPriceMicrousdPerMillionTokens,
    reasoningEffort,
    thinkingMode,
  };
};
