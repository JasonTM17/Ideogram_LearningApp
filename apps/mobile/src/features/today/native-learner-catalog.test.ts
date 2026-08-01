import { describe, expect, it } from 'vitest';

import {
  findCatalogActivity,
  findCatalogLesson,
  findCatalogVocabularyActivity,
  findFirstCatalogLesson,
} from './catalog-lesson-context';
import { createCatalogTracks } from './catalog-track-presentation';

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

describe('findFirstCatalogLesson', () => {
  it('keeps the backend catalog order and preserves lesson context', () => {
    expect(findFirstCatalogLesson(catalog)).toEqual(
      expect.objectContaining({
        contentReleaseId: 'japanese-n5-v1',
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

  it('finds only an exact published lesson identifier', () => {
    expect(findCatalogLesson(catalog, 'greetings-01')).toEqual(
      expect.objectContaining({
        contentReleaseId: 'japanese-n5-v1',
        lesson: expect.objectContaining({ titleVietnamese: 'Lời chào đầu tiên' }),
      }),
    );
    expect(findCatalogLesson(catalog, ' greetings-01')).toBeNull();
    expect(findCatalogLesson(catalog, 'missing-lesson')).toBeNull();
  });

  it('resolves a vocabulary activity from the same learner-safe release context', () => {
    expect(findCatalogActivity(catalog, 'greetings-01', 'greeting-vocabulary')).toEqual(
      expect.objectContaining({
        activity: expect.objectContaining({ activityType: 'vocabulary' }),
        activitySequence: 2,
        contentReleaseId: 'japanese-n5-v1',
      }),
    );
    expect(findCatalogActivity(catalog, 'greetings-01', ' greeting-vocabulary')).toBeNull();
    expect(findCatalogVocabularyActivity(catalog, 'greetings-01', 'greeting-vocabulary')).toEqual(
      expect.objectContaining({
        activity: expect.objectContaining({ activityType: 'vocabulary' }),
      }),
    );
    expect(findCatalogVocabularyActivity(catalog, 'greetings-01', 'greeting-retrieval')).toBeNull();
  });

  it('projects published tracks without deriving learner progress', () => {
    expect(createCatalogTracks(catalog)).toEqual([
      {
        contentReleaseId: 'japanese-n5-v1',
        firstLessonId: 'greetings-01',
        languageCode: 'ja',
        languageName: 'Tiếng Nhật',
        lessonCount: 1,
        levelCode: 'N5',
        releaseTitle: 'Nền tảng N5',
        totalMinutes: 10,
        unitCount: 1,
      },
    ]);
  });
});
