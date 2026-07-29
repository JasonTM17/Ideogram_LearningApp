import {
  isLanguageLevelCode,
  languagePackCodes,
  learnerCatalogResponseSchema,
  learningObjectiveKeys,
} from '@ideogram/contracts';

import {
  compareLanguageLevel,
  compareRelease,
  compareSequence,
  groupBy,
  requireItem,
} from './learner-catalog-assembly-utils';
import { assertLearnerCatalogBudget } from './learner-catalog-budget';
import {
  assertCatalogRelations,
  buildLearnerCatalogActivity,
  LearnerCatalogIntegrityError,
} from './learner-catalog-integrity';
import type { LearnerCatalogDataSet } from './learner-catalog-integrity';
import type { ContentReleaseCatalogRow } from './learner-catalog-row-contracts';
import type { LearnerCatalogResponse, LanguagePackCode } from '@ideogram/contracts';

export const assembleLearnerCatalog = (dataSet: LearnerCatalogDataSet): LearnerCatalogResponse => {
  assertCatalogRelations(dataSet);

  const pathsById = new Map(dataSet.paths.map((path) => [path.path_id, path]));
  const unitsByRelease = groupBy(dataSet.units, (unit) => unit.content_release_id);
  const lessonsByReleaseAndUnit = groupBy(
    dataSet.lessons,
    (lesson) => `${lesson.content_release_id}:${lesson.unit_id}`,
  );
  const activitiesByReleaseAndLesson = groupBy(
    dataSet.activities,
    (activity) => `${activity.content_release_id}:${activity.lesson_id}`,
  );

  const releasesByLanguage = new Map<LanguagePackCode, ContentReleaseCatalogRow[]>();
  for (const release of dataSet.releases) {
    const path = requireItem(
      pathsById.get(release.path_id),
      'A catalog release does not belong to a visible learning path.',
    );
    if (!isLanguageLevelCode(path.language_code, path.level_code)) {
      throw new LearnerCatalogIntegrityError('A catalog path uses an invalid language level.');
    }
    const releases = releasesByLanguage.get(path.language_code);
    if (releases) {
      releases.push(release);
    } else {
      releasesByLanguage.set(path.language_code, [release]);
    }
  }

  const catalog = learnerCatalogResponseSchema.parse({
    languagePacks: [...dataSet.languagePacks]
      .sort(
        (left, right) =>
          languagePackCodes.indexOf(left.language_code) -
          languagePackCodes.indexOf(right.language_code),
      )
      .map((languagePack) => ({
        displayName: languagePack.display_name_vietnamese,
        languageCode: languagePack.language_code,
        releases: (releasesByLanguage.get(languagePack.language_code) ?? [])
          .sort((left, right) => {
            const leftPath = requireItem(
              pathsById.get(left.path_id),
              'A catalog release does not belong to a visible learning path.',
            );
            const rightPath = requireItem(
              pathsById.get(right.path_id),
              'A catalog release does not belong to a visible learning path.',
            );
            const levelDifference = compareLanguageLevel(
              languagePack.language_code,
              leftPath.level_code,
              rightPath.level_code,
            );
            if (levelDifference !== 0) {
              return levelDifference;
            }
            const objectiveDifference =
              learningObjectiveKeys.indexOf(leftPath.objective_key) -
              learningObjectiveKeys.indexOf(rightPath.objective_key);
            return objectiveDifference !== 0 ? objectiveDifference : compareRelease(left, right);
          })
          .map((release) => ({
            contentReleaseId: release.content_release_id,
            levelCode: requireItem(
              pathsById.get(release.path_id),
              'A catalog release does not belong to a visible learning path.',
            ).level_code,
            objectiveKey: requireItem(
              pathsById.get(release.path_id),
              'A catalog release does not belong to a visible learning path.',
            ).objective_key,
            titleVietnamese: release.title_vietnamese,
            units: (unitsByRelease.get(release.content_release_id) ?? [])
              .sort((left, right) => compareSequence(left, right, left.unit_id, right.unit_id))
              .map((unit) => ({
                lessons: (
                  lessonsByReleaseAndUnit.get(`${release.content_release_id}:${unit.unit_id}`) ?? []
                )
                  .sort((left, right) =>
                    compareSequence(left, right, left.lesson_id, right.lesson_id),
                  )
                  .map((lesson) => ({
                    activities: (
                      activitiesByReleaseAndLesson.get(
                        `${release.content_release_id}:${lesson.lesson_id}`,
                      ) ?? []
                    )
                      .sort((left, right) =>
                        compareSequence(left, right, left.activity_id, right.activity_id),
                      )
                      .map(buildLearnerCatalogActivity),
                    estimatedMinutes: lesson.estimated_minutes,
                    lessonId: lesson.lesson_id,
                    sequence: lesson.sequence,
                    summaryVietnamese: lesson.summary_vietnamese,
                    titleVietnamese: lesson.title_vietnamese,
                  })),
                sequence: unit.sequence,
                titleVietnamese: unit.title_vietnamese,
                unitId: unit.unit_id,
              })),
            version: release.version,
          })),
      })),
  });

  assertLearnerCatalogBudget(catalog);
  return catalog;
};

export { LearnerCatalogIntegrityError } from './learner-catalog-integrity';
export type { LearnerCatalogDataSet } from './learner-catalog-integrity';
