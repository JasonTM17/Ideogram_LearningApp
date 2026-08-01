export interface LearningDatabaseConfiguration {
  connectionString: string;
  maxConnections: number;
}

export class LearningDatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningDatabaseConfigurationError';
  }
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const productionLoginName = 'ideogram_learning_web_login';
const productionSslModes = new Set(['require', 'verify-ca', 'verify-full']);

const isDedicatedProductionLogin = (username: string): boolean =>
  username === productionLoginName || username.startsWith(`${productionLoginName}.`);

const parseConnectionString = (rawConnectionString: string, production: boolean): string => {
  let databaseUrl: URL;

  try {
    databaseUrl = new URL(rawConnectionString);
  } catch {
    throw new LearningDatabaseConfigurationError(
      'LEARNING_DATABASE_URL must be a valid PostgreSQL URL.',
    );
  }

  if (databaseUrl.protocol !== 'postgresql:' && databaseUrl.protocol !== 'postgres:') {
    throw new LearningDatabaseConfigurationError(
      'LEARNING_DATABASE_URL must use the PostgreSQL protocol.',
    );
  }

  if (!databaseUrl.username || !databaseUrl.hostname || !/^\/[^/]+$/u.test(databaseUrl.pathname)) {
    throw new LearningDatabaseConfigurationError(
      'LEARNING_DATABASE_URL must identify a login, host, and database.',
    );
  }

  if (databaseUrl.hash) {
    throw new LearningDatabaseConfigurationError(
      'LEARNING_DATABASE_URL must not contain a URL fragment.',
    );
  }

  if (production) {
    const username = databaseUrl.username;
    const sslModes = databaseUrl.searchParams.getAll('sslmode');

    if (!isDedicatedProductionLogin(username) || !databaseUrl.password) {
      throw new LearningDatabaseConfigurationError(
        'Production LEARNING_DATABASE_URL must use the dedicated learning login and include its credential.',
      );
    }
    if (sslModes.length !== 1 || !productionSslModes.has(sslModes[0] ?? '')) {
      throw new LearningDatabaseConfigurationError(
        'Production LEARNING_DATABASE_URL must require encrypted PostgreSQL transport.',
      );
    }
  }

  return rawConnectionString;
};

const parseMaxConnections = (rawValue: string | undefined): number => {
  const value = rawValue?.trim() || '2';
  if (!/^[1-5]$/u.test(value)) {
    throw new LearningDatabaseConfigurationError(
      'LEARNING_DATABASE_POOL_MAX must be an integer between 1 and 5.',
    );
  }

  return Number(value);
};

export const readLearningDatabaseConfiguration = (
  environment: EnvironmentSource = process.env,
): LearningDatabaseConfiguration => {
  const connectionString = environment.LEARNING_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new LearningDatabaseConfigurationError(
      'Missing required environment variable: LEARNING_DATABASE_URL.',
    );
  }

  const production = (environment.NODE_ENV?.trim() || 'production') === 'production';

  return {
    connectionString: parseConnectionString(connectionString, production),
    maxConnections: parseMaxConnections(environment.LEARNING_DATABASE_POOL_MAX),
  };
};
