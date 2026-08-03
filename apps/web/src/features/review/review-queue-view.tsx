'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ActivityAttemptLifecycle } from '@ideogram/api-client';

import { PageHeading } from '@/components/ui/page-heading';
import { subscribeToWebSessionInvalidation } from '@/features/auth/web-session-invalidation';
import { useBrowserOfflineSync } from '@/features/offline-sync/browser-offline-sync-provider';
import {
  createBrowserActivityOperationIdentityStore,
  createBrowserUuid,
} from '@/lib/learning/browser-activity-operation-identity';

import { ReviewCard } from './review-card';
import { ReviewQueueEmptyState, ReviewQueueReceipt } from './review-queue-states';
import {
  createWebReviewSubmissionInput,
  describeWebReviewError,
  submitWebReview,
  WebReviewError,
} from './review-submission-client';

import type {
  ReviewGrade,
  ReviewSubmissionInput,
  ReviewSubmissionReceipt,
} from '@ideogram/contracts';
import type {
  ReviewQueuePresentation,
  VocabularyReviewQueueItem,
} from './review-queue-presentation';

interface ReviewQueueViewProps {
  presentation: ReviewQueuePresentation;
  signInHref: string;
}

type ReviewUiState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'queued' }
  | { feedback: ReturnType<typeof describeWebReviewError>; kind: 'error' }
  | { item: VocabularyReviewQueueItem; kind: 'receipt'; receipt: ReviewSubmissionReceipt };

const resolveClientTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const createReviewRequestScope = () => {
  const controller = new AbortController();
  return { dispose: () => controller.abort(), signal: controller.signal };
};

const abortedFeedback = describeWebReviewError(new WebReviewError('ABORTED'));
const unauthorizedFeedback = describeWebReviewError(new WebReviewError('UNAUTHORIZED'));

export function ReviewQueueView({ presentation, signInHref }: ReviewQueueViewProps) {
  const offlineSync = useBrowserOfflineSync();
  const [items, setItems] = useState(presentation.items);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [state, setState] = useState<ReviewUiState>({ kind: 'idle' });
  const lifecycle =
    useRef<
      ActivityAttemptLifecycle<
        ReviewSubmissionInput,
        ReviewSubmissionReceipt,
        ReturnType<typeof describeWebReviewError>
      >
    >(null);
  const sessionInvalidated = useRef(false);
  const currentItem = items[0] ?? null;

  useEffect(() => {
    const unsubscribe = subscribeToWebSessionInvalidation(() => {
      sessionInvalidated.current = true;
      lifecycle.current?.stop();
      setState({ feedback: unauthorizedFeedback, kind: 'error' });
    });

    return () => {
      unsubscribe();
      lifecycle.current?.dispose();
    };
  }, []);

  const submitGrade = useCallback(
    async (grade?: ReviewGrade) => {
      if (
        sessionInvalidated.current ||
        lifecycle.current?.isSubmitting ||
        currentItem === null ||
        state.kind === 'queued'
      ) {
        return;
      }

      let requestLifecycle = lifecycle.current;
      if (requestLifecycle === null) {
        if (!grade) return;
        const item = currentItem;
        requestLifecycle = new ActivityAttemptLifecycle({
          createInput: async () => {
            const identityStore = createBrowserActivityOperationIdentityStore();
            return createWebReviewSubmissionInput({
              createIdempotencyKey: createBrowserUuid,
              grade,
              identity: await identityStore.reserve(),
              itemId: item.itemId,
              now: new Date(),
              timezone: resolveClientTimeZone(),
            });
          },
          createRequestScope: createReviewRequestScope,
          describeError: describeWebReviewError,
          isRetryable: (feedback) => feedback.retryable,
          submit: submitWebReview,
        });
        lifecycle.current = requestLifecycle;
      }

      setState({ kind: 'submitting' });
      const result = await requestLifecycle.submit();
      if (result.kind === 'receipt') {
        lifecycle.current?.dispose();
        lifecycle.current = null;
        setItems((previousItems) =>
          previousItems.filter((item) => item.itemId !== currentItem.itemId),
        );
        setState({ item: currentItem, kind: 'receipt', receipt: result.receipt });
      } else if (result.kind === 'error') {
        const input = requestLifecycle.getPendingInput();
        const queued =
          result.feedback.retryable &&
          input !== null &&
          (await offlineSync.enqueue('review', input.idempotencyKey, { ...input }));
        if (queued) {
          requestLifecycle.discardPendingInput();
          setState({ kind: 'queued' });
        } else {
          setState({ feedback: result.feedback, kind: 'error' });
        }
      } else if (result.kind === 'aborted' && !sessionInvalidated.current) {
        setState({ feedback: abortedFeedback, kind: 'error' });
      }
    },
    [currentItem, offlineSync, state.kind],
  );

  if (state.kind === 'receipt') {
    return (
      <ReviewQueueReceipt
        hasNextItem={currentItem !== null}
        item={state.item}
        onContinue={() => {
          setIsAnswerRevealed(false);
          setState({ kind: 'idle' });
        }}
        receipt={state.receipt}
      />
    );
  }

  if (currentItem === null) {
    return <ReviewQueueEmptyState unavailableItemCount={presentation.unavailableItemCount} />;
  }

  const feedback = state.kind === 'error' ? state.feedback : null;
  return (
    <div className="review-queue-view">
      <PageHeading
        description="Tự đánh giá mức độ nhớ sau khi thử nhớ; hệ thống chỉ ghi nhận lựa chọn và tính lịch SRS ở máy chủ."
        eyebrow={`Ôn tập · ${items.length} mục`}
        title="Nhớ lại một từ tại một thời điểm"
      />
      {presentation.unavailableItemCount > 0 ? (
        <p className="review-queue-note" role="status">
          {presentation.unavailableItemCount} mục cũ chưa có phiên ôn tương thích nên chưa được mở.
        </p>
      ) : null}
      {state.kind === 'queued' ? (
        <p className="review-queue-note" role="status">
          Lựa chọn này đã được lưu trên thiết bị và chờ máy chủ đồng bộ. Lịch ôn mới chỉ xuất hiện
          sau biên nhận của máy chủ.
        </p>
      ) : null}
      <ReviewCard
        feedback={feedback}
        isAnswerRevealed={isAnswerRevealed}
        isSubmitting={state.kind === 'submitting' || state.kind === 'queued'}
        item={currentItem}
        onGrade={(grade) => void submitGrade(grade)}
        onReveal={() => setIsAnswerRevealed((isRevealed) => !isRevealed)}
        onRetry={() => void submitGrade()}
        onStop={() => lifecycle.current?.stop()}
        signInHref={signInHref}
      />
    </div>
  );
}
