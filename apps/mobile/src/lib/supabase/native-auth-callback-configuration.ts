export interface NativeAuthCallbackConfiguration {
  callbackUrl: string;
  isDevelopment: boolean;
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const developmentCallbackUrl = 'ideogram-learning://auth/callback';
const expectedProductionCallbackPath = '/auth/callback';
const expectedDevelopmentCallbackPath = '/callback';
const expectedDevelopmentHost = 'auth';

const expoPublicEnvironment: EnvironmentSource = {
  EXPO_PUBLIC_AUTH_CALLBACK_URL: process.env.EXPO_PUBLIC_AUTH_CALLBACK_URL,
};

const isDevelopmentRuntime = (): boolean => process.env.NODE_ENV !== 'production';

const parseCallbackUrl = (rawUrl: string, isDevelopment: boolean): URL => {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch (error) {
    throw new TypeError('EXPO_PUBLIC_AUTH_CALLBACK_URL must be a valid callback URL.', {
      cause: error,
    });
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError(
      'EXPO_PUBLIC_AUTH_CALLBACK_URL must contain only the exact callback origin and path.',
    );
  }

  if (
    url.protocol === 'https:' &&
    url.pathname === expectedProductionCallbackPath &&
    url.port.length === 0
  ) {
    return url;
  }

  if (
    isDevelopment &&
    url.protocol === 'ideogram-learning:' &&
    url.hostname === expectedDevelopmentHost &&
    url.pathname === expectedDevelopmentCallbackPath &&
    url.port.length === 0
  ) {
    return url;
  }

  throw new TypeError('EXPO_PUBLIC_AUTH_CALLBACK_URL must be claimed HTTPS outside development.');
};

export const readNativeAuthCallbackConfiguration = (
  environment: EnvironmentSource = expoPublicEnvironment,
  isDevelopment = isDevelopmentRuntime(),
): NativeAuthCallbackConfiguration => {
  const configuredUrl = environment.EXPO_PUBLIC_AUTH_CALLBACK_URL?.trim();
  if (!configuredUrl) {
    if (isDevelopment) {
      return { callbackUrl: developmentCallbackUrl, isDevelopment };
    }

    throw new TypeError(
      'Missing required mobile environment variable: EXPO_PUBLIC_AUTH_CALLBACK_URL.',
    );
  }

  const url = parseCallbackUrl(configuredUrl, isDevelopment);
  return { callbackUrl: url.toString(), isDevelopment };
};
