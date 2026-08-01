import { describe, expect, it } from 'vitest';

import { findFirstCatalogLesson } from './catalog-lesson-context';

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
                      rubyAnnotationState: 'planned',
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

describe('findFirstCatalogLesson', () => {
  it('keeps the backend catalog order and preserves lesson context', () => {
    expect(findFirstCatalogLesson(catalog)).toEqual(
      expect.objectContaining({
        languageCode: 'ja',
        languageName: 'Tiếng Nhật',
        levelCode: 'N5',
        lesson: expect.objectContaining({ lessonId: 'greetings-01' }),
        unitTitle: 'Bắt đầu giao tiếp',
      }),
    );
  });

  it('does not invent a lesson when every language pack is empty', () => {
    expect(findFirstCatalogLesson({ languagePacks: [] })).toBeNull();
  });
});
