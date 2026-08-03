import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';

import { AppText } from '../../components/app-text';
import { TaskScreenScaffold } from '../../components/task-screen-scaffold';
import { createExpoActivityOperationIdentityStore } from '../../lib/activity-operation';
import { useNativeAuthSession } from '../auth/native-auth-session-provider';
import { useNativeLearnerCatalog } from '../today/native-learner-catalog-provider';
import { NativeReviewCard } from './native-review-card';
import {
  createNativeReviewQueuePresentation,
  type NativeVocabularyReviewItem,
} from './review-queue-presentation';
import { ReviewReceipt, ReviewStatus } from './review-session-states';
import { useNativeReviewSubmission } from './use-native-review-submission';
import { useNativeReviewQueue } from './use-native-review-queue';

export function ReviewSessionScreen() {
  const auth = useNativeAuthSession();
  const sessionKey =
    auth.hasSession && auth.sessionEpoch !== null ? `learner-${auth.sessionEpoch}` : 'anonymous';
  return <ReviewSessionSurface auth={auth} key={sessionKey} />;
}

const ReviewSessionSurface = ({ auth }: { auth: ReturnType<typeof useNativeAuthSession> }) => {
  const router = useRouter();
  const { reload: reloadCatalog, state: catalogState } = useNativeLearnerCatalog();
  const { reload: reloadQueue, state: queueState } = useNativeReviewQueue();
  const [identityStore] = useState(createExpoActivityOperationIdentityStore);
  const [items, setItems] = useState<NativeVocabularyReviewItem[]>([]);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const presentation = useMemo(
    () =>
      catalogState.kind === 'ready' && queueState.kind === 'ready'
        ? createNativeReviewQueuePresentation(queueState.queue, catalogState.catalog)
        : null,
    [catalogState, queueState],
  );
  const currentItem = items[0] ?? null;
  const onReceipt = useCallback(
    (itemId: string) =>
      setItems((currentItems) => currentItems.filter((item) => item.itemId !== itemId)),
    [],
  );
  const { reset, state, stop, submitGrade } = useNativeReviewSubmission({
    auth,
    identityStore,
    onReceipt,
  });

  useEffect(() => {
    if (presentation) setItems(presentation.items);
  }, [presentation]);
  useEffect(() => {
    if (state.kind === 'receipt') {
      void AccessibilityInfo.announceForAccessibility('Quyết định ôn tập đã được lưu.');
    }
  }, [state.kind]);

  const reload = useCallback(() => {
    reloadCatalog();
    reloadQueue();
  }, [reloadCatalog, reloadQueue]);

  if (auth.isHydrating || catalogState.kind === 'waiting' || queueState.kind === 'waiting') {
    return (
      <ReviewStatus
        title="Đang mở phiên ôn"
        description="Đang xác minh phiên học của bạn."
        variant="loading"
      />
    );
  }
  if (!auth.hasSession) {
    return (
      <ReviewStatus
        actionLabel="Đăng nhập lại"
        description="Hãy đăng nhập để tải và ghi kết quả ôn tập."
        onAction={() => router.replace('/sign-in')}
        title="Phiên học đã hết hạn"
        variant="error"
      />
    );
  }
  if (catalogState.kind === 'loading' || queueState.kind === 'loading') {
    return (
      <ReviewStatus
        title="Đang tải hàng đợi"
        description="Chỉ các mục đến hạn trong tài khoản của bạn mới được tải."
        variant="loading"
      />
    );
  }
  if (catalogState.kind === 'error' || queueState.kind === 'error') {
    return (
      <ReviewStatus
        actionLabel="Thử lại"
        description="Chưa thể tải hàng đợi. Tiến độ ôn tập của bạn không bị thay đổi."
        onAction={reload}
        title="Hàng đợi tạm thời chưa sẵn sàng"
        variant="error"
      />
    );
  }
  if (state.kind === 'receipt') {
    return (
      <ReviewReceipt
        hasNextItem={currentItem !== null}
        item={state.item}
        onContinue={() => {
          setIsAnswerRevealed(false);
          reset();
        }}
        receipt={state.receipt}
      />
    );
  }
  if (!currentItem) {
    return (
      <ReviewStatus
        actionLabel="Về Hôm nay"
        description={
          presentation?.unavailableItemCount
            ? `${presentation.unavailableItemCount} mục cũ chưa tương thích nên không được thay bằng thẻ minh hoạ.`
            : 'Hoàn thành hoạt động từ vựng đã phát hành để có mục ôn đầu tiên.'
        }
        onAction={() => router.replace('/')}
        title={presentation?.unavailableItemCount ? 'Cần cập nhật hàng đợi' : 'Chưa có từ cần ôn'}
        variant="empty"
      />
    );
  }

  return (
    <TaskScreenScaffold backLabel="Ôn tập" fallbackHref="/review" title="Phiên ôn">
      <View style={styles.header}>
        <AppText tone="action" variant="label">
          GỢI NHỚ CHỦ ĐỘNG
        </AppText>
        <AppText variant="headingLg">Một từ tại một thời điểm</AppText>
        <AppText tone="secondary">Máy chủ tính lịch SRS; bạn tự đánh giá mức độ nhớ.</AppText>
      </View>
      <NativeReviewCard
        feedback={state.kind === 'error' ? state.feedback : null}
        isAnswerRevealed={isAnswerRevealed}
        isSubmitting={state.kind === 'submitting'}
        item={currentItem}
        onGrade={(grade) => void submitGrade(currentItem, grade)}
        onReveal={() => setIsAnswerRevealed((value) => !value)}
        onRetry={() => void submitGrade(currentItem)}
        onSignIn={() => router.replace('/sign-in')}
        onStop={stop}
      />
    </TaskScreenScaffold>
  );
};

const styles = StyleSheet.create({
  header: { gap: nativeLayoutTokens.spacing[2] },
});
