import { describe, expect, it } from 'vitest';

import {
  createCatalogOverview,
  findCatalogLesson,
  flattenCatalogLessons,
} from './catalog-presentation';

import type { LearnerCatalogResponse } from '@ideogram/contracts';

const catalog: LearnerCatalogResponse = {
  languagePacks: [
    {
      displayName: 'Tiếng Nhật',
      languageCode: 'ja',
      releases: [
        {
          contentReleaseId: 'japanese-n5-v1',
          levelCode: 'N5',
          objectiveKey: 'communication',
          titleVietnamese: 'Nền tảng N5',
          units: [
            {
              lessons: [
                {
                  activities: [
                    {
                      activityId: 'greeting-retrieval',
                      activityType: 'retrieval',
                      estimatedMinutes: 5,
                      instructionsVietnamese: 'Nhớ lại câu chào phù hợp.',
                      payload: {
                        prompt: 'おはようございます',
                        promptVietnamese: 'Chào buổi sáng.',
                      },
                      rubyAnnotationState: 'not_applicable',
                      targetScript: 'kana_kanji',
                      titleVietnamese: 'Chào buổi sáng',
                    },
                  ],
                  estimatedMinutes: 10,
                  lessonId: 'greetings-01',
                  sequence: 1,
                  summaryVietnamese: 'Những câu chào cơ bản.',
                  titleVietnamese: 'Lời chào đầu tiên',
                },
              ],
              sequence: 1,
              titleVietnamese: 'Bắt đầu giao tiếp',
              unitId: 'greetings',
            },
          ],
          version: 'v1.0.0',
        },
      ],
    },
  ],
};

describe('catalog presentation', () => {
  it('flattens published lessons while preserving their curriculum context', () => {
    expect(flattenCatalogLessons(catalog)).toEqual([
      expect.objectContaining({
        languageCode: 'ja',
        lesson: expect.objectContaining({ lessonId: 'greetings-01' }),
        levelCode: 'N5',
        unitTitle: 'Bắt đầu giao tiếp',
      }),
    ]);
  });

  it('derives only statistics present in the learner-safe catalog', () => {
    expect(createCatalogOverview(catalog)).toEqual({
      languagePackCount: 1,
      lessonCount: 1,
      nextLesson: expect.objectContaining({
        lesson: expect.objectContaining({ lessonId: 'greetings-01' }),
      }),
      releaseCount: 1,
      totalMinutes: 10,
    });
  });

  it('handles the review-only empty catalog without inventing learner progress', () => {
    expect(createCatalogOverview({ languagePacks: [] })).toEqual({
      languagePackCount: 0,
      lessonCount: 0,
      nextLesson: null,
      releaseCount: 0,
      totalMinutes: 0,
    });
  });

  it('returns null for an unpublished or unknown lesson identifier', () => {
    expect(findCatalogLesson(catalog, 'not-published')).toBeNull();
  });
});
