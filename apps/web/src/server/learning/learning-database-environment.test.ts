import { describe, expect, it } from 'vitest';

import {
  LearningDatabaseConfigurationError,
  readLearningDatabaseConfiguration,
} from './learning-database-environment';

describe('learning database environment', () => {
  it('accepts a dedicated PostgreSQL connection URL without rewriting credentials', () => {
    const connectionString =
      'postgresql://learning-api@database.example.test:5432/learning?sslmode=require';

    expect(readLearningDatabaseConfiguration({ LEARNING_DATABASE_URL: connectionString })).toEqual({
      connectionString,
    });
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

  it('does not include connection credentials in validation errors', () => {
    const sensitiveMarker = 'must-not-appear';

    expect(() =>
      readLearningDatabaseConfiguration({
        LEARNING_DATABASE_URL: `https://${sensitiveMarker}@database.example.test/learning`,
      }),
    ).toThrowError(expect.not.stringContaining(sensitiveMarker));
  });
});
