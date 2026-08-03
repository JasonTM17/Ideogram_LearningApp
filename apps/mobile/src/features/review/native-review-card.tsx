import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';

import type { ReviewGrade } from '@ideogram/contracts';
import type { NativeReviewErrorFeedback } from './native-review-state';
import { styles } from './native-review-card-styles';
import type { NativeVocabularyReviewItem } from './review-queue-presentation';

interface NativeReviewCardProps {
  feedback: NativeReviewErrorFeedback | null;
  isAnswerRevealed: boolean;
  isSubmitting: boolean;
  item: NativeVocabularyReviewItem;
  onGrade: (grade: ReviewGrade) => void;
  onReveal: () => void;
  onRetry: () => void;
  onSignIn: () => void;
  onStop: () => void;
}

const choices: { grade: ReviewGrade; hint: string; label: string }[] = [
  { grade: 'again', hint: 'Chưa nhớ được từ hoặc nghĩa.', label: 'Chưa nhớ' },
  { grade: 'hard', hint: 'Nhớ được một phần, cần gặp lại sớm.', label: 'Khó' },
  { grade: 'good', hint: 'Nhớ được từ và nghĩa.', label: 'Tốt' },
  { grade: 'easy', hint: 'Nhớ rõ, có thể giãn lịch nhiều hơn.', label: 'Dễ' },
];

export function NativeReviewCard({
  feedback,
  isAnswerRevealed,
  isSubmitting,
  item,
  onGrade,
  onReveal,
  onRetry,
  onSignIn,
  onStop,
}: NativeReviewCardProps) {
  const { theme } = useMobileTheme();
  const isLocked = isSubmitting || feedback !== null;

  return (
    <>
      <View
        accessibilityLabel={`Thẻ ôn từ vựng ${item.entry.term}`}
        style={[
          styles.card,
          { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
        ]}
      >
        <AppText tone="action" variant="label">
          {item.state === 'relearning' ? 'CẦN GẶP LẠI' : 'TỪ VỰNG'}
        </AppText>
        <AppText tone="secondary" variant="caption">
          {item.activityTitle} · {item.lessonTitle}
        </AppText>
        <View style={[styles.prompt, { backgroundColor: theme.color.surfaceSubtle }]}>
          <AppText tone="secondary">Thử nhớ nghĩa trước khi mở gợi ý</AppText>
          <AppText style={styles.term} variant="display">
            {item.entry.term}
          </AppText>
        </View>
        <Pressable
          accessibilityHint="Mở hoặc ẩn nghĩa, cách đọc và ví dụ"
          accessibilityLabel={isAnswerRevealed ? 'Ẩn gợi ý' : 'Hiện nghĩa và ví dụ'}
          accessibilityRole="button"
          accessibilityState={{ expanded: isAnswerRevealed }}
          onPress={onReveal}
          style={({ pressed }) => [
            styles.outlineButton,
            { borderColor: theme.color.borderSubtle, opacity: pressed ? 0.72 : 1 },
          ]}
        >
          <AppText tone="action" variant="label">
            {isAnswerRevealed ? 'Ẩn gợi ý' : 'Hiện nghĩa và ví dụ'}
          </AppText>
        </Pressable>
        {isAnswerRevealed ? (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.answer, { backgroundColor: theme.color.surfaceSubtle }]}
          >
            <AppText tone="action" variant="bodyLg">
              {item.entry.reading}
            </AppText>
            <AppText variant="headingMd">{item.entry.meaningVietnamese}</AppText>
            <AppText>{item.entry.example.value}</AppText>
            <AppText tone="secondary" variant="bodySm">
              {item.entry.example.translationVietnamese}
            </AppText>
          </View>
        ) : null}
        <View style={styles.choicesHeading}>
          <AppText variant="headingMd">Bạn nhớ đến đâu?</AppText>
          <AppText tone="secondary" variant="bodySm">
            Tự đánh giá, không phải điểm chấm tự động.
          </AppText>
        </View>
        <View style={styles.choiceGrid}>
          {choices.map((choice) => (
            <Pressable
              accessibilityHint={choice.hint}
              accessibilityLabel={choice.label}
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting, disabled: isLocked }}
              disabled={isLocked}
              key={choice.grade}
              onPress={() => onGrade(choice.grade)}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: theme.color.actionPrimary,
                  opacity: isLocked ? 0.48 : pressed ? 0.78 : 1,
                },
              ]}
            >
              <AppText style={{ color: theme.color.onActionPrimary }} variant="label">
                {choice.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
      {isSubmitting ? (
        <Pressable accessibilityRole="button" onPress={onStop} style={styles.stop}>
          <ActivityIndicator color={theme.color.actionPrimary} />
          <AppText tone="action" variant="label">
            Dừng yêu cầu
          </AppText>
        </Pressable>
      ) : null}
      {feedback ? (
        <View
          accessibilityLiveRegion="assertive"
          style={[styles.feedback, { borderColor: theme.color.danger }]}
        >
          <AppText tone="danger">{feedback.message}</AppText>
          {feedback.requiresSignIn ? (
            <Pressable accessibilityRole="button" onPress={onSignIn}>
              <AppText tone="action" variant="label">
                Đăng nhập lại
              </AppText>
            </Pressable>
          ) : null}
          {feedback.retryable ? (
            <Pressable accessibilityRole="button" onPress={onRetry}>
              <AppText tone="action" variant="label">
                Thử lại an toàn
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );
}
