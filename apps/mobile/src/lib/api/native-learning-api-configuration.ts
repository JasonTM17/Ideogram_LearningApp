import { validateNativeApiOrigin } from '@ideogram/api-client/native';

export interface NativeLearningApiConfiguration {
  allowHttpLoopback: boolean;
  apiOrigin: string;
}

export class NativeLearningApiConfigurationError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'NativeLearningApiConfigurationError';
  }
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const expoPublicEnvironment: EnvironmentSource = {
  EXPO_PUBLIC_API_ORIGIN: process.env.EXPO_PUBLIC_API_ORIGIN,
};

const readRequiredValue = (environment: EnvironmentSource, name: string): string => {
  const value = environment[name]?.trim();

  if (!value) {
    throw new NativeLearningApiConfigurationError(
      `Missing required mobile environment variable: ${name}.`,
    );
  }

  return value;
};

export const readNativeLearningApiConfiguration = (
  environment: EnvironmentSource = expoPublicEnvironment,
  isDevelopment: boolean = process.env.NODE_ENV === 'development',
): NativeLearningApiConfiguration => {
  const allowHttpLoopback = isDevelopment === true;

  try {
    return {
      allowHttpLoopback,
      apiOrigin: validateNativeApiOrigin(readRequiredValue(environment, 'EXPO_PUBLIC_API_ORIGIN'), {
        allowHttpLoopback,
      }),
    };
  } catch (error) {
    if (error instanceof NativeLearningApiConfigurationError) throw error;
    throw new NativeLearningApiConfigurationError(
      'EXPO_PUBLIC_API_ORIGIN must be an HTTPS origin, or a loopback HTTP origin in development.',
      error,
    );
  }
};
