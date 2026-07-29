import type { LearnerCatalogResponse } from '@ideogram/contracts';

export const maximumLearnerCatalogActivityItems = 600;
export const maximumLearnerCatalogResponseBytes = 512 * 1024;

export class LearnerCatalogBudgetError extends Error {
  constructor() {
    super('Learner catalog exceeds the aggregate endpoint budget.');
    this.name = 'LearnerCatalogBudgetError';
  }
}

const countActivities = (catalog: LearnerCatalogResponse): number =>
  catalog.languagePacks.reduce(
    (total, languagePack) =>
      total +
      languagePack.releases.reduce(
        (releaseTotal, release) =>
          releaseTotal +
          release.units.reduce(
            (unitTotal, unit) =>
              unitTotal +
              unit.lessons.reduce(
                (lessonTotal, lesson) => lessonTotal + lesson.activities.length,
                0,
              ),
            0,
          ),
        0,
      ),
    0,
  );

const responseByteLength = (catalog: LearnerCatalogResponse): number =>
  new TextEncoder().encode(JSON.stringify(catalog)).byteLength;

export const assertLearnerCatalogBudget = (catalog: LearnerCatalogResponse): void => {
  if (countActivities(catalog) > maximumLearnerCatalogActivityItems) {
    throw new LearnerCatalogBudgetError();
  }

  if (responseByteLength(catalog) > maximumLearnerCatalogResponseBytes) {
    throw new LearnerCatalogBudgetError();
  }
};
