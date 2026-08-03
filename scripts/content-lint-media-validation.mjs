import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const addError = (errors, location, message) => errors.push(`${location}: ${message}`);

const getRecordedListeningActivities = (manifest) =>
  manifest?.units
    ?.flatMap((unit) => unit.lessons ?? [])
    .flatMap((lesson) => lesson.activities ?? [])
    .filter(
      (activity) =>
        activity.activityType === 'listening' &&
        activity.payload?.audioProductionStatus === 'recorded',
    ) ?? [];

const isInsideDirectory = (candidatePath, directoryPath) => {
  const relativePath = path.relative(directoryPath, candidatePath);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const validateRecordedAsset = ({ activity, asset, audioRoot, errors, workspaceRoot }) => {
  const location = `recorded audio ${activity.activityId}`;
  if (!asset) {
    addError(errors, location, 'missing verified asset registry entry');
    return;
  }
  if (asset.sha256 !== activity.payload.audioSha256) {
    addError(errors, location, 'registry checksum must match listening payload checksum');
  }
  if (typeof asset.localFilePath !== 'string') {
    addError(errors, location, 'registry entry requires a localFilePath');
    return;
  }
  if (typeof asset.publicUrl !== 'string') {
    addError(errors, location, 'registry entry requires a publicUrl');
  } else {
    try {
      const publicUrl = new URL(asset.publicUrl);
      if (
        publicUrl.protocol !== 'https:' ||
        publicUrl.username ||
        publicUrl.password ||
        publicUrl.search ||
        publicUrl.hash
      ) {
        addError(
          errors,
          location,
          'registry publicUrl must be stable HTTPS without credentials or query',
        );
      }
    } catch {
      addError(errors, location, 'registry publicUrl must be a valid HTTPS URL');
    }
  }

  const localAssetPath = path.resolve(workspaceRoot, asset.localFilePath);
  if (!isInsideDirectory(localAssetPath, audioRoot)) {
    addError(errors, location, 'registry localFilePath must stay inside content/media/audio');
    return;
  }
  if (!existsSync(localAssetPath)) {
    addError(errors, location, 'recorded local media file is missing');
    return;
  }

  const actualChecksum = createHash('sha256').update(readFileSync(localAssetPath)).digest('hex');
  if (actualChecksum !== activity.payload.audioSha256 || actualChecksum !== asset.sha256) {
    addError(errors, location, 'recorded local media checksum does not match declared checksum');
  }
};

export const validateRecordedAudioAssets = ({ manifest, registry, errors, workspaceRoot }) => {
  const recordedActivities = getRecordedListeningActivities(manifest);
  if (recordedActivities.length === 0) return;
  if (!Array.isArray(registry?.assets)) {
    addError(
      errors,
      'content/media/recorded-audio-assets.json',
      'registry requires an assets array',
    );
    return;
  }

  const assetKeys = registry.assets.map((asset) => asset.audioAssetPath);
  if (new Set(assetKeys).size !== assetKeys.length) {
    addError(
      errors,
      'content/media/recorded-audio-assets.json',
      'registry audioAssetPath values must be unique',
    );
  }
  const audioRoot = path.resolve(workspaceRoot, 'content/media/audio');
  for (const activity of recordedActivities) {
    const asset = registry.assets.find(
      (candidate) => candidate.audioAssetPath === activity.payload.audioAssetPath,
    );
    validateRecordedAsset({ activity, asset, audioRoot, errors, workspaceRoot });
  }
};
