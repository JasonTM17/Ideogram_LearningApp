import { languageLevelCodes } from '@ideogram/contracts';

import type { ContentReleaseCatalogRow } from './learner-catalog-row-contracts';
import type { LanguagePackCode } from '@ideogram/contracts';

export const compareText = (left: string, right: string): number => left.localeCompare(right, 'en');

export const compareSequence = (
  left: { sequence: number },
  right: { sequence: number },
  leftId: string,
  rightId: string,
): number => left.sequence - right.sequence || compareText(leftId, rightId);

const parseSemanticVersion = (value: string): [number, number, number] => {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/u.exec(value);
  if (!match) {
    throw new Error('A catalog release has an invalid semantic version.');
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

export const compareRelease = (
  left: ContentReleaseCatalogRow,
  right: ContentReleaseCatalogRow,
): number => {
  const publishedAtDifference = Date.parse(right.published_at) - Date.parse(left.published_at);
  if (Number.isNaN(publishedAtDifference)) {
    throw new Error('A catalog release has an invalid publication timestamp.');
  }
  if (publishedAtDifference !== 0) {
    return publishedAtDifference;
  }

  const leftVersion = parseSemanticVersion(left.version);
  const rightVersion = parseSemanticVersion(right.version);
  for (let index = 0; index < leftVersion.length; index += 1) {
    const difference = rightVersion[index]! - leftVersion[index]!;
    if (difference !== 0) {
      return difference;
    }
  }

  return compareText(left.content_release_id, right.content_release_id);
};

export const compareLanguageLevel = (
  languageCode: LanguagePackCode,
  leftLevelCode: string,
  rightLevelCode: string,
): number => {
  const levels: readonly string[] = languageLevelCodes[languageCode];
  return levels.indexOf(leftLevelCode) - levels.indexOf(rightLevelCode);
};

export const groupBy = <T>(items: T[], key: (item: T) => string): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const itemKey = key(item);
    const group = grouped.get(itemKey);
    if (group) {
      group.push(item);
    } else {
      grouped.set(itemKey, [item]);
    }
  }
  return grouped;
};

export const requireItem = <T>(item: T | undefined, message: string): T => {
  if (!item) {
    throw new Error(message);
  }
  return item;
};
