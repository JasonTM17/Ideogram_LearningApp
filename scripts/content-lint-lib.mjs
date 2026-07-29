import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  validateHiddenFixture,
  validateJapaneseManifest,
  validatePlacementPrompts,
} from './content-lint-validation.mjs';

const addError = (errors, location, message) => errors.push(`${location}: ${message}`);

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

export const lintContentWorkspace = ({ workspaceRoot }) => {
  const errors = [];
  const contentRoot = path.join(workspaceRoot, 'content');
  const japanesePath = path.join(contentRoot, 'japanese', 'v1', 'manifest.json');
  const placementPath = path.join(contentRoot, 'japanese', 'v1', 'placement-prompt-specs.json');
  const chinesePath = path.join(contentRoot, 'contract-fixtures', 'chinese', 'manifest.json');
  const koreanPath = path.join(contentRoot, 'contract-fixtures', 'korean', 'manifest.json');
  const licensePath = path.join(contentRoot, 'licenses', 'manifest.md');

  validateJapaneseManifest(readJson(japanesePath, errors), errors, japanesePath);
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

  return { errors, valid: errors.length === 0 };
};
