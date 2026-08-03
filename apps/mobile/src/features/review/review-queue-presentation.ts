import type {
  LearnerCatalogActivity,
  LearnerCatalogResponse,
  ReviewQueueResponse,
} from '@ideogram/contracts';

export interface NativeVocabularyReviewItem {
  activityTitle: string;
  entry: {
    example: { translationVietnamese: string; value: string };
    meaningVietnamese: string;
    reading: string;
    term: string;
  };
  itemId: string;
  lessonTitle: string;
  state: 'learning' | 'review' | 'relearning';
}

export interface NativeReviewQueuePresentation {
  items: NativeVocabularyReviewItem[];
  unavailableItemCount: number;
}

const sourceItemPattern = /^vocabulary-(?<position>[1-9]\d*)$/u;

export const createNativeReviewQueuePresentation = (
  queue: ReviewQueueResponse,
  catalog: LearnerCatalogResponse,
): NativeReviewQueuePresentation => {
  const items: NativeVocabularyReviewItem[] = [];
  let unavailableItemCount = 0;

  for (const item of queue.items) {
    const position = sourceItemPattern.exec(item.sourceItemKey)?.groups?.position;
    if (!position || item.state === 'suspended') {
      unavailableItemCount += 1;
      continue;
    }

    let found:
      | {
          activity: Extract<LearnerCatalogActivity, { activityType: 'vocabulary' }>;
          lessonTitle: string;
        }
      | undefined;
    for (const languagePack of catalog.languagePacks) {
      for (const release of languagePack.releases) {
        if (release.contentReleaseId !== item.contentReleaseId) continue;
        for (const unit of release.units) {
          const lesson = unit.lessons.find((candidate) =>
            candidate.activities.some(
              (activity) =>
                activity.activityId === item.activityId && activity.activityType === 'vocabulary',
            ),
          );
          const activity = lesson?.activities.find(
            (candidate) =>
              candidate.activityId === item.activityId && candidate.activityType === 'vocabulary',
          );
          if (lesson && activity?.activityType === 'vocabulary') {
            found = { activity, lessonTitle: lesson.titleVietnamese };
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }

    const entry = found?.activity.payload.entries[Number(position) - 1];
    if (!found || !entry) {
      unavailableItemCount += 1;
      continue;
    }

    items.push({
      activityTitle: found.activity.titleVietnamese,
      entry,
      itemId: item.itemId,
      lessonTitle: found.lessonTitle,
      state: item.state,
    });
  }

  return { items, unavailableItemCount };
};
