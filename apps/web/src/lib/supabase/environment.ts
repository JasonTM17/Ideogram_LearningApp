export interface SupabasePublicConfiguration {
  publishableKey: string;
  url: string;
}

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const readRequiredValue = (environment: EnvironmentSource, names: readonly string[]): string => {
  for (const name of names) {
    const value = environment[name]?.trim();
    if (value) {
      return value;
    }
  }

  throw new SupabaseConfigurationError(`Missing required environment variable: ${names[0]}.`);
};

const parseSupabaseUrl = (rawUrl: string): string => {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new SupabaseConfigurationError('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.');
  }

  const isLocalHttp =
    url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');

  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new SupabaseConfigurationError(
      'NEXT_PUBLIC_SUPABASE_URL must use HTTPS outside local development.',
    );
  }

  if (url.username || url.password) {
    throw new SupabaseConfigurationError('NEXT_PUBLIC_SUPABASE_URL must not contain credentials.');
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new SupabaseConfigurationError(
      'NEXT_PUBLIC_SUPABASE_URL must contain only the Supabase origin.',
    );
  }

  return url.origin;
};

export const readSupabasePublicConfiguration = (
  environment: EnvironmentSource = process.env,
): SupabasePublicConfiguration => ({
  publishableKey: readRequiredValue(environment, [
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
  ]),
  url: parseSupabaseUrl(
    readRequiredValue(environment, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']),
  ),
});
