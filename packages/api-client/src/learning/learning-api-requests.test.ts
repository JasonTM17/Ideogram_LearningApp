import { describe, expect, it } from 'vitest';

import {
  createActivityAttemptApiRequest,
  createLearnerCatalogApiRequest,
  createLearnerReviewQueueApiRequest,
  createOfflineMediaManifestApiRequest,
  createPlacementAnswerApiRequest,
  createPlacementCatalogApiRequest,
  createPlacementSessionReadApiRequest,
  createPlacementSessionStartApiRequest,
  createPlacementSessionSubmitApiRequest,
  createReviewSubmissionApiRequest,
  parseActivityAttemptApiResponse,
  parseLearnerCatalogApiResponse,
  parseLearnerReviewQueueApiResponse,
  parseOfflineMediaManifestApiResponse,
  parsePlacementCatalogApiResponse,
  parseReviewSubmissionApiResponse,
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

  it('creates and validates the governed offline media manifest read', () => {
    const manifest = {
      availability: 'unavailable' as const,
      releases: [{ assets: [], contentReleaseId: 'ja-n5-pilot-v1', version: 'v1.0.0' }],
    };
    expect(createOfflineMediaManifestApiRequest()).toEqual({
      method: 'GET',
      path: plannedLearningApiRoutes.offlineMedia,
    });
    expect(parseOfflineMediaManifestApiResponse(manifest)).toEqual(manifest);
    expect(() =>
      parseOfflineMediaManifestApiResponse({ ...manifest, availability: 'available' }),
    ).toThrow();
  });

  it('creates and validates the learner-owned review queue GET descriptor', () => {
    const queueResponse = {
      items: [
        {
          activityId: 'ja-n5-u1-l1-vocabulary',
          contentReleaseId: 'ja-n5-pilot-v1',
          dueAt: '2026-08-03T00:00:00.000Z',
          itemId: '123e4567-e89b-42d3-a456-426614174003',
          sourceItemKey: 'vocabulary-1',
          state: 'learning' as const,
        },
      ],
    };

    expect(createLearnerReviewQueueApiRequest()).toEqual({
      method: 'GET',
      path: plannedLearningApiRoutes.reviewQueue,
    });
    expect(parseLearnerReviewQueueApiResponse(queueResponse)).toEqual(queueResponse);
    expect(() =>
      parseLearnerReviewQueueApiResponse({
        items: [{ ...queueResponse.items[0], state: 'forged' }],
      }),
    ).toThrow();
  });

  it('builds answer-safe placement routes without scoring data', () => {
    const sessionId = '123e4567-e89b-42d3-a456-426614174001';
    const questionId = '123e4567-e89b-42d3-a456-426614174002';
    const idempotencyKey = '123e4567-e89b-42d3-a456-426614174003';
    expect(createPlacementCatalogApiRequest()).toEqual({
      method: 'GET',
      path: plannedLearningApiRoutes.placementCatalog,
    });
    expect(
      createPlacementSessionStartApiRequest({ idempotencyKey, placementQuestionSetId: sessionId })
        .body,
    ).toMatchObject({ placementQuestionSetId: sessionId });
    expect(
      createPlacementAnswerApiRequest({
        sessionId,
        input: {
          answerPayload: { selectedChoice: 'A' },
          attemptNumber: 1,
          clientRecordedAt: null,
          deviceId: '123e4567-e89b-42d3-a456-426614174004',
          deviceSequence: 1,
          idempotencyKey,
          placementQuestionId: questionId,
          responseTimeMs: 0,
        },
      }).path,
    ).toBe(`/api/v1/learning/placement/sessions/${sessionId}/answers`);
    expect(createPlacementSessionSubmitApiRequest({ placementSessionId: sessionId })).toEqual({
      body: {},
      method: 'POST',
      path: `/api/v1/learning/placement/sessions/${sessionId}/submit`,
    });
    expect(createPlacementSessionReadApiRequest(sessionId)).toEqual({
      method: 'GET',
      path: `/api/v1/learning/placement/sessions/${sessionId}`,
    });
    expect(parsePlacementCatalogApiResponse({ questionSets: [] })).toEqual({ questionSets: [] });
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

  it('parses the review receipt envelope returned by the web API', () => {
    const reviewReceipt = {
      eventId: '123e4567-e89b-42d3-a456-426614174004',
      idempotentReplay: false,
      schedule: {
        algorithmVersion: 'srs-v1' as const,
        dueAt: '2026-07-30T00:00:00.000Z',
        easeFactor: 2.55,
        intervalMinutes: 1440,
        lapseCount: 0,
        repetitionCount: 1,
        state: 'review' as const,
      },
      serverReceiptSequence: 8,
    };

    expect(parseReviewSubmissionApiResponse(reviewReceipt)).toEqual(reviewReceipt);
    expect(() =>
      parseReviewSubmissionApiResponse({
        ...reviewReceipt,
        schedule: { ...reviewReceipt.schedule, intervalMinutes: 0 },
      }),
    ).toThrow();
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
      responsePayload: { acknowledged: true },
      reviewedAtClient: '2026-07-29T00:00:00.000Z',
      timezone: 'Asia/Ho_Chi_Minh',
    };

    expect(createActivityAttemptApiRequest(activityInput)).toEqual({
      body: activityInput,
      method: 'POST',
      path: plannedLearningApiRoutes.activitySubmit,
    });
  });

  it.each([
    { responsePayload: { missing: undefined } },
    { responsePayload: { notFinite: Number.NaN } },
    { responsePayload: { notFinite: Number.POSITIVE_INFINITY } },
    { responsePayload: { callable: () => undefined } },
    { responsePayload: { nested: [undefined] } },
  ])('rejects activity payloads that JSON would silently change: %o', (unsafe) => {
    expect(() =>
      createActivityAttemptApiRequest({
        activityId: 'ja-n5-u1-l1-vocab',
        contentReleaseId: 'ja-n5-pilot-v1',
        deviceId: '123e4567-e89b-42d3-a456-426614174001',
        deviceSequence: 8,
        idempotencyKey: '123e4567-e89b-42d3-a456-426614174004',
        responsePayload: unsafe.responsePayload,
        reviewedAtClient: '2026-07-29T00:00:00.000Z',
        timezone: 'Asia/Ho_Chi_Minh',
      }),
    ).toThrow();
  });

  it('rejects sparse arrays that JSON would fill with null', () => {
    const sparse: unknown[] = [];
    sparse[1] = 'sparse';

    expect(() =>
      createActivityAttemptApiRequest({
        activityId: 'ja-n5-u1-l1-vocab',
        contentReleaseId: 'ja-n5-pilot-v1',
        deviceId: '123e4567-e89b-42d3-a456-426614174001',
        deviceSequence: 8,
        idempotencyKey: '123e4567-e89b-42d3-a456-426614174004',
        responsePayload: { nested: sparse },
        reviewedAtClient: '2026-07-29T00:00:00.000Z',
        timezone: 'Asia/Ho_Chi_Minh',
      }),
    ).toThrow();
  });

  it('parses the activity receipt returned by the evaluated write boundary', () => {
    const activityReceipt = {
      attemptId: '123e4567-e89b-42d3-a456-426614174005',
      completedActivityCount: 1,
      completionState: 'completed' as const,
      idempotentReplay: false,
      lessonId: 'ja-n5-u1-l1',
      progressState: 'completed' as const,
      totalActivityCount: 1,
    };

    expect(parseActivityAttemptApiResponse(activityReceipt)).toEqual(activityReceipt);
    expect(() =>
      parseActivityAttemptApiResponse({ ...activityReceipt, completionState: 'forged' }),
    ).toThrow();
  });
});
