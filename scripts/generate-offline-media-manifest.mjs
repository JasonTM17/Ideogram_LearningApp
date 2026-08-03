import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(workspaceRoot, relativePath), 'utf8'));

const release = await readJson('content/japanese/v1/manifest.json');
const rights = await readJson('content/licenses/release-rights-status.json');
const registry = await readJson('content/media/recorded-audio-assets.json');
const outputPath = path.join(workspaceRoot, 'content/media/offline-media-manifest.json');
const requiredRights = [
  'adaptationAllowed',
  'aiProviderProcessingAllowed',
  'embeddingAllowed',
  'redistributionAllowed',
];

const canPublish =
  release.releaseStatus === 'published' &&
  rights.approvalStatus === 'approved' &&
  rights.contentReleaseId === release.contentReleaseId &&
  requiredRights.every((key) => rights.rights?.[key] === true);

const assets = [];
if (canPublish) {
  for (const unit of release.units ?? []) {
    for (const lesson of unit.lessons ?? []) {
      for (const activity of lesson.activities ?? []) {
        if (
          activity.activityType !== 'listening' ||
          activity.payload?.audioProductionStatus !== 'recorded'
        ) {
          continue;
        }
        const registered = registry.assets?.find(
          (candidate) => candidate.audioAssetPath === activity.payload.audioAssetPath,
        );
        if (!registered?.localFilePath || !registered?.publicUrl) {
          throw new TypeError(
            `Recorded audio ${activity.activityId} lacks registry delivery data.`,
          );
        }
        const bytes = await readFile(path.join(workspaceRoot, registered.localFilePath));
        const sha256 = createHash('sha256').update(bytes).digest('hex');
        if (sha256 !== activity.payload.audioSha256 || sha256 !== registered.sha256) {
          throw new TypeError(
            `Recorded audio ${activity.activityId} failed checksum verification.`,
          );
        }
        assets.push({
          activityId: activity.activityId,
          assetId: activity.activityId,
          contentReleaseId: release.contentReleaseId,
          contentType: 'audio/mpeg',
          lessonId: lesson.lessonId,
          sha256,
          sizeBytes: bytes.byteLength,
          titleVietnamese: activity.titleVietnamese,
          url: registered.publicUrl,
        });
      }
    }
  }
}

const manifest = {
  availability: assets.length > 0 ? 'available' : 'unavailable',
  releases: [
    {
      assets,
      contentReleaseId: release.contentReleaseId,
      version: release.version,
    },
  ],
};
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Offline media manifest generated with ${assets.length} verified asset(s).`);
