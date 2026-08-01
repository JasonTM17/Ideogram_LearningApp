import type { LearnerCatalogLesson, LearnerCatalogResponse } from '@ideogram/contracts';

export interface CatalogLessonContext {
  contentReleaseId: string;
  languageCode: string;
  languageName: string;
  lesson: LearnerCatalogLesson;
  levelCode: string;
  releaseTitle: string;
  unitTitle: string;
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
