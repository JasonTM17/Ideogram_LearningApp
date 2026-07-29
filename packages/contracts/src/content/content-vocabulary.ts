export const languagePackCodes = ['ja', 'zh', 'ko'] as const;
export const contentIdentifierPattern = /^[a-z0-9][a-z0-9-]{1,118}$/u;
export const activityTypes = [
  'reading',
  'listening',
  'vocabulary',
  'grammar',
  'retrieval',
  'objective_quiz',
  'speaking',
  'writing',
] as const;
export const contentItemStatuses = ['draft', 'reviewed', 'published', 'archived'] as const;
export const contentReleaseStatuses = ['draft', 'review', 'published', 'archived'] as const;
export const contentSourceKinds = ['original', 'licensed', 'public_domain'] as const;
export const learningObjectiveKeys = ['exam', 'communication', 'work', 'travel'] as const;
export const targetScriptKinds = [
  'kana_kanji',
  'hanzi_simplified',
  'hangul',
  'latin',
  'mixed',
] as const;

export const languageLevelCodes = {
  ja: ['N5', 'N4', 'N3', 'N2', 'N1'],
  ko: ['TOPIK_1', 'TOPIK_2', 'TOPIK_3', 'TOPIK_4', 'TOPIK_5', 'TOPIK_6'],
  zh: ['HSK_1', 'HSK_2', 'HSK_3', 'HSK_4', 'HSK_5', 'HSK_6'],
} as const;

export type ActivityType = (typeof activityTypes)[number];
export type ContentItemStatus = (typeof contentItemStatuses)[number];
export type ContentReleaseStatus = (typeof contentReleaseStatuses)[number];
export type ContentSourceKind = (typeof contentSourceKinds)[number];
export type LanguagePackCode = (typeof languagePackCodes)[number];
export type LearningObjectiveKey = (typeof learningObjectiveKeys)[number];
export type TargetScriptKind = (typeof targetScriptKinds)[number];

export type LanguageLevelCode<TLanguage extends LanguagePackCode = LanguagePackCode> =
  (typeof languageLevelCodes)[TLanguage][number];

export const isLanguageLevelCode = (languageCode: LanguagePackCode, levelCode: string): boolean =>
  languageLevelCodes[languageCode].includes(levelCode as never);
