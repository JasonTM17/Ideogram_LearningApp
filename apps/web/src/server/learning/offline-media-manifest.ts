import { contentReleaseManifestSchema, offlineMediaManifestSchema } from '@ideogram/contracts';

import manifestData from '../../../../../content/media/offline-media-manifest.json';
import releaseData from '../../../../../content/japanese/v1/manifest.json';
import rightsData from '../../../../../content/licenses/release-rights-status.json';

import type { OfflineMediaManifest } from '@ideogram/contracts';

const requiredRights = [
  'adaptationAllowed',
  'aiProviderProcessingAllowed',
  'embeddingAllowed',
  'redistributionAllowed',
] as const;

export const resolveOfflineMediaManifest = ({
  manifest,
  release,
  rights,
}: {
  manifest: unknown;
  release: unknown;
  rights: unknown;
}): OfflineMediaManifest => {
  const validRelease = contentReleaseManifestSchema.parse(release);
  const unavailable: OfflineMediaManifest = {
    availability: 'unavailable',
    releases: [
      {
        assets: [],
        contentReleaseId: validRelease.contentReleaseId,
        version: validRelease.version,
      },
    ],
  };
  if (!rights || typeof rights !== 'object') return unavailable;
  const approval = rights as {
    approvalStatus?: unknown;
    contentReleaseId?: unknown;
    rights?: Record<string, unknown>;
  };
  if (
    validRelease.releaseStatus !== 'published' ||
    approval.approvalStatus !== 'approved' ||
    approval.contentReleaseId !== validRelease.contentReleaseId ||
    requiredRights.some((key) => approval.rights?.[key] !== true)
  ) {
    return unavailable;
  }

  const validManifest = offlineMediaManifestSchema.parse(manifest);
  const matchingRelease = validManifest.releases.find(
    (item) =>
      item.contentReleaseId === validRelease.contentReleaseId &&
      item.version === validRelease.version,
  );
  return validManifest.availability === 'available' && matchingRelease
    ? { availability: 'available', releases: [matchingRelease] }
    : unavailable;
};

export const readOfflineMediaManifest = (): OfflineMediaManifest =>
  resolveOfflineMediaManifest({ manifest: manifestData, release: releaseData, rights: rightsData });
