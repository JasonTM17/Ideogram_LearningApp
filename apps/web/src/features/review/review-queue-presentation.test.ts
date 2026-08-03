import { describe, expect, it } from 'vitest';

import { createReviewQueuePresentation } from './review-queue-presentation';

import type { LearnerCatalogResponse, ReviewQueueResponse } from '@ideogram/contracts';

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
                      activityId: 'greeting-vocabulary',
                      activityType: 'vocabulary',
                      estimatedMinutes: 4,
                      instructionsVietnamese: 'Đọc từ.',
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
                  estimatedMinutes: 5,
                  lessonId: 'greetings-01',
                  sequence: 1,
                  summaryVietnamese: 'Chào hỏi.',
                  titleVietnamese: 'Lời chào đầu tiên',
                },
              ],
              sequence: 1,
              titleVietnamese: 'Bắt đầu',
              unitId: 'greetings',
            },
          ],
          version: 'v1.0.0',
        },
      ],
    },
  ],
};

const item = {
  activityId: 'greeting-vocabulary',
  contentReleaseId: 'japanese-n5-v1',
  dueAt: '2026-08-03T07:00:00.000Z',
  itemId: '123e4567-e89b-42d3-a456-426614174003',
  sourceItemKey: 'vocabulary-1',
  state: 'learning',
} as const;

describe('review queue presentation', () => {
  it('maps a versioned vocabulary source position to the learner-safe entry', () => {
    expect(createReviewQueuePresentation({ items: [item] }, catalog)).toEqual({
      items: [
        expect.objectContaining({
          activityTitle: 'Từ vựng: giáo viên',
          entry: expect.objectContaining({ meaningVietnamese: 'giáo viên', term: '先生' }),
          lessonTitle: 'Lời chào đầu tiên',
        }),
      ],
      unavailableItemCount: 0,
    });
  });

  it('keeps legacy or unavailable review records out of the focused vocabulary flow', () => {
    const queue: ReviewQueueResponse = {
      items: [
        { ...item, sourceItemKey: 'legacy-card' },
        { ...item, itemId: '123e4567-e89b-42d3-a456-426614174004', sourceItemKey: 'vocabulary-2' },
      ],
    };

    expect(createReviewQueuePresentation(queue, catalog)).toEqual({
      items: [],
      unavailableItemCount: 2,
    });
  });
});
