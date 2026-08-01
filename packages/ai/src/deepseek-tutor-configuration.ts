export interface DeepSeekTutorConfiguration {
  apiKey: string;
  baseUrl: string;
  model: 'deepseek-v4-flash';
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

export const readDeepSeekTutorConfiguration = (
  environment: EnvironmentSource = serverEnvironment,
): DeepSeekTutorConfiguration => {
  const apiKey = required(environment, 'DEEPSEEK_API_KEY');
  const model = required(environment, 'DEEPSEEK_MODEL');
  const thinkingMode = required(environment, 'DEEPSEEK_TUTOR_THINKING_MODE');
  const reasoningEffort = required(environment, 'DEEPSEEK_REASONING_EFFORT');

  if (
    apiKey.length > 2_048 ||
    /\s/u.test(apiKey) ||
    model !== 'deepseek-v4-flash' ||
    (thinkingMode !== 'disabled' && thinkingMode !== 'enabled') ||
    (reasoningEffort !== 'high' && reasoningEffort !== 'max')
  ) {
    throw new DeepSeekTutorConfigurationError();
  }

  return {
    apiKey,
    baseUrl: validateBaseUrl(required(environment, 'DEEPSEEK_BASE_URL')),
    model,
    reasoningEffort,
    thinkingMode,
  };
};
