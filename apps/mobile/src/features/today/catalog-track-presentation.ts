import type { LearnerCatalogResponse } from '@ideogram/contracts';

export interface CatalogTrack {
  contentReleaseId: string;
  firstLessonId: string;
  languageCode: string;
  languageName: string;
  lessonCount: number;
  levelCode: string;
  releaseTitle: string;
  totalMinutes: number;
  unitCount: number;
}

export const createCatalogTracks = (catalog: LearnerCatalogResponse): CatalogTrack[] =>
  catalog.languagePacks.flatMap((languagePack) =>
    languagePack.releases.flatMap((release) => {
      const lessons = release.units.flatMap((unit) => unit.lessons);
      const firstLesson = lessons[0];

      if (!firstLesson) {
        return [];
      }

      return {
        contentReleaseId: release.contentReleaseId,
        firstLessonId: firstLesson.lessonId,
        languageCode: languagePack.languageCode,
        languageName: languagePack.displayName,
        lessonCount: lessons.length,
        levelCode: release.levelCode,
        releaseTitle: release.titleVietnamese,
        totalMinutes: lessons.reduce((total, lesson) => total + lesson.estimatedMinutes, 0),
        unitCount: release.units.length,
      };
    }),
  );
