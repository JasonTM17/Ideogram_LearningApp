import { describe, expect, it } from 'vitest';

import {
  LearningDatabaseConfigurationError,
  readLearningDatabaseConfiguration,
} from './learning-database-environment';

describe('learning database environment', () => {
  it('accepts a dedicated PostgreSQL connection URL without rewriting credentials', () => {
    const connectionString =
      'postgresql://ideogram_learning_web_login:secret@database.example.test:5432/learning?sslmode=verify-full';

    expect(readLearningDatabaseConfiguration({ LEARNING_DATABASE_URL: connectionString })).toEqual({
      connectionString,
      maxConnections: 2,
    });
  });

  it('accepts a bounded pool size and a Supavisor-style dedicated login', () => {
    const connectionString =
      'postgresql://ideogram_learning_web_login.project-ref:secret@pooler.example.test:5432/learning?sslmode=verify-full';

    expect(
      readLearningDatabaseConfiguration({
        LEARNING_DATABASE_POOL_MAX: '4',
        LEARNING_DATABASE_URL: connectionString,
        NODE_ENV: 'production',
      }),
    ).toEqual({ connectionString, maxConnections: 4 });
  });

  it('allows a local development login without TLS', () => {
    const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

    expect(
      readLearningDatabaseConfiguration({
        LEARNING_DATABASE_URL: connectionString,
        NODE_ENV: 'development',
      }),
    ).toEqual({ connectionString, maxConnections: 2 });
  });

  it.each([
    undefined,
    '',
    'https://database.example.test/learning',
    'postgresql://database.example.test/learning',
    'postgresql://learning-api@/learning',
    'postgresql://learning-api@database.example.test',
    'postgresql://learning-api@database.example.test/learning#credentials',
  ])('rejects an incomplete or unsafe connection URL: %s', (connectionString) => {
    expect(() =>
      readLearningDatabaseConfiguration({ LEARNING_DATABASE_URL: connectionString }),
    ).toThrow(LearningDatabaseConfigurationError);
  });

  it.each([
    'postgresql://postgres:secret@database.example.test/learning?sslmode=require',
    'postgresql://ideogram_learning_web_login@database.example.test/learning?sslmode=require',
    'postgresql://ideogram_learning_web_login:secret@database.example.test/learning',
    'postgresql://ideogram_learning_web_login:secret@database.example.test/learning?sslmode=require',
    'postgresql://ideogram_learning_web_login:secret@database.example.test/learning?sslmode=verify-ca',
    'postgresql://ideogram_learning_web_login:secret@database.example.test/learning?sslmode=disable',
    'postgresql://ideogram_learning_web_login:secret@database.example.test/learning?sslmode=verify-full&sslmode=disable',
    'postgresql://ideogram_learning_web_login:placeholder@database.example.test/learning?sslmode=verify-full&user=postgres&password=override&host=evil.example&uselibpqcompat=true',
  ])(
    'rejects a production URL without the dedicated encrypted boundary: %s',
    (connectionString) => {
      expect(() =>
        readLearningDatabaseConfiguration({
          LEARNING_DATABASE_URL: connectionString,
          NODE_ENV: 'production',
        }),
      ).toThrow(LearningDatabaseConfigurationError);
    },
  );

  it.each(['0', '6', '1.5', 'many'])('rejects an unsafe pool size: %s', (maxConnections) => {
    expect(() =>
      readLearningDatabaseConfiguration({
        LEARNING_DATABASE_POOL_MAX: maxConnections,
        LEARNING_DATABASE_URL:
          'postgresql://ideogram_learning_web_login:secret@database.example.test/learning?sslmode=verify-full',
      }),
    ).toThrow(LearningDatabaseConfigurationError);
  });

  it('rejects an unknown runtime mode instead of disabling production safeguards', () => {
    expect(() =>
      readLearningDatabaseConfiguration({
        LEARNING_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        NODE_ENV: 'staging',
      }),
    ).toThrow(LearningDatabaseConfigurationError);
  });

  it('does not include connection credentials in validation errors', () => {
    const sensitiveMarker = 'must-not-appear';

    expect(() =>
      readLearningDatabaseConfiguration({
        LEARNING_DATABASE_URL: `https://${sensitiveMarker}@database.example.test/learning`,
      }),
    ).toThrowError(expect.not.stringContaining(sensitiveMarker));
  });
});
