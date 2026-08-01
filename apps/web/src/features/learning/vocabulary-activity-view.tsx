'use client';

import { ArrowLeft, BookOpenText, CircleStop, Send, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createBrowserActivityOperationIdentityStore,
  createBrowserUuid,
} from '@/lib/learning/browser-activity-operation-identity';

import {
  createVocabularyActivityAttemptInput,
  describeWebActivityAttemptError,
  submitWebActivityAttempt,
  WebActivityAttemptError,
} from './activity-attempt-client';
import { VocabularyActivityError, VocabularyActivityReceipt } from './vocabulary-activity-feedback';

import type { ActivityAttemptInput, ActivityAttemptReceipt } from '@ideogram/contracts';
import type { ActivityOperationIdentityStore } from '@ideogram/api-client';
import type { CatalogVocabularyActivityContext } from './catalog-presentation';

interface VocabularyActivityViewProps {
  activityContext: CatalogVocabularyActivityContext;
  signInHref: string;
}

type VocabularyActivityUiState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'ready'; receipt: ActivityAttemptReceipt }
  | { feedback: ReturnType<typeof describeWebActivityAttemptError>; kind: 'error' };

const resolveClientTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const abortedFeedback = describeWebActivityAttemptError(new WebActivityAttemptError('ABORTED'));

export function VocabularyActivityView({
  activityContext,
  signInHref,
}: VocabularyActivityViewProps) {
  const { activity, activitySequence, contentReleaseId, lesson } = activityContext;
  const identityStore = useRef<ActivityOperationIdentityStore | null>(null);
  const pendingInput = useRef<ActivityAttemptInput | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const [state, setState] = useState<VocabularyActivityUiState>({ kind: 'idle' });
  const lessonHref = `/lessons/${lesson.lessonId}`;

  useEffect(() => () => activeRequest.current?.abort(), []);

  const submit = useCallback(async () => {
    if (activeRequest.current !== null || state.kind === 'ready') {
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setState({ kind: 'submitting' });
    let requestInput = pendingInput.current;
    try {
      if (requestInput === null) {
        identityStore.current ??= createBrowserActivityOperationIdentityStore();
        requestInput = createVocabularyActivityAttemptInput({
          activityId: activity.activityId,
          contentReleaseId,
          createIdempotencyKey: createBrowserUuid,
          identity: await identityStore.current.reserve(),
          now: new Date(),
          timezone: resolveClientTimeZone(),
        });
        pendingInput.current = requestInput;
      }

      if (controller.signal.aborted) {
        return;
      }

      const receipt = await submitWebActivityAttempt(requestInput, { signal: controller.signal });
      if (!controller.signal.aborted) {
        pendingInput.current = null;
        setState({ kind: 'ready', receipt });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const feedback = describeWebActivityAttemptError(error);
      if (!feedback.retryable) {
        pendingInput.current = null;
      }
      setState({ feedback, kind: 'error' });
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
      }
    }
  }, [activity.activityId, contentReleaseId, state.kind]);

  const stop = useCallback(() => {
    activeRequest.current?.abort();
    setState({ feedback: abortedFeedback, kind: 'error' });
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
            disabled={isSubmitting || state.kind === 'ready'}
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
