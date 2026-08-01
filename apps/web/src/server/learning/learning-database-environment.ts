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
const supportedNodeEnvironments = new Set(['development', 'production', 'test']);

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
    const queryParameters = [...databaseUrl.searchParams.keys()];

    if (!isDedicatedProductionLogin(username) || !databaseUrl.password) {
      throw new LearningDatabaseConfigurationError(
        'Production LEARNING_DATABASE_URL must use the dedicated learning login and include its credential.',
      );
    }
    if (
      queryParameters.length !== 1 ||
      queryParameters[0] !== 'sslmode' ||
      sslModes.length !== 1 ||
      sslModes[0] !== 'verify-full'
    ) {
      throw new LearningDatabaseConfigurationError(
        'Production LEARNING_DATABASE_URL must use only sslmode=verify-full; connection overrides are forbidden.',
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

  const nodeEnvironment = environment.NODE_ENV?.trim() || 'production';
  if (!supportedNodeEnvironments.has(nodeEnvironment)) {
    throw new LearningDatabaseConfigurationError(
      'NODE_ENV must be development, production, or test for the learning database runtime.',
    );
  }

  return {
    connectionString: parseConnectionString(connectionString, nodeEnvironment === 'production'),
    maxConnections: parseMaxConnections(environment.LEARNING_DATABASE_POOL_MAX),
  };
};
