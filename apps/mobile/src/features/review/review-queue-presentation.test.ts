import { describe, expect, it } from 'vitest';

import { createNativeReviewQueuePresentation } from './review-queue-presentation';

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
          objectiveKey: 'exam',
          titleVietnamese: 'N5',
          units: [
            {
              lessons: [
                {
                  activities: [
                    {
                      activityId: 'greeting-vocabulary',
                      activityType: 'vocabulary',
                      estimatedMinutes: 5,
                      instructionsVietnamese: 'Học từ.',
                      payload: {
                        entries: [
                          {
                            example: {
                              translationVietnamese: 'Tôi là học sinh.',
                              value: '私は学生です。',
                            },
                            meaningVietnamese: 'tôi',
                            reading: 'わたし',
                            term: '私',
                          },
                        ],
                      },
                      rubyAnnotationState: 'planned',
                      targetScript: 'kana_kanji',
                      titleVietnamese: 'Chào hỏi',
                    },
                  ],
                  estimatedMinutes: 5,
                  lessonId: 'greeting',
                  sequence: 1,
                  summaryVietnamese: 'Mở đầu.',
                  titleVietnamese: 'Lời chào',
                },
              ],
              sequence: 1,
              titleVietnamese: 'Bắt đầu',
              unitId: 'unit-1',
            },
          ],
          version: 'v1.0.0',
        },
      ],
    },
  ],
};

const queue: ReviewQueueResponse = {
  items: [
    {
      activityId: 'greeting-vocabulary',
      contentReleaseId: 'japanese-n5-v1',
      dueAt: '2026-08-03T00:00:00.000Z',
      itemId: '123e4567-e89b-42d3-a456-426614174003',
      sourceItemKey: 'vocabulary-1',
      state: 'learning',
    },
  ],
};

describe('native review queue presentation', () => {
  it('maps one owned queue item to the matching learner-safe vocabulary prompt', () => {
    expect(createNativeReviewQueuePresentation(queue, catalog)).toMatchObject({
      items: [{ entry: { meaningVietnamese: 'tôi', term: '私' }, lessonTitle: 'Lời chào' }],
      unavailableItemCount: 0,
    });
  });

  it('does not fabricate a card for incompatible source data', () => {
    const item = queue.items[0];
    if (!item) throw new Error('Review queue fixture is missing its item.');

    expect(
      createNativeReviewQueuePresentation(
        { items: [{ ...item, sourceItemKey: 'vocabulary-2' }] },
        catalog,
      ),
    ).toEqual({ items: [], unavailableItemCount: 1 });
  });
});
