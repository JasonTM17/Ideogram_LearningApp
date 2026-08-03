import { flattenCatalogLessons } from '@/features/learning/catalog-presentation';

import type { LearnerCatalogResponse, ReviewQueueResponse } from '@ideogram/contracts';

export interface VocabularyReviewQueueItem {
  activityTitle: string;
  dueAt: string;
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

export interface ReviewQueuePresentation {
  items: VocabularyReviewQueueItem[];
  unavailableItemCount: number;
}

const vocabularySourceItemPattern = /^vocabulary-(?<position>[1-9]\d*)$/u;

const findVocabularyActivity = (
  catalog: LearnerCatalogResponse,
  contentReleaseId: string,
  activityId: string,
) => {
  for (const lessonContext of flattenCatalogLessons(catalog)) {
    if (lessonContext.contentReleaseId !== contentReleaseId) {
      continue;
    }

    const activity = lessonContext.lesson.activities.find(
      (candidate) => candidate.activityId === activityId,
    );
    if (activity?.activityType === 'vocabulary') {
      return { activity, lessonTitle: lessonContext.lesson.titleVietnamese };
    }
  }

  return null;
};

export const createReviewQueuePresentation = (
  queue: ReviewQueueResponse,
  catalog: LearnerCatalogResponse,
): ReviewQueuePresentation => {
  const items: VocabularyReviewQueueItem[] = [];
  let unavailableItemCount = 0;

  for (const queueItem of queue.items) {
    if (queueItem.state === 'suspended') {
      continue;
    }

    const match = vocabularySourceItemPattern.exec(queueItem.sourceItemKey);
    const sourcePosition = match?.groups?.position;
    if (!sourcePosition) {
      unavailableItemCount += 1;
      continue;
    }

    const activityContext = findVocabularyActivity(
      catalog,
      queueItem.contentReleaseId,
      queueItem.activityId,
    );
    const entry = activityContext?.activity.payload.entries[Number(sourcePosition) - 1];
    if (!activityContext || !entry) {
      unavailableItemCount += 1;
      continue;
    }

    items.push({
      activityTitle: activityContext.activity.titleVietnamese,
      dueAt: queueItem.dueAt,
      entry,
      itemId: queueItem.itemId,
      lessonTitle: activityContext.lessonTitle,
      state: queueItem.state,
    });
  }

  return { items, unavailableItemCount };
};
