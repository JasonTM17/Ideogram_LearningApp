import { validateSupabasePublishableKey } from './supabase-publishable-key';

export interface NativeSupabaseConfiguration {
  publishableKey: string;
  storageKey: string;
  url: string;
}

export class NativeSupabaseConfigurationError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'NativeSupabaseConfigurationError';
  }
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const expoPublicEnvironment: EnvironmentSource = {
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
};

const readRequiredValue = (environment: EnvironmentSource, name: string): string => {
  const value = environment[name]?.trim();
  if (!value) {
    throw new NativeSupabaseConfigurationError(
      `Missing required mobile environment variable: ${name}.`,
    );
  }

  return value;
};

const parseSupabaseUrl = (rawUrl: string): URL => {
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]+\/?$/.test(rawUrl)) {
    throw new NativeSupabaseConfigurationError(
      'EXPO_PUBLIC_SUPABASE_URL must contain only the Supabase origin.',
    );
  }

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch (error) {
    throw new NativeSupabaseConfigurationError(
      'EXPO_PUBLIC_SUPABASE_URL must be a valid URL.',
      error,
    );
  }

  const isLoopbackHttp =
    url.protocol === 'http:' &&
    (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]');

  if (url.protocol !== 'https:' && !isLoopbackHttp) {
    throw new NativeSupabaseConfigurationError(
      'EXPO_PUBLIC_SUPABASE_URL must use HTTPS outside loopback development.',
    );
  }

  if (url.username || url.password) {
    throw new NativeSupabaseConfigurationError(
      'EXPO_PUBLIC_SUPABASE_URL must not contain credentials.',
    );
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new NativeSupabaseConfigurationError(
      'EXPO_PUBLIC_SUPABASE_URL must contain only the Supabase origin.',
    );
  }

  return url;
};

const createStorageKey = (url: URL): string => {
  const originNamespace = url.host.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `ideogram-${originNamespace}-auth-v1`;
};

export const readNativeSupabaseConfiguration = (
  environment: EnvironmentSource = expoPublicEnvironment,
): NativeSupabaseConfiguration => {
  const url = parseSupabaseUrl(readRequiredValue(environment, 'EXPO_PUBLIC_SUPABASE_URL'));
  let publishableKey: string;

  try {
    publishableKey = validateSupabasePublishableKey(
      readRequiredValue(environment, 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    );
  } catch (error) {
    throw new NativeSupabaseConfigurationError(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key.',
      error,
    );
  }

  return {
    publishableKey,
    storageKey: createStorageKey(url),
    url: url.origin,
  };
};
