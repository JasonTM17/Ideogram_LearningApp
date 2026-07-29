import { describe, expect, it } from 'vitest';

import {
  learnerCatalogResponseSchema,
  projectLearnerCatalogResponse,
} from './learner-catalog-contract';

const originalProvenance = {
  authorName: 'Ideogram Learning Content Team',
  licenseReference: 'ideogram-original-v1',
  reviewerName: 'Vietnamese pedagogy reviewer',
  rights: {
    adaptationAllowed: true,
    aiProviderProcessingAllowed: true,
    embeddingAllowed: true,
    redistributionAllowed: true,
  },
  sourceKind: 'original' as const,
  sourceReference: 'Original educational content created for the closed beta.',
};

const learnerSafeCatalogSource = {
  languagePacks: [
    {
      availabilityState: 'active' as const,
      displayName: 'Tieng Nhat',
      languageCode: 'ja' as const,
      releases: [
        {
          contentReleaseId: 'ja-n5-pilot-v1',
          languageCode: 'ja' as const,
          levelCode: 'N5',
          objectiveKey: 'exam' as const,
          provenance: originalProvenance,
          releaseStatus: 'published' as const,
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
                            explanationVietnamese: 'Khong duoc lo ra cho learner.',
                            options: [
                              { isCorrect: true, optionId: 'option-a', text: 'こんにちは' },
                              { isCorrect: false, optionId: 'option-b', text: 'こんばんは' },
                            ],
                            prompt: 'Nguoi noi chao the nao?',
                            questionId: 'ja-n5-u1-l1-q1',
                          },
                        ],
                        transcript: 'こんにちは。',
                        transcriptVietnamese: 'Xin chao.',
                      },
                      provenance: originalProvenance,
                      status: 'published' as const,
                      targetScript: 'kana_kanji' as const,
                      titleVietnamese: 'Hoi thoai nghe',
                    },
                    {
                      activityId: 'ja-n5-u1-l1-retrieval',
                      activityType: 'retrieval' as const,
                      estimatedMinutes: 4,
                      instructionsVietnamese: 'Tu nho cau tra loi.',
                      payload: {
                        acceptedAnswers: ['わたし'],
                        prompt: 'Viet tu chi "toi" bang tieng Nhat.',
                        promptVietnamese: 'Nhap dap an ngan.',
                      },
                      provenance: originalProvenance,
                      status: 'published' as const,
                      targetScript: 'kana_kanji' as const,
                      titleVietnamese: 'Tu nho tu vung',
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

const [sourceLanguagePack] = learnerSafeCatalogSource.languagePacks;
if (!sourceLanguagePack) {
  throw new Error('Missing learner catalog language pack fixture.');
}

const [sourceRelease] = sourceLanguagePack.releases;
if (!sourceRelease) {
  throw new Error('Missing learner catalog release fixture.');
}

const [sourceUnit] = sourceRelease.units;
if (!sourceUnit) {
  throw new Error('Missing learner catalog unit fixture.');
}

const [sourceLesson] = sourceUnit.lessons;
if (!sourceLesson) {
  throw new Error('Missing learner catalog lesson fixture.');
}

const [sourceActivity] = sourceLesson.activities;
if (!sourceActivity) {
  throw new Error('Missing learner catalog activity fixture.');
}

describe('learner catalog contract', () => {
  it('projects Japanese published content into learner-safe prompt payloads', () => {
    const projected = projectLearnerCatalogResponse(learnerSafeCatalogSource);
    const listening = projected.languagePacks[0]?.releases[0]?.units[0]?.lessons[0]?.activities[0];
    const retrieval = projected.languagePacks[0]?.releases[0]?.units[0]?.lessons[0]?.activities[1];

    expect(learnerCatalogResponseSchema.parse(projected)).toEqual(projected);
    expect(listening).toBeDefined();
    expect(retrieval).toBeDefined();
    if (!listening || !retrieval) {
      throw new Error('Projected learner catalog fixture is incomplete.');
    }
    if (listening.activityType !== 'listening' || retrieval.activityType !== 'retrieval') {
      throw new Error('Projected learner catalog fixture changed activity types.');
    }
    const [firstQuestion] = listening.payload.questions;
    if (!firstQuestion) {
      throw new Error('Projected listening fixture is missing a question.');
    }
    const [firstOption] = firstQuestion.options;
    if (!firstOption) {
      throw new Error('Projected listening fixture is missing an option.');
    }

    expect(listening).toMatchObject({
      activityId: 'ja-n5-u1-l1-listening',
      activityType: 'listening',
      rubyAnnotationState: 'planned',
      payload: {
        audioAssetPath: 'media/ja/n5/u1/l1.mp3',
        audioProductionStatus: 'planned',
        transcript: 'こんにちは。',
      },
    });
    expect(listening.payload).not.toHaveProperty('audioSha256');
    expect(listening.payload).not.toHaveProperty('transcriptVietnamese');
    expect(firstQuestion).not.toHaveProperty('explanationVietnamese');
    expect(firstOption).not.toHaveProperty('isCorrect');
    expect(retrieval.payload).toEqual({
      prompt: 'Viet tu chi "toi" bang tieng Nhat.',
      promptVietnamese: 'Nhap dap an ngan.',
    });
    expect(retrieval.payload).not.toHaveProperty('acceptedAnswers');
  });

  it('rejects hidden packs and unpublished release trees', () => {
    expect(() =>
      projectLearnerCatalogResponse({
        ...learnerSafeCatalogSource,
        languagePacks: [{ ...sourceLanguagePack, availabilityState: 'hidden' }],
      }),
    ).toThrow('active language packs');
    expect(() =>
      projectLearnerCatalogResponse({
        ...learnerSafeCatalogSource,
        languagePacks: [
          {
            ...sourceLanguagePack,
            releases: [{ ...sourceRelease, releaseStatus: 'draft' }],
          },
        ],
      }),
    ).toThrow('published releases');
    expect(() =>
      projectLearnerCatalogResponse({
        ...learnerSafeCatalogSource,
        languagePacks: [
          {
            ...sourceLanguagePack,
            releases: [
              {
                ...sourceRelease,
                units: [
                  {
                    ...sourceUnit,
                    lessons: [
                      {
                        ...sourceLesson,
                        activities: [
                          {
                            ...sourceActivity,
                            status: 'draft',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow('published activities');
  });
});
