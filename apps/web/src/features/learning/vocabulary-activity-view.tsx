'use client';

import { ArrowLeft, BookOpenText, CircleStop, Send, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createBrowserActivityOperationIdentityStore,
  createBrowserUuid,
} from '@/lib/learning/browser-activity-operation-identity';
import { subscribeToWebSessionInvalidation } from '@/features/auth/web-session-invalidation';
import { useBrowserOfflineSync } from '@/features/offline-sync/browser-offline-sync-provider';

import {
  createVocabularyActivityAttemptInput,
  describeWebActivityAttemptError,
  submitWebActivityAttempt,
  WebActivityAttemptError,
} from './activity-attempt-client';
import { VocabularyActivityError, VocabularyActivityReceipt } from './vocabulary-activity-feedback';

import type { ActivityAttemptInput, ActivityAttemptReceipt } from '@ideogram/contracts';
import { ActivityAttemptLifecycle } from '@ideogram/api-client';
import type { CatalogVocabularyActivityContext } from './catalog-presentation';

interface VocabularyActivityViewProps {
  activityContext: CatalogVocabularyActivityContext;
  signInHref: string;
}

type VocabularyActivityUiState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'ready'; receipt: ActivityAttemptReceipt }
  | { kind: 'queued' }
  | { feedback: ReturnType<typeof describeWebActivityAttemptError>; kind: 'error' };

const resolveClientTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const abortedFeedback = describeWebActivityAttemptError(new WebActivityAttemptError('ABORTED'));
const unauthorizedFeedback = describeWebActivityAttemptError(
  new WebActivityAttemptError('UNAUTHORIZED'),
);

const createBrowserActivityRequestScope = () => {
  const controller = new AbortController();
  return { dispose: () => controller.abort(), signal: controller.signal };
};

export function VocabularyActivityView({
  activityContext,
  signInHref,
}: VocabularyActivityViewProps) {
  const offlineSync = useBrowserOfflineSync();
  const { activity, activitySequence, contentReleaseId, lesson } = activityContext;
  const activityLifecycle =
    useRef<
      ActivityAttemptLifecycle<
        ActivityAttemptInput,
        ActivityAttemptReceipt,
        ReturnType<typeof describeWebActivityAttemptError>
      >
    >(null);
  const [state, setState] = useState<VocabularyActivityUiState>({ kind: 'idle' });
  const sessionInvalidated = useRef(false);
  const lessonHref = `/lessons/${lesson.lessonId}`;

  useEffect(() => {
    const unsubscribe = subscribeToWebSessionInvalidation(() => {
      sessionInvalidated.current = true;
      activityLifecycle.current?.stop();
      setState({ feedback: unauthorizedFeedback, kind: 'error' });
    });

    return () => {
      unsubscribe();
      activityLifecycle.current?.dispose();
    };
  }, []);

  const submit = useCallback(async () => {
    if (
      sessionInvalidated.current ||
      activityLifecycle.current?.isSubmitting ||
      state.kind === 'ready' ||
      state.kind === 'queued'
    ) {
      return;
    }

    let lifecycle = activityLifecycle.current;
    if (lifecycle === null) {
      const identityStore = createBrowserActivityOperationIdentityStore();
      lifecycle = new ActivityAttemptLifecycle({
        createInput: async () => {
          const idempotencyKey = createBrowserUuid();
          return createVocabularyActivityAttemptInput({
            activityId: activity.activityId,
            contentReleaseId,
            createIdempotencyKey: () => idempotencyKey,
            identity: await identityStore.reserve(),
            now: new Date(),
            timezone: resolveClientTimeZone(),
          });
        },
        createRequestScope: createBrowserActivityRequestScope,
        describeError: describeWebActivityAttemptError,
        isRetryable: (feedback) => feedback.retryable,
        submit: submitWebActivityAttempt,
      });
      activityLifecycle.current = lifecycle;
    }

    setState({ kind: 'submitting' });
    const result = await lifecycle.submit();
    if (result.kind === 'receipt') {
      setState({ kind: 'ready', receipt: result.receipt });
    } else if (result.kind === 'error') {
      const input = lifecycle.getPendingInput();
      const queued =
        result.feedback.retryable &&
        input !== null &&
        (await offlineSync.enqueue('activity', input.idempotencyKey, { ...input }));
      if (queued) {
        lifecycle.discardPendingInput();
        setState({ kind: 'queued' });
      } else {
        setState({ feedback: result.feedback, kind: 'error' });
      }
    } else if (result.kind === 'aborted' && !sessionInvalidated.current) {
      setState({ feedback: abortedFeedback, kind: 'error' });
    }
  }, [activity.activityId, contentReleaseId, offlineSync, state.kind]);

  const stop = useCallback(() => {
    activityLifecycle.current?.stop();
  }, []);

  const isSubmitting = state.kind === 'submitting';

  return (
    <article className="vocabulary-activity">
      <a className="vocabulary-activity__back" href={lessonHref}>
        <ArrowLeft aria-hidden="true" size={18} />
        Quay lại bài học
      </a>

      <header className="vocabulary-activity__header">
        <div>
          <p className="vocabulary-activity__eyebrow">Hoạt động từ vựng</p>
          <h1 lang="vi">{activity.titleVietnamese}</h1>
        </div>
        <p className="vocabulary-activity__progress">
          Hoạt động {activitySequence}/{lesson.activities.length}
        </p>
      </header>

      <section aria-labelledby="vocabulary-activity-prompt" className="vocabulary-activity__prompt">
        <BookOpenText aria-hidden="true" size={23} />
        <div>
          <h2 id="vocabulary-activity-prompt">Đọc từng từ và ví dụ</h2>
          <p>{activity.instructionsVietnamese}</p>
        </div>
      </section>

      <ol className="vocabulary-activity__entries">
        {activity.payload.entries.map((entry, index) => (
          <li key={`${entry.term}-${index}`}>
            <p className="vocabulary-activity__term" lang="ja">
              {entry.term}
            </p>
            <p className="vocabulary-activity__reading" lang="ja">
              {entry.reading}
            </p>
            <p className="vocabulary-activity__meaning">{entry.meaningVietnamese}</p>
            <blockquote>
              <p lang="ja">{entry.example.value}</p>
              <footer>{entry.example.translationVietnamese}</footer>
            </blockquote>
          </li>
        ))}
      </ol>

      <section
        className="vocabulary-activity__confirmation"
        aria-labelledby="vocabulary-activity-confirm-title"
      >
        <Sparkles aria-hidden="true" size={22} />
        <div>
          <h2 id="vocabulary-activity-confirm-title">Bạn đã đọc xong?</h2>
          <p>
            Xác nhận chỉ ghi nhận rằng bạn đã học phần từ vựng này. Không có đáp án hay điểm số bị
            ẩn trong hoạt động này.
          </p>
        </div>
        <div className="vocabulary-activity__actions">
          <button
            aria-busy={isSubmitting}
            className="vocabulary-activity__primary-action"
            disabled={isSubmitting || state.kind === 'ready' || state.kind === 'queued'}
            onClick={() => void submit()}
            type="button"
          >
            <Send aria-hidden="true" size={17} />
            {isSubmitting ? 'Đang xác nhận…' : 'Xác nhận đã học'}
          </button>
          {isSubmitting ? (
            <button className="vocabulary-activity__secondary-action" onClick={stop} type="button">
              <CircleStop aria-hidden="true" size={17} />
              Dừng yêu cầu
            </button>
          ) : null}
        </div>
      </section>

      {state.kind === 'queued' ? (
        <p className="vocabulary-activity__notice" role="status">
          Xác nhận đã được lưu trên thiết bị và sẽ được đồng bộ khi kết nối trở lại. Tiến độ chỉ
          hoàn tất sau khi máy chủ trả biên nhận.
        </p>
      ) : null}
      {state.kind === 'error' ? (
        <VocabularyActivityError
          feedback={state.feedback}
          onRetry={() => void submit()}
          signInHref={signInHref}
        />
      ) : null}
      {state.kind === 'ready' ? (
        <VocabularyActivityReceipt lessonHref={lessonHref} receipt={state.receipt} />
      ) : null}
    </article>
  );
}
