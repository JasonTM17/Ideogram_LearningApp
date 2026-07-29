import { describe, expect, it } from 'vitest';

import {
  createActivityAttemptApiRequest,
  createLearnerCatalogApiRequest,
  createReviewSubmissionApiRequest,
  parseLearnerCatalogApiResponse,
  plannedLearningApiRoutes,
} from './learning-api-requests';

describe('learning API requests', () => {
  const catalogResponse = {
    languagePacks: [
      {
        displayName: 'Tieng Nhat',
        languageCode: 'ja' as const,
        releases: [
          {
            contentReleaseId: 'ja-n5-pilot-v1',
            levelCode: 'N5',
            objectiveKey: 'exam' as const,
            titleVietnamese: 'Tieng Nhat N5',
            units: [
              {
                lessons: [
                  {
                    activities: [
                      {
                        activityId: 'ja-n5-u1-l1-listening',
                        activityType: 'listening' as const,
                        estimatedMinutes: 6,
                        instructionsVietnamese: 'Nghe va chon dap an dung.',
                        payload: {
                          audioAssetPath: 'media/ja/n5/u1/l1.mp3',
                          audioProductionStatus: 'planned' as const,
                          questions: [
                            {
                              options: [
                                { optionId: 'option-a', text: 'こんにちは' },
                                { optionId: 'option-b', text: 'こんばんは' },
                              ],
                              prompt: 'Nguoi noi chao the nao?',
                              questionId: 'ja-n5-u1-l1-q1',
                            },
                          ],
                          transcript: 'こんにちは。',
                        },
                        rubyAnnotationState: 'planned' as const,
                        targetScript: 'kana_kanji' as const,
                        titleVietnamese: 'Hoi thoai nghe',
                      },
                    ],
                    estimatedMinutes: 10,
                    lessonId: 'ja-n5-u1-l1',
                    sequence: 1,
                    summaryVietnamese: 'Chao hoi va gioi thieu ngan.',
                    titleVietnamese: 'Xin chao',
                  },
                ],
                sequence: 1,
                titleVietnamese: 'Bat dau voi tieng Nhat',
                unitId: 'ja-n5-u1',
              },
            ],
            version: 'v1.0.0',
          },
        ],
      },
    ],
  };

  it('creates the learner catalog GET descriptor for web and mobile reads', () => {
    expect(createLearnerCatalogApiRequest()).toEqual({
      method: 'GET',
      path: plannedLearningApiRoutes.catalog,
    });
  });

  it('parses only the learner-safe catalog response shape', () => {
    expect(parseLearnerCatalogApiResponse(catalogResponse)).toEqual(catalogResponse);
    expect(() =>
      parseLearnerCatalogApiResponse({
        ...catalogResponse,
        languagePacks: [
          {
            ...catalogResponse.languagePacks[0],
            availabilityState: 'active',
          },
        ],
      }),
    ).toThrow();
  });

  const reviewInput = {
    deviceId: '123e4567-e89b-42d3-a456-426614174001',
    deviceSequence: 7,
    grade: 'good',
    idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
    itemId: '123e4567-e89b-42d3-a456-426614174003',
    reviewedAtClient: '2026-07-29T00:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
  };

  it('creates the single review operation envelope shared by web and mobile', () => {
    expect(createReviewSubmissionApiRequest(reviewInput)).toEqual({
      body: reviewInput,
      method: 'POST',
      path: plannedLearningApiRoutes.reviewSubmit,
    });
  });

  it('fails closed when a device sequence is not a positive integer', () => {
    expect(() => createReviewSubmissionApiRequest({ ...reviewInput, deviceSequence: 0 })).toThrow();
  });

  it('creates the activity envelope without exposing server evaluation fields', () => {
    const activityInput = {
      activityId: 'ja-n5-u1-l1-vocab',
      contentReleaseId: 'ja-n5-pilot-v1',
      deviceId: '123e4567-e89b-42d3-a456-426614174001',
      deviceSequence: 8,
      idempotencyKey: '123e4567-e89b-42d3-a456-426614174004',
      responsePayload: { answer: '私' },
      reviewedAtClient: '2026-07-29T00:00:00.000Z',
      timezone: 'Asia/Ho_Chi_Minh',
    };

    expect(createActivityAttemptApiRequest(activityInput)).toEqual({
      body: activityInput,
      method: 'POST',
      path: plannedLearningApiRoutes.activitySubmit,
    });
  });
});
