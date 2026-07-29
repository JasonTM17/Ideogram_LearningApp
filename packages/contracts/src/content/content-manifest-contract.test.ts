import { describe, expect, it } from 'vitest';

import { contentReleaseManifestSchema } from './content-manifest-contract';

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

const publishedManifest = {
  contentReleaseId: 'ja-n5-pilot-v1',
  languageCode: 'ja' as const,
  levelCode: 'N5',
  objectiveKey: 'exam' as const,
  provenance: originalProvenance,
  releaseStatus: 'published' as const,
  titleVietnamese: 'Tiếng Nhật N5 — khởi động',
  units: [
    {
      lessons: [
        {
          activities: [
            {
              activityId: 'ja-n5-u1-l1-vocab',
              activityType: 'vocabulary' as const,
              estimatedMinutes: 5,
              instructionsVietnamese: 'Đọc và nhớ từ mới.',
              payload: {
                entries: [
                  {
                    example: { translationVietnamese: 'Tôi là Minh.', value: 'わたしはミンです。' },
                    meaningVietnamese: 'tôi',
                    reading: 'わたし',
                    term: '私',
                  },
                ],
              },
              provenance: originalProvenance,
              status: 'published' as const,
              targetScript: 'kana_kanji' as const,
              titleVietnamese: 'Từ vựng chào hỏi',
            },
          ],
          estimatedMinutes: 10,
          lessonId: 'ja-n5-u1-l1',
          sequence: 1,
          summaryVietnamese: 'Chào hỏi và tự giới thiệu rất ngắn.',
          titleVietnamese: 'Xin chào',
        },
      ],
      sequence: 1,
      titleVietnamese: 'Bắt đầu với tiếng Nhật',
      unitId: 'ja-n5-u1',
    },
  ],
  version: 'v1.0.0',
};

describe('content release manifest contract', () => {
  it('accepts original reviewed Japanese pilot content', () => {
    expect(contentReleaseManifestSchema.parse(publishedManifest)).toMatchObject({
      contentReleaseId: 'ja-n5-pilot-v1',
      languageCode: 'ja',
    });
  });

  it('rejects a published release with an unreviewed activity', () => {
    const result = contentReleaseManifestSchema.safeParse({
      ...publishedManifest,
      units: [
        {
          ...publishedManifest.units[0],
          lessons: [
            {
              ...publishedManifest.units[0]?.lessons[0],
              activities: [
                {
                  ...publishedManifest.units[0]?.lessons[0]?.activities[0],
                  provenance: { ...originalProvenance, reviewerName: null },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
