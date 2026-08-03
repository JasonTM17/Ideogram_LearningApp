import { describe, expect, it } from 'vitest';

import { offlineMediaAssetSchema } from './offline-media-contract';

const asset = {
  activityId: 'ja-n5-listening-01',
  assetId: 'ja-n5-listening-01',
  contentReleaseId: 'ja-n5-v1',
  contentType: 'audio/mpeg' as const,
  lessonId: 'ja-n5-lesson-01',
  sha256: 'a'.repeat(64),
  sizeBytes: 8_192,
  titleVietnamese: 'Hội thoại chào hỏi',
  url: 'https://media.example.test/ja-n5-listening-01.mp3',
};

describe('offline media asset contract', () => {
  it('accepts a checksum-bound, bounded audio asset', () => {
    expect(offlineMediaAssetSchema.parse(asset)).toEqual(asset);
  });

  it('rejects an unbounded or checksum-less media declaration', () => {
    expect(offlineMediaAssetSchema.safeParse({ ...asset, sha256: 'missing' }).success).toBe(false);
    expect(
      offlineMediaAssetSchema.safeParse({ ...asset, sizeBytes: 50 * 1024 * 1024 + 1 }).success,
    ).toBe(false);
  });
});
