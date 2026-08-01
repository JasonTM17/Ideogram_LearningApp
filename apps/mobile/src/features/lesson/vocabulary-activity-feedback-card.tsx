import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';

import type { ActivityAttemptReceipt } from '@ideogram/contracts';
import type { NativeVocabularyActivityErrorFeedback } from './vocabulary-activity-state';

interface VocabularyActivityFeedbackCardProps {
  feedback: NativeVocabularyActivityErrorFeedback | null;
  onRetry: () => void;
  onSignIn: () => void;
  receipt: ActivityAttemptReceipt | null;
}

const progressCopy = (progressState: ActivityAttemptReceipt['progressState']): string =>
  progressState === 'completed'
    ? 'Bài học này đã hoàn thành.'
    : 'Quay lại bài học để tiếp tục hoạt động kế tiếp.';

export function VocabularyActivityFeedbackCard({
  feedback,
  onRetry,
  onSignIn,
  receipt,
}: VocabularyActivityFeedbackCardProps) {
  const { theme } = useMobileTheme();

  if (feedback) {
    return (
      <View
        accessibilityLiveRegion="assertive"
        style={[
          styles.feedback,
          { backgroundColor: theme.color.surface, borderColor: theme.color.danger },
        ]}
      >
        <Ionicons color={theme.color.danger} name="alert-circle-outline" size={23} />
        <View style={styles.copy}>
          <AppText tone="danger">{feedback.message}</AppText>
          <View style={styles.actions}>
            {feedback.requiresSignIn ? (
              <ActionButton label="Đăng nhập lại" onPress={onSignIn} />
            ) : null}
            {feedback.retryable ? <ActionButton label="Gửi lại an toàn" onPress={onRetry} /> : null}
          </View>
        </View>
      </View>
    );
  }

  if (receipt) {
    return (
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.feedback,
          { backgroundColor: theme.color.surface, borderColor: theme.color.success },
        ]}
      >
        <Ionicons color={theme.color.success} name="checkmark-circle-outline" size={24} />
        <View style={styles.copy}>
          <AppText tone="success" variant="headingMd">
            Tiến độ học đã được lưu
          </AppText>
          <AppText tone="secondary">
            {`Đã hoàn thành ${receipt.completedActivityCount}/${receipt.totalActivityCount} hoạt động.`}
          </AppText>
          <AppText tone="secondary">{progressCopy(receipt.progressState)}</AppText>
          {receipt.idempotentReplay ? (
            <AppText tone="success" variant="bodySm">
              Kết quả trước đó đã được dùng lại an toàn.
            </AppText>
          ) : null}
        </View>
      </View>
    );
  }

  return null;
}

const ActionButton = ({ label, onPress }: { label: string; onPress: () => void }) => {
  const { theme } = useMobileTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { borderColor: theme.color.borderSubtle, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[3],
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: nativeLayoutTokens.spacing[2] },
  copy: { flex: 1, gap: nativeLayoutTokens.spacing[2], minWidth: 0 },
  feedback: {
    alignItems: 'flex-start',
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[3],
    padding: nativeLayoutTokens.spacing[4],
  },
});
