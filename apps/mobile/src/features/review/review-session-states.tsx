import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';

import { AppText } from '../../components/app-text';
import { StatusPanel } from '../../components/status-panel';
import { TaskScreenScaffold } from '../../components/task-screen-scaffold';
import { useMobileTheme } from '../../components/use-mobile-theme';

import type { ReviewSubmissionReceipt } from '@ideogram/contracts';
import type { NativeVocabularyReviewItem } from './review-queue-presentation';

export const ReviewStatus = ({
  actionLabel,
  description,
  onAction,
  title,
  variant,
}: {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
  variant: 'empty' | 'error' | 'loading';
}) => {
  const action =
    actionLabel && onAction
      ? { actionHint: 'Thực hiện thao tác được đề xuất', actionLabel, onAction }
      : {};

  return (
    <TaskScreenScaffold backLabel="Ôn tập" fallbackHref="/review" title="Phiên ôn">
      <StatusPanel {...action} description={description} title={title} variant={variant} />
    </TaskScreenScaffold>
  );
};

export const ReviewReceipt = ({
  hasNextItem,
  item,
  onContinue,
  receipt,
}: {
  hasNextItem: boolean;
  item: NativeVocabularyReviewItem;
  onContinue: () => void;
  receipt: ReviewSubmissionReceipt;
}) => {
  const { theme } = useMobileTheme();
  const router = useRouter();
  const dueAt = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(receipt.schedule.dueAt));

  return (
    <TaskScreenScaffold backLabel="Ôn tập" fallbackHref="/review" title="Đã ghi nhận">
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.receipt,
          { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
        ]}
      >
        <AppText tone="success" variant="label">
          ĐÃ GHI NHẬN
        </AppText>
        <AppText variant="headingLg">
          Gặp lại {item.entry.term} vào {dueAt}
        </AppText>
        <AppText tone="secondary">
          Lịch SRS v{receipt.schedule.algorithmVersion.replace('srs-v', '')} ·{' '}
          {receipt.schedule.intervalMinutes} phút · {receipt.schedule.state}
        </AppText>
        {receipt.idempotentReplay ? (
          <AppText tone="secondary">Kết quả trước đó đã được dùng lại an toàn.</AppText>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={hasNextItem ? onContinue : () => router.replace('/')}
          style={[styles.action, { backgroundColor: theme.color.actionPrimary }]}
        >
          <AppText style={{ color: theme.color.onActionPrimary }} variant="label">
            {hasNextItem ? 'Ôn mục tiếp theo' : 'Về Hôm nay'}
          </AppText>
        </Pressable>
      </View>
    </TaskScreenScaffold>
  );
};

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[4],
  },
  receipt: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[4],
    padding: nativeLayoutTokens.spacing[4],
  },
});
