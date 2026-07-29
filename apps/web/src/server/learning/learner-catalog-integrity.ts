import { learnerCatalogActivitySchema } from '@ideogram/contracts';

import type {
  ContentReleaseCatalogRow,
  ContentUnitCatalogRow,
  LanguagePackCatalogRow,
  LearnerCatalogActivityRpcRow,
  LearningPathCatalogRow,
  LessonCatalogRow,
} from './learner-catalog-row-contracts';
import type { LearnerCatalogActivity } from '@ideogram/contracts';

export class LearnerCatalogIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearnerCatalogIntegrityError';
  }
}

export interface LearnerCatalogDataSet {
  activities: LearnerCatalogActivityRpcRow[];
  languagePacks: LanguagePackCatalogRow[];
  lessons: LessonCatalogRow[];
  paths: LearningPathCatalogRow[];
  releases: ContentReleaseCatalogRow[];
  units: ContentUnitCatalogRow[];
}

export const buildLearnerCatalogActivity = (
  activity: LearnerCatalogActivityRpcRow,
): LearnerCatalogActivity =>
  learnerCatalogActivitySchema.parse({
    activityId: activity.activity_id,
    activityType: activity.activity_type,
    estimatedMinutes: activity.estimated_minutes,
    instructionsVietnamese: activity.instructions_vietnamese,
    payload: activity.payload,
    rubyAnnotationState: activity.target_script === 'kana_kanji' ? 'planned' : 'not_applicable',
    targetScript: activity.target_script,
    titleVietnamese: activity.title_vietnamese,
  });

export const assertCatalogRelations = (dataSet: LearnerCatalogDataSet): void => {
  const languageCodes = new Set(
    dataSet.languagePacks.map((languagePack) => languagePack.language_code),
  );
  const pathsById = new Map(dataSet.paths.map((path) => [path.path_id, path]));
  const releasesById = new Map(
    dataSet.releases.map((release) => [release.content_release_id, release]),
  );
  const unitsByReleaseAndId = new Map(
    dataSet.units.map((unit) => [`${unit.content_release_id}:${unit.unit_id}`, unit]),
  );
  const lessonsByReleaseAndId = new Map(
    dataSet.lessons.map((lesson) => [`${lesson.content_release_id}:${lesson.lesson_id}`, lesson]),
  );

  for (const path of dataSet.paths) {
    if (!languageCodes.has(path.language_code)) {
      throw new LearnerCatalogIntegrityError(
        'A visible catalog path has no visible language pack.',
      );
    }
  }
  for (const release of dataSet.releases) {
    if (!pathsById.has(release.path_id)) {
      throw new LearnerCatalogIntegrityError(
        'A catalog release does not belong to a visible learning path.',
      );
    }
    if (Number.isNaN(Date.parse(release.published_at))) {
      throw new LearnerCatalogIntegrityError(
        'A catalog release has an invalid publication timestamp.',
      );
    }
  }
  for (const unit of dataSet.units) {
    if (!releasesById.has(unit.content_release_id)) {
      throw new LearnerCatalogIntegrityError(
        'A catalog unit does not belong to a visible release.',
      );
    }
  }
  for (const lesson of dataSet.lessons) {
    if (!releasesById.has(lesson.content_release_id)) {
      throw new LearnerCatalogIntegrityError(
        'A catalog lesson does not belong to a visible release.',
      );
    }
    if (!unitsByReleaseAndId.has(`${lesson.content_release_id}:${lesson.unit_id}`)) {
      throw new LearnerCatalogIntegrityError('A catalog lesson does not belong to a visible unit.');
    }
  }
  for (const activity of dataSet.activities) {
    if (!releasesById.has(activity.content_release_id)) {
      throw new LearnerCatalogIntegrityError(
        'A learner activity does not belong to a visible release.',
      );
    }
    if (!lessonsByReleaseAndId.has(`${activity.content_release_id}:${activity.lesson_id}`)) {
      throw new LearnerCatalogIntegrityError(
        'A learner activity does not belong to a visible lesson.',
      );
    }
  }
};
