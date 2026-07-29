import {
  validateListeningPayload,
  validateVocabularyPayload,
} from './content-lint-payload-validation.mjs';
import { validateHiddenFixture } from './content-lint-fixture-validation.mjs';

const identifierPattern = /^[a-z0-9][a-z0-9-]{1,118}$/u;
const placementRootKeys = new Set([
  'languageCode',
  'levelCode',
  'purposeVietnamese',
  'questions',
  'releaseStatus',
  'targetScript',
]);
const placementQuestionKeys = new Set([
  'interactionType',
  'placementQuestionKey',
  'promptVietnamese',
  'sequence',
  'skill',
  'targetPrompt',
]);

const requiredRights = [
  'adaptationAllowed',
  'aiProviderProcessingAllowed',
  'embeddingAllowed',
  'redistributionAllowed',
];

const addError = (errors, location, message) => errors.push(`${location}: ${message}`);

const hasValidProvenance = (provenance) =>
  provenance &&
  typeof provenance.authorName === 'string' &&
  provenance.authorName.trim().length > 0 &&
  typeof provenance.licenseReference === 'string' &&
  provenance.licenseReference.trim().length > 0 &&
  typeof provenance.sourceReference === 'string' &&
  provenance.sourceReference.trim().length > 0 &&
  requiredRights.every((right) => typeof provenance.rights?.[right] === 'boolean');

const validateActivity = ({ activity, errors, isPublishedRelease, location }) => {
  if (!identifierPattern.test(activity.activityId ?? '')) {
    addError(errors, location, 'activityId must be a stable kebab-case identifier');
  }

  for (const field of ['titleVietnamese', 'instructionsVietnamese']) {
    if (typeof activity[field] !== 'string' || activity[field].trim().length === 0) {
      addError(errors, location, `${field} is required for Vietnamese-first delivery`);
    }
  }

  if (!hasValidProvenance(activity.provenance)) {
    addError(
      errors,
      location,
      'activity requires author, license, source, and all four rights flags',
    );
  }
  if (['reviewed', 'published'].includes(activity.status) && !activity.provenance?.reviewerName) {
    addError(errors, location, 'reviewed or published activity requires a named reviewer');
  }
  if (isPublishedRelease && activity.status !== 'published') {
    addError(errors, location, 'published release cannot contain non-published activity');
  }

  if (activity.activityType === 'listening') {
    validateListeningPayload({ activity, errors, isPublishedRelease, location });
  } else if (activity.activityType === 'vocabulary') {
    validateVocabularyPayload({ activity, errors, location });
  } else {
    addError(errors, location, 'pilot activity type must be vocabulary or listening');
  }
};

export const validateJapaneseManifest = (manifest, errors, location) => {
  if (!manifest || typeof manifest !== 'object') return;
  if (manifest.languageCode !== 'ja' || manifest.levelCode !== 'N5') {
    addError(errors, location, 'pilot manifest must be scoped to Japanese N5');
  }
  if (!['review', 'published'].includes(manifest.releaseStatus)) {
    addError(errors, location, 'pilot release must be review or published');
  }
  if (!hasValidProvenance(manifest.provenance)) {
    addError(
      errors,
      location,
      'release requires author, license, source, and all four rights flags',
    );
  }

  const units = Array.isArray(manifest.units) ? manifest.units : [];
  if (units.length !== 2) addError(errors, location, 'pilot requires exactly two units');
  const lessons = units.flatMap((unit) => (Array.isArray(unit.lessons) ? unit.lessons : []));
  if (lessons.length !== 12) addError(errors, location, 'pilot requires exactly twelve lessons');

  const activities = lessons.flatMap((lesson) =>
    Array.isArray(lesson.activities) ? lesson.activities : [],
  );
  const activityIds = activities.map((activity) => activity.activityId);
  if (new Set(activityIds).size !== activityIds.length) {
    addError(errors, location, 'activity IDs must be unique across the release');
  }
  for (const activity of activities) {
    validateActivity({
      activity,
      errors,
      isPublishedRelease: manifest.releaseStatus === 'published',
      location: `${location}#${activity.activityId ?? 'unknown'}`,
    });
  }

  const vocabularyEntries = activities
    .filter((activity) => activity.activityType === 'vocabulary')
    .flatMap((activity) => activity.payload?.entries ?? []);
  if (vocabularyEntries.length < 150) {
    addError(errors, location, 'pilot requires at least 150 authored vocabulary/review entries');
  }
  if (activities.filter((activity) => activity.activityType === 'listening').length < 40) {
    addError(errors, location, 'pilot requires at least 40 transcripted listening activities');
  }
};

const hasOnlyKeys = (value, allowedKeys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => allowedKeys.has(key));

export const validatePlacementPrompts = (placement, errors, location) => {
  if (!placement || typeof placement !== 'object') return;
  if (!hasOnlyKeys(placement, placementRootKeys)) {
    addError(errors, location, 'placement bundle must use only learner-safe allowlisted fields');
  }
  if (placement.languageCode !== 'ja' || placement.levelCode !== 'N5') {
    addError(errors, location, 'placement prompts must be scoped to Japanese N5');
  }
  const questions = Array.isArray(placement.questions) ? placement.questions : [];
  if (questions.length < 25 || questions.length > 30) {
    addError(errors, location, 'placement requires 25–30 learner-safe prompt specifications');
  }
  for (const question of questions) {
    if (!hasOnlyKeys(question, placementQuestionKeys)) {
      addError(
        errors,
        location,
        'placement question must use only learner-safe allowlisted fields',
      );
    }
    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      continue;
    }
    if (!identifierPattern.test(question.placementQuestionKey ?? '')) {
      addError(errors, location, 'every placement prompt needs a stable key');
    }
    if (!question.promptVietnamese?.trim() || !question.targetPrompt?.trim()) {
      addError(
        errors,
        location,
        'every placement prompt needs Vietnamese and target-language prompts',
      );
    }
  }
};

export { validateHiddenFixture };
