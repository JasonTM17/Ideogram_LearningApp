export interface LearningDatabaseConfiguration {
  connectionString: string;
}

export class LearningDatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningDatabaseConfigurationError';
  }
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const parseConnectionString = (rawConnectionString: string): string => {
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

  return rawConnectionString;
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

  return { connectionString: parseConnectionString(connectionString) };
};
