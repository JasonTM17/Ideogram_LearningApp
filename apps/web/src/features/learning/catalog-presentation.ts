import type { LearnerCatalogLesson, LearnerCatalogResponse } from '@ideogram/contracts';

export interface CatalogLessonContext {
  languageCode: string;
  languageName: string;
  lesson: LearnerCatalogLesson;
  levelCode: string;
  releaseTitle: string;
  unitTitle: string;
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
