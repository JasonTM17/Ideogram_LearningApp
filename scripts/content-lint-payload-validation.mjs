const optionIdentifierPattern = /^[a-z0-9-]{2,80}$/u;
const sha256Pattern = /^[a-f0-9]{64}$/u;

const addError = (errors, location, message) => errors.push(`${location}: ${message}`);

const isNonBlankString = (value) => typeof value === 'string' && value.trim().length > 0;

const validateObjectiveQuestion = ({ question, errors, location }) => {
  if (!optionIdentifierPattern.test(question.questionId ?? '')) {
    addError(errors, location, 'listening question requires a stable questionId');
  }
  if (!isNonBlankString(question.prompt) || !isNonBlankString(question.explanationVietnamese)) {
    addError(errors, location, 'listening question requires prompt and Vietnamese explanation');
  }

  const options = Array.isArray(question.options) ? question.options : [];
  if (options.length < 2 || options.length > 6) {
    addError(errors, location, 'listening question requires 2–6 options');
  }
  if (options.filter((option) => option.isCorrect === true).length !== 1) {
    addError(errors, location, 'listening question must have exactly one correct option');
  }
  for (const option of options) {
    if (!optionIdentifierPattern.test(option.optionId ?? '') || !isNonBlankString(option.text)) {
      addError(errors, location, 'listening option requires an identifier and text');
    }
  }
};

export const validateListeningPayload = ({ activity, errors, isPublishedRelease, location }) => {
  const payload = activity.payload ?? {};
  if (!isNonBlankString(payload.transcript) || !isNonBlankString(payload.transcriptVietnamese)) {
    addError(errors, location, 'listening activity requires source and Vietnamese transcripts');
  }
  if (!/^media\/ja\/n5\/[a-z0-9-]+\.mp3$/u.test(payload.audioAssetPath ?? '')) {
    addError(errors, location, 'listening audioAssetPath must be a scoped JA N5 media key');
  }

  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  if (questions.length === 0) {
    addError(errors, location, 'listening activity requires at least one comprehension question');
  }
  for (const question of questions) {
    validateObjectiveQuestion({ question, errors, location });
  }

  if (!['planned', 'recorded'].includes(payload.audioProductionStatus)) {
    addError(errors, location, 'listening audioProductionStatus must be planned or recorded');
  }
  if (isPublishedRelease && payload.audioProductionStatus !== 'recorded') {
    addError(errors, location, 'published listening activity must have recorded audio');
  }
  if (
    payload.audioProductionStatus === 'recorded' &&
    !sha256Pattern.test(payload.audioSha256 ?? '')
  ) {
    addError(errors, location, 'recorded audio requires an integrity checksum');
  }
};

export const validateVocabularyPayload = ({ activity, errors, location }) => {
  const entries = Array.isArray(activity.payload?.entries) ? activity.payload.entries : [];
  if (entries.length === 0 || entries.length > 40) {
    addError(errors, location, 'vocabulary activity requires 1–40 entries');
  }
  for (const entry of entries) {
    if (
      !isNonBlankString(entry.term) ||
      !isNonBlankString(entry.reading) ||
      !isNonBlankString(entry.meaningVietnamese) ||
      !isNonBlankString(entry.example?.value) ||
      !isNonBlankString(entry.example?.translationVietnamese)
    ) {
      addError(
        errors,
        location,
        'vocabulary entry requires term, reading, Vietnamese meaning, and bilingual example',
      );
    }
  }
};
