import { describe, expect, it } from 'vitest';

import {
  assertLearnerCatalogBudget,
  LearnerCatalogBudgetError,
  maximumLearnerCatalogActivityItems,
} from './learner-catalog-budget';

import type { LearnerCatalogResponse } from '@ideogram/contracts';

const createCatalog = (activities: unknown[]): LearnerCatalogResponse =>
  ({
    languagePacks: [
      {
        releases: [
          {
            units: [
              {
                lessons: [{ activities }],
              },
            ],
          },
        ],
      },
    ],
  }) as LearnerCatalogResponse;

describe('assertLearnerCatalogBudget', () => {
  it('rejects a catalog with more activities than the aggregate endpoint allows', () => {
    const catalog = createCatalog(
      Array.from({ length: maximumLearnerCatalogActivityItems + 1 }, () => ({})),
    );

    expect(() => assertLearnerCatalogBudget(catalog)).toThrow(LearnerCatalogBudgetError);
  });

  it('rejects an oversized serialized response before it can leave the route', () => {
    const catalog = createCatalog(
      Array.from({ length: 300 }, () => ({ prompt: 'x'.repeat(2_000) })),
    );

    expect(() => assertLearnerCatalogBudget(catalog)).toThrow(LearnerCatalogBudgetError);
  });
});
