import { z } from 'zod';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const stableHttpsUrlSchema = z
  .string()
  .url()
  .max(2_000)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.search === '' &&
      url.hash === ''
    );
  }, 'Offline media URL must be a stable HTTPS URL without credentials or query tokens.');

export const offlineMediaCacheNamespaceSchema = z
  .object({
    contentReleaseId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,119}$/u),
    userId: z.uuid(),
  })
  .strict();

export const offlineMediaAssetSchema = z
  .object({
    activityId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,119}$/u),
    assetId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,119}$/u),
    contentReleaseId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,119}$/u),
    contentType: z.literal('audio/mpeg'),
    lessonId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,119}$/u),
    sha256: sha256Schema,
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(50 * 1024 * 1024),
    titleVietnamese: z.string().min(1).max(240),
    url: stableHttpsUrlSchema,
  })
  .strict();

export type OfflineMediaAsset = z.infer<typeof offlineMediaAssetSchema>;
export type OfflineMediaCacheNamespace = z.infer<typeof offlineMediaCacheNamespaceSchema>;

export const offlineMediaManifestSchema = z
  .object({
    availability: z.enum(['available', 'unavailable']),
    releases: z
      .array(
        z
          .object({
            assets: z.array(offlineMediaAssetSchema).max(25),
            contentReleaseId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,119}$/u),
            version: z.string().regex(/^v\d+\.\d+\.\d+$/u),
          })
          .strict(),
      )
      .max(1),
  })
  .strict()
  .superRefine((manifest, context) => {
    const assetCount = manifest.releases.reduce(
      (count, release) => count + release.assets.length,
      0,
    );
    if (manifest.availability === 'available' && assetCount === 0) {
      context.addIssue({ code: 'custom', message: 'Available media manifest requires an asset.' });
    }
    if (manifest.availability === 'unavailable' && assetCount > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Unavailable media manifest cannot expose assets.',
      });
    }
    for (const release of manifest.releases) {
      if (release.assets.some((asset) => asset.contentReleaseId !== release.contentReleaseId)) {
        context.addIssue({
          code: 'custom',
          message: 'Offline media asset must match its release namespace.',
        });
      }
    }
  });

export type OfflineMediaManifest = z.infer<typeof offlineMediaManifestSchema>;
