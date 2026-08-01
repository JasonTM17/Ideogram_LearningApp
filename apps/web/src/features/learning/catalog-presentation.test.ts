import { describe, expect, it } from 'vitest';

import {
  createCatalogOverview,
  findCatalogActivity,
  findCatalogLesson,
  findCatalogVocabularyActivity,
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
                    {
                      activityId: 'greeting-vocabulary',
                      activityType: 'vocabulary',
                      estimatedMinutes: 4,
                      instructionsVietnamese: 'Đọc từ và ví dụ trước khi xác nhận đã học.',
                      payload: {
                        entries: [
                          {
                            example: {
                              translationVietnamese: 'Tôi là giáo viên.',
                              value: '私は先生です。',
                            },
                            meaningVietnamese: 'giáo viên',
                            reading: 'せんせい',
                            term: '先生',
                          },
                        ],
                      },
                      rubyAnnotationState: 'planned',
                      targetScript: 'kana_kanji',
                      titleVietnamese: 'Từ vựng: giáo viên',
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
        contentReleaseId: 'japanese-n5-v1',
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
        contentReleaseId: 'japanese-n5-v1',
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

  it('finds a learner-safe activity with its release and sequence context', () => {
    expect(findCatalogActivity(catalog, 'greetings-01', 'greeting-vocabulary')).toEqual(
      expect.objectContaining({
        activity: expect.objectContaining({ activityType: 'vocabulary' }),
        activitySequence: 2,
        contentReleaseId: 'japanese-n5-v1',
        lesson: expect.objectContaining({ lessonId: 'greetings-01' }),
      }),
    );
    expect(findCatalogActivity(catalog, 'greetings-01', 'not-published')).toBeNull();
  });

  it('returns only vocabulary contexts to the first interactive activity route', () => {
    expect(findCatalogVocabularyActivity(catalog, 'greetings-01', 'greeting-vocabulary')).toEqual(
      expect.objectContaining({
        activity: expect.objectContaining({ activityType: 'vocabulary' }),
      }),
    );
    expect(findCatalogVocabularyActivity(catalog, 'greetings-01', 'greeting-retrieval')).toBeNull();
  });
});
