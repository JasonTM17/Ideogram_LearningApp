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

export const findFirstCatalogLesson = (
  catalog: LearnerCatalogResponse,
): CatalogLessonContext | null => {
  for (const languagePack of catalog.languagePacks) {
    for (const release of languagePack.releases) {
      for (const unit of release.units) {
        const lesson = unit.lessons[0];

        if (lesson) {
          return {
            contentReleaseId: release.contentReleaseId,
            languageCode: languagePack.languageCode,
            languageName: languagePack.displayName,
            lesson,
            levelCode: release.levelCode,
            releaseTitle: release.titleVietnamese,
            unitTitle: unit.titleVietnamese,
          };
        }
      }
    }
  }

  return null;
};

export const findCatalogLesson = (
  catalog: LearnerCatalogResponse,
  lessonId: string,
): CatalogLessonContext | null => {
  if (lessonId.length === 0 || lessonId.trim() !== lessonId) {
    return null;
  }

  for (const languagePack of catalog.languagePacks) {
    for (const release of languagePack.releases) {
      for (const unit of release.units) {
        const lesson = unit.lessons.find((item) => item.lessonId === lessonId);

        if (lesson) {
          return {
            contentReleaseId: release.contentReleaseId,
            languageCode: languagePack.languageCode,
            languageName: languagePack.displayName,
            lesson,
            levelCode: release.levelCode,
            releaseTitle: release.titleVietnamese,
            unitTitle: unit.titleVietnamese,
          };
        }
      }
    }
  }

  return null;
};

export const findCatalogActivity = (
  catalog: LearnerCatalogResponse,
  lessonId: string,
  activityId: string,
): CatalogActivityContext | null => {
  const lessonContext = findCatalogLesson(catalog, lessonId);
  if (!lessonContext || activityId.length === 0 || activityId.trim() !== activityId) {
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
