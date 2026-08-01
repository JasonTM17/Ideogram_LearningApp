import type {
  LearnerCatalogActivity,
  LearnerCatalogLesson,
  LearnerCatalogResponse,
} from '@ideogram/contracts';

export interface CatalogLessonContext {
  contentReleaseId: string;
  languageCode: string;
  languageName: string;
  lesson: LearnerCatalogLesson;
  levelCode: string;
  releaseTitle: string;
  unitTitle: string;
}

export interface CatalogActivityContext extends CatalogLessonContext {
  activity: LearnerCatalogActivity;
  activitySequence: number;
}

export interface CatalogVocabularyActivityContext extends CatalogActivityContext {
  activity: Extract<LearnerCatalogActivity, { activityType: 'vocabulary' }>;
}

export interface CatalogOverview {
  languagePackCount: number;
  lessonCount: number;
  nextLesson: CatalogLessonContext | null;
  releaseCount: number;
  totalMinutes: number;
}

export const flattenCatalogLessons = (catalog: LearnerCatalogResponse): CatalogLessonContext[] =>
  catalog.languagePacks.flatMap((languagePack) =>
    languagePack.releases.flatMap((release) =>
      release.units.flatMap((unit) =>
        unit.lessons.map((lesson) => ({
          languageCode: languagePack.languageCode,
          languageName: languagePack.displayName,
          lesson,
          contentReleaseId: release.contentReleaseId,
          levelCode: release.levelCode,
          releaseTitle: release.titleVietnamese,
          unitTitle: unit.titleVietnamese,
        })),
      ),
    ),
  );

export const createCatalogOverview = (catalog: LearnerCatalogResponse): CatalogOverview => {
  const lessons = flattenCatalogLessons(catalog);

  return {
    languagePackCount: catalog.languagePacks.length,
    lessonCount: lessons.length,
    nextLesson: lessons[0] ?? null,
    releaseCount: catalog.languagePacks.reduce(
      (count, languagePack) => count + languagePack.releases.length,
      0,
    ),
    totalMinutes: lessons.reduce((count, item) => count + item.lesson.estimatedMinutes, 0),
  };
};

export const findCatalogLesson = (
  catalog: LearnerCatalogResponse,
  lessonId: string,
): CatalogLessonContext | null =>
  flattenCatalogLessons(catalog).find((item) => item.lesson.lessonId === lessonId) ?? null;

export const findCatalogActivity = (
  catalog: LearnerCatalogResponse,
  lessonId: string,
  activityId: string,
): CatalogActivityContext | null => {
  const lessonContext = findCatalogLesson(catalog, lessonId);
  if (!lessonContext) {
    return null;
  }

  const activitySequence = lessonContext.lesson.activities.findIndex(
    (activity) => activity.activityId === activityId,
  );
  const activity = lessonContext.lesson.activities[activitySequence];
  if (!activity) {
    return null;
  }

  return { ...lessonContext, activity, activitySequence: activitySequence + 1 };
};

export const findCatalogVocabularyActivity = (
  catalog: LearnerCatalogResponse,
  lessonId: string,
  activityId: string,
): CatalogVocabularyActivityContext | null => {
  const activityContext = findCatalogActivity(catalog, lessonId, activityId);
  if (!activityContext || activityContext.activity.activityType !== 'vocabulary') {
    return null;
  }

  const { activity, ...lessonContext } = activityContext;
  return { ...lessonContext, activity };
};
