const hanziPattern = /^\p{Script=Han}+$/u;
const hangulPattern = /^\p{Script=Hangul}+$/u;
const koreanRomanizationPattern = /^[a-z]+(?:\s+[a-z]+)*$/u;
const pinyinPattern = /^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(?:\s+[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+)*$/iu;
const pinyinTonePattern = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/iu;

const addError = (errors, location, message) => errors.push(`${location}: ${message}`);
const isNonBlankString = (value) => typeof value === 'string' && value.trim().length > 0;

const validateSharedFixtureContract = ({
  fixture,
  expectedLanguage,
  expectedLevel,
  expectedScript,
  errors,
  location,
}) => {
  if (
    fixture.fixtureOnly !== true ||
    fixture.releaseStatus !== 'draft' ||
    fixture.languageCode !== expectedLanguage ||
    fixture.levelCode !== expectedLevel ||
    fixture.targetScript !== expectedScript
  ) {
    addError(
      errors,
      location,
      'fixture must stay a hidden draft with its expected language contract',
    );
  }
  if (
    fixture.examMapping?.framework !== (expectedLanguage === 'zh' ? 'HSK' : 'TOPIK') ||
    fixture.examMapping?.level !== expectedLevel ||
    fixture.rubricContract?.targetScript !== expectedScript ||
    fixture.rubricContract?.romanizationRequired !== true
  ) {
    addError(
      errors,
      location,
      'fixture must declare its exam mapping and target-script rubric contract',
    );
  }
};

const validateChineseFixture = ({ fixture, errors, location }) => {
  if (!isNonBlankString(fixture.romanization) || !pinyinPattern.test(fixture.romanization)) {
    addError(errors, location, 'Chinese fixture requires valid pinyin romanization');
  }
  if (!pinyinTonePattern.test(fixture.romanization ?? '')) {
    addError(errors, location, 'Chinese fixture requires tone-marked pinyin');
  }
  if (!Array.isArray(fixture.segmentation) || fixture.segmentation.length === 0) {
    addError(errors, location, 'Chinese fixture requires segmented tokens');
    return;
  }
  for (const token of fixture.segmentation) {
    if (
      !hanziPattern.test(token.surface ?? '') ||
      !pinyinPattern.test(token.pinyin ?? '') ||
      !pinyinTonePattern.test(token.pinyin ?? '')
    ) {
      addError(errors, location, 'Chinese tokens require Hanzi surfaces and pinyin');
    }
  }
};

const validateKoreanFixture = ({ fixture, errors, location }) => {
  if (
    !isNonBlankString(fixture.romanization) ||
    !koreanRomanizationPattern.test(fixture.romanization)
  ) {
    addError(errors, location, 'Korean fixture requires latin romanization');
  }
  if (!Array.isArray(fixture.segmentation) || fixture.segmentation.length === 0) {
    addError(errors, location, 'Korean fixture requires segmented tokens');
    return;
  }
  for (const token of fixture.segmentation) {
    if (
      !hangulPattern.test(token.surface ?? '') ||
      !koreanRomanizationPattern.test(token.romanization ?? '')
    ) {
      addError(errors, location, 'Korean tokens require Hangul surfaces and latin romanization');
    }
  }
};

export const validateHiddenFixture = ({
  fixture,
  expectedLanguage,
  expectedLevel,
  expectedScript,
  errors,
  location,
}) => {
  if (!fixture || typeof fixture !== 'object') return;
  validateSharedFixtureContract({
    errors,
    expectedLanguage,
    expectedLevel,
    expectedScript,
    fixture,
    location,
  });
  if (expectedLanguage === 'zh') {
    validateChineseFixture({ errors, fixture, location });
  }
  if (expectedLanguage === 'ko') {
    validateKoreanFixture({ errors, fixture, location });
  }
};
