import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';
import { vocabularyActivityCardStyles as styles } from './vocabulary-activity-card-styles';
import { VocabularyActivityFeedbackCard } from './vocabulary-activity-feedback-card';

import type { ActivityAttemptReceipt } from '@ideogram/contracts';
import type { CatalogVocabularyActivityContext } from '../today/catalog-lesson-context';
import type { NativeVocabularyActivityErrorFeedback } from './vocabulary-activity-state';

interface VocabularyActivityCardProps {
  activityContext: CatalogVocabularyActivityContext;
  feedback: NativeVocabularyActivityErrorFeedback | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onRetry: () => void;
  onSignIn: () => void;
  onStop: () => void;
  receipt: ActivityAttemptReceipt | null;
}

export function VocabularyActivityCard({
  activityContext,
  feedback,
  isSubmitting,
  onConfirm,
  onRetry,
  onSignIn,
  onStop,
  receipt,
}: VocabularyActivityCardProps) {
  const { theme } = useMobileTheme();
  const { activity, activitySequence, lesson } = activityContext;
  const isCompleted = receipt !== null;

  return (
    <>
      <View accessibilityRole="header" style={styles.header}>
        <AppText tone="action" variant="label">
          {`${activityContext.languageName} · ${activityContext.levelCode}`.toLocaleUpperCase('vi')}
        </AppText>
        <AppText variant="headingLg">{activity.titleVietnamese}</AppText>
        <AppText tone="tertiary" variant="caption">
          {`Hoạt động ${activitySequence}/${lesson.activities.length} · ${activity.estimatedMinutes} phút`}
        </AppText>
      </View>

      <View
        accessibilityLabel="Hướng dẫn hoạt động từ vựng"
        style={[
          styles.instruction,
          { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
        ]}
      >
        <Ionicons
          color={theme.color.actionPrimary}
          importantForAccessibility="no-hide-descendants"
          name="book-outline"
          size={24}
        />
        <View style={styles.copy}>
          <AppText variant="headingMd">Đọc từng từ và ví dụ</AppText>
          <AppText tone="secondary">{activity.instructionsVietnamese}</AppText>
        </View>
      </View>

      <View style={styles.entries}>
        {activity.payload.entries.map((entry, index) => (
          <View
            key={`${entry.term}-${index}`}
            style={[
              styles.entry,
              { backgroundColor: theme.color.surfaceSubtle, borderColor: theme.color.borderSubtle },
            ]}
          >
            <AppText style={styles.term}>{entry.term}</AppText>
            <AppText style={styles.reading} tone="action" variant="bodyLg">
              {entry.reading}
            </AppText>
            <AppText variant="bodyLg">{entry.meaningVietnamese}</AppText>
            <View style={[styles.example, { backgroundColor: theme.color.surface }]}>
              <AppText style={styles.exampleValue}>{entry.example.value}</AppText>
              <AppText tone="secondary" variant="bodySm">
                {entry.example.translationVietnamese}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.confirmation,
          { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
        ]}
      >
        <View style={styles.confirmationHeading}>
          <Ionicons
            color={theme.color.actionSecondary}
            importantForAccessibility="no-hide-descendants"
            name="sparkles-outline"
            size={23}
          />
          <View style={styles.copy}>
            <AppText variant="headingMd">Bạn đã đọc xong?</AppText>
            <AppText tone="secondary">
              Xác nhận chỉ ghi nhận rằng bạn đã học phần từ vựng này. Không có đáp án hay điểm số bị
              ẩn.
            </AppText>
          </View>
        </View>
        <Pressable
          accessibilityHint="Gửi xác nhận đã học từ vựng đến máy chủ"
          accessibilityLabel={isCompleted ? 'Tiến độ từ vựng đã được xác nhận' : 'Xác nhận đã học'}
          accessibilityRole="button"
          accessibilityState={{ busy: isSubmitting, disabled: isSubmitting || isCompleted }}
          disabled={isSubmitting || isCompleted}
          onPress={onConfirm}
          style={({ pressed }) => [
            styles.primaryAction,
            {
              backgroundColor: theme.color.actionPrimary,
              opacity: isSubmitting || isCompleted ? 0.48 : pressed ? 0.78 : 1,
            },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.color.onActionPrimary} />
          ) : (
            <>
              <AppText style={{ color: theme.color.onActionPrimary }} variant="label">
                {isCompleted ? 'Đã xác nhận' : 'Xác nhận đã học'}
              </AppText>
              <Ionicons
                color={theme.color.onActionPrimary}
                importantForAccessibility="no-hide-descendants"
                name="checkmark-circle-outline"
                size={20}
              />
            </>
          )}
        </Pressable>
        {isSubmitting ? (
          <Pressable
            accessibilityHint="Dừng yêu cầu và giữ nguyên lần gửi để có thể thử lại an toàn"
            accessibilityLabel="Dừng yêu cầu xác nhận"
            accessibilityRole="button"
            onPress={onStop}
            style={({ pressed }) => [
              styles.secondaryAction,
              { borderColor: theme.color.borderSubtle, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppText variant="label">Dừng yêu cầu</AppText>
          </Pressable>
        ) : null}
      </View>

      <VocabularyActivityFeedbackCard
        feedback={feedback}
        onRetry={onRetry}
        onSignIn={onSignIn}
        receipt={receipt}
      />
    </>
  );
}
