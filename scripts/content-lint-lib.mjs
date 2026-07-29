import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  validateHiddenFixture,
  validateJapaneseManifest,
  validatePlacementPrompts,
} from './content-lint-validation.mjs';
import { validateRecordedAudioAssets } from './content-lint-media-validation.mjs';

const addError = (errors, location, message) => errors.push(`${location}: ${message}`);

const rightKeys = [
  'adaptationAllowed',
  'aiProviderProcessingAllowed',
  'embeddingAllowed',
  'redistributionAllowed',
];

const readJson = (filePath, errors) => {
  if (!existsSync(filePath)) {
    addError(errors, filePath, 'required file is missing');
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    addError(errors, filePath, 'must contain valid JSON');
    return null;
  }
};

const validateLicenseLedger = (licensePath, errors) => {
  if (!existsSync(licensePath)) {
    addError(errors, licensePath, 'rights ledger is missing');
    return;
  }

  const licenseLedger = readFileSync(licensePath, 'utf8');
  for (const requiredHeading of [
    '## Japanese N5 pilot',
    '## Rights decision',
    '## Review ownership',
  ]) {
    if (!licenseLedger.includes(requiredHeading)) {
      addError(errors, licensePath, `missing ${requiredHeading}`);
    }
  }
};

const validateRightsStatus = ({ manifest, rightsStatus, errors, location }) => {
  if (!manifest || !rightsStatus) return;
  if (rightsStatus.contentReleaseId !== manifest.contentReleaseId) {
    addError(errors, location, 'rights status must belong to the generated release');
  }
  if (!['pending', 'approved'].includes(rightsStatus.approvalStatus)) {
    addError(errors, location, 'approvalStatus must be pending or approved');
  }
  const provenanceRecords = [
    { label: 'release', provenance: manifest.provenance },
    ...(Array.isArray(manifest.units) ? manifest.units : []).flatMap((unit) =>
      (Array.isArray(unit.lessons) ? unit.lessons : []).flatMap((lesson) =>
        (Array.isArray(lesson.activities) ? lesson.activities : []).map((activity) => ({
          label: `activity ${activity.activityId}`,
          provenance: activity.provenance,
        })),
      ),
    ),
  ];
  for (const { label, provenance } of provenanceRecords) {
    for (const key of rightKeys) {
      if (rightsStatus.rights?.[key] !== provenance?.rights?.[key]) {
        addError(errors, location, `rights status must match ${label} provenance for ${key}`);
      }
    }
  }

  if (rightsStatus.approvalStatus === 'pending') {
    if (rightKeys.some((key) => rightsStatus.rights?.[key] !== false)) {
      addError(errors, location, 'pending rights status must deny every product right');
    }
    if (rightsStatus.approvedAt !== null || rightsStatus.approvedBy !== null) {
      addError(
        errors,
        location,
        'pending rights status must not claim an approver or approval date',
      );
    }
  }

  if (rightsStatus.approvalStatus === 'approved') {
    if (!rightsStatus.approvedAt || !rightsStatus.approvedBy?.trim()) {
      addError(errors, location, 'approved rights status requires approver and approval date');
    }
  }

  if (
    manifest.releaseStatus === 'published' &&
    (rightsStatus.approvalStatus !== 'approved' ||
      rightKeys.some((key) => rightsStatus.rights?.[key] !== true))
  ) {
    addError(errors, location, 'published release requires approved rights for every product use');
  }
};

export const lintContentWorkspace = ({ workspaceRoot }) => {
  const errors = [];
  const contentRoot = path.join(workspaceRoot, 'content');
  const japanesePath = path.join(contentRoot, 'japanese', 'v1', 'manifest.json');
  const placementPath = path.join(contentRoot, 'japanese', 'v1', 'placement-prompt-specs.json');
  const chinesePath = path.join(contentRoot, 'contract-fixtures', 'chinese', 'manifest.json');
  const koreanPath = path.join(contentRoot, 'contract-fixtures', 'korean', 'manifest.json');
  const licensePath = path.join(contentRoot, 'licenses', 'manifest.md');
  const rightsStatusPath = path.join(contentRoot, 'licenses', 'release-rights-status.json');
  const recordedAudioRegistryPath = path.join(contentRoot, 'media', 'recorded-audio-assets.json');

  const japaneseManifest = readJson(japanesePath, errors);
  validateJapaneseManifest(japaneseManifest, errors, japanesePath);
  validatePlacementPrompts(readJson(placementPath, errors), errors, placementPath);
  validateHiddenFixture({
    fixture: readJson(chinesePath, errors),
    expectedLanguage: 'zh',
    expectedLevel: 'HSK_1',
    expectedScript: 'hanzi_simplified',
    errors,
    location: chinesePath,
  });
  validateHiddenFixture({
    fixture: readJson(koreanPath, errors),
    expectedLanguage: 'ko',
    expectedLevel: 'TOPIK_1',
    expectedScript: 'hangul',
    errors,
    location: koreanPath,
  });
  validateLicenseLedger(licensePath, errors);
  validateRightsStatus({
    errors,
    location: rightsStatusPath,
    manifest: japaneseManifest,
    rightsStatus: readJson(rightsStatusPath, errors),
  });
  validateRecordedAudioAssets({
    errors,
    manifest: japaneseManifest,
    registry: readJson(recordedAudioRegistryPath, errors),
    workspaceRoot,
  });

  return { errors, valid: errors.length === 0 };
};
