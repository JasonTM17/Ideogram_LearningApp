import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { ActivityAttemptLifecycle } from '@ideogram/api-client';
import { NativeApiCallerAbortError } from '@ideogram/api-client/native';

import { StatusPanel } from '../../components/status-panel';
import { TaskScreenScaffold } from '../../components/task-screen-scaffold';
import { createSessionBoundRequestSignal } from '../../lib/api/session-bound-request-signal';
import { createMobileNativeLearningApiClient } from '../../lib/api/native-learning-api-client';
import {
  createActivityOperationUuid,
  createExpoActivityOperationIdentityStore,
} from '../../lib/activity-operation';
import { useNativeAuthSession } from '../auth/native-auth-session-provider';
import { findCatalogVocabularyActivity } from '../today/catalog-lesson-context';
import { useNativeLearnerCatalog } from '../today/native-learner-catalog-provider';
import { VocabularyActivityCard } from './vocabulary-activity-card';
import {
  createNativeVocabularyActivityAttemptInput,
  describeNativeVocabularyActivityError,
  resolveNativeClientTimeZone,
} from './vocabulary-activity-state';

import type { ActivityAttemptInput, ActivityAttemptReceipt } from '@ideogram/contracts';
import type { NativeVocabularyActivityErrorFeedback } from './vocabulary-activity-state';

type VocabularyActivityScreenState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'ready'; receipt: ActivityAttemptReceipt }
  | { feedback: NativeVocabularyActivityErrorFeedback; kind: 'error' };

const abortedFeedback = describeNativeVocabularyActivityError(new NativeApiCallerAbortError());

export function VocabularyActivityScreen() {
  const auth = useNativeAuthSession();
  const sessionKey =
    auth.hasSession && auth.sessionEpoch !== null ? `learner-${auth.sessionEpoch}` : 'anonymous';

  return <VocabularyActivitySurface auth={auth} key={sessionKey} />;
}

const VocabularyActivitySurface = ({ auth }: { auth: ReturnType<typeof useNativeAuthSession> }) => {
  const { activityId, lessonId } = useLocalSearchParams<{
    activityId?: string | string[];
    lessonId?: string | string[];
  }>();
  const router = useRouter();
  const { reload, state: catalogState } = useNativeLearnerCatalog();
  const { getRequestSignal, hasSession, isHydrating, sessionProvider } = auth;
  const [identityStore] = useState(createExpoActivityOperationIdentityStore);
  const [state, setState] = useState<VocabularyActivityScreenState>({ kind: 'idle' });
  const activityLifecycle =
    useRef<
      ActivityAttemptLifecycle<
        ActivityAttemptInput,
        ActivityAttemptReceipt,
        NativeVocabularyActivityErrorFeedback
      >
    >(null);
  const validLessonId = typeof lessonId === 'string' ? lessonId : null;
  const validActivityId = typeof activityId === 'string' ? activityId : null;
  const activityContext =
    catalogState.kind === 'ready' && validLessonId && validActivityId
      ? findCatalogVocabularyActivity(catalogState.catalog, validLessonId, validActivityId)
      : null;
  const lessonHref = (validLessonId ? `/lessons/${validLessonId}` : '/') as Href;

  useEffect(() => {
    return () => activityLifecycle.current?.dispose();
  }, []);

  useEffect(() => {
    if (state.kind === 'ready') {
      void AccessibilityInfo.announceForAccessibility('Tiến độ học đã được lưu.');
    }
  }, [state.kind]);

  const submit = useCallback(async () => {
    if (
      !activityContext ||
      !hasSession ||
      activityLifecycle.current?.isSubmitting ||
      state.kind === 'ready'
    ) {
      return;
    }

    let lifecycle = activityLifecycle.current;
    if (lifecycle === null) {
      const currentActivityContext = activityContext;
      lifecycle = new ActivityAttemptLifecycle({
        createInput: async () => {
          const idempotencyKey = createActivityOperationUuid(Crypto.randomUUID);
          return createNativeVocabularyActivityAttemptInput({
            activityId: currentActivityContext.activity.activityId,
            contentReleaseId: currentActivityContext.contentReleaseId,
            createIdempotencyKey: () => idempotencyKey,
            identity: await identityStore.reserve(),
            now: new Date(),
            timezone: resolveNativeClientTimeZone(),
          });
        },
        createRequestScope: () => createSessionBoundRequestSignal(getRequestSignal()),
        describeError: describeNativeVocabularyActivityError,
        isRetryable: (feedback) => feedback.retryable,
        submit: (input, options) =>
          createMobileNativeLearningApiClient(sessionProvider).submitActivityAttempt(
            input,
            options,
          ),
      });
      activityLifecycle.current = lifecycle;
    }

    setState({ kind: 'submitting' });
    const result = await lifecycle.submit();
    if (result.kind === 'receipt') {
      setState({ kind: 'ready', receipt: result.receipt });
    } else if (result.kind === 'error') {
      setState({ feedback: result.feedback, kind: 'error' });
    }
  }, [activityContext, getRequestSignal, hasSession, identityStore, sessionProvider, state.kind]);

  const stop = useCallback(() => {
    if (activityLifecycle.current?.stop()) {
      setState({ feedback: abortedFeedback, kind: 'error' });
    }
  }, []);

  const signIn = useCallback(() => router.replace('/sign-in'), [router]);

  return (
    <TaskScreenScaffold backLabel="Bài học" fallbackHref={lessonHref} title="Từ vựng">
      {isHydrating ? (
        <StatusPanel
          description="Đang xác minh phiên học trước khi mở hoạt động."
          title="Đang mở hoạt động"
          variant="loading"
        />
      ) : null}
      {!isHydrating && !hasSession ? (
        <StatusPanel
          actionHint="Mở màn hình đăng nhập lại"
          actionLabel="Đăng nhập lại"
          description="Hãy đăng nhập để mở hoạt động và ghi tiến độ học."
          onAction={signIn}
          title="Phiên học đã hết hạn"
          variant="error"
        />
      ) : null}
      {hasSession && (catalogState.kind === 'waiting' || catalogState.kind === 'loading') ? (
        <StatusPanel
          description="Đang tải hoạt động đã xuất bản từ danh mục của bạn."
          title="Đang mở hoạt động"
          variant="loading"
        />
      ) : null}
      {hasSession && catalogState.kind === 'error' ? (
        <StatusPanel
          actionHint="Tải lại danh mục và hoạt động"
          actionLabel="Thử lại"
          description="Chưa thể mở hoạt động. Tiến độ của bạn không bị thay đổi."
          onAction={reload}
          title="Hoạt động tạm thời chưa sẵn sàng"
          variant="error"
        />
      ) : null}
      {hasSession && catalogState.kind === 'ready' && activityContext === null ? (
        <StatusPanel
          description="Hoạt động này chưa được phát hành hoặc chưa hỗ trợ trên ứng dụng."
          title="Không thể mở hoạt động"
          variant="empty"
        />
      ) : null}
      {hasSession && activityContext ? (
        <VocabularyActivityCard
          activityContext={activityContext}
          feedback={state.kind === 'error' ? state.feedback : null}
          isSubmitting={state.kind === 'submitting'}
          onConfirm={() => void submit()}
          onRetry={() => void submit()}
          onSignIn={signIn}
          onStop={stop}
          receipt={state.kind === 'ready' ? state.receipt : null}
        />
      ) : null}
    </TaskScreenScaffold>
  );
};
