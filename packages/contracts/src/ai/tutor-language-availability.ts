import type { LanguagePackCode } from '../content/content-vocabulary';

/**
 * Client-facing release guard for the bounded tutor UI. The server still owns
 * the authoritative active-pack check because availability can change at run
 * time. Keep unavailable packs visible only as future-release copy, never as
 * selectable tutor requests.
 */
export const tutorLanguageAvailability: Readonly<Record<LanguagePackCode, boolean>> = {
  ja: true,
  ko: false,
  zh: false,
};

export const isTutorLanguageAvailable = (languageCode: LanguagePackCode): boolean =>
  tutorLanguageAvailability[languageCode];
