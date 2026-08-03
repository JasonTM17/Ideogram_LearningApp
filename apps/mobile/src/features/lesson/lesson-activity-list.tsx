import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';

import type { LearnerCatalogActivity } from '@ideogram/contracts';

const activityLabels: Record<LearnerCatalogActivity['activityType'], string> = {
  grammar: 'Ngữ pháp',
  listening: 'Nghe',
  objective_quiz: 'Trắc nghiệm',
  reading: 'Đọc',
  retrieval: 'Gợi nhớ',
  speaking: 'Nói',
  vocabulary: 'Từ vựng',
  writing: 'Viết',
};

interface LessonActivityListProps {
  activities: LearnerCatalogActivity[];
  onOpenVocabularyActivity: (activityId: string) => void;
}

export function LessonActivityList({
  activities,
  onOpenVocabularyActivity,
}: LessonActivityListProps) {
  const { theme } = useMobileTheme();

  return (
    <View style={styles.list}>
      <AppText variant="headingMd">Hoạt động trong bài</AppText>
      {activities.map((activity, index) => {
        const isSupported = activity.activityType === 'vocabulary';
        const isPlannedListening =
          activity.activityType === 'listening' &&
          activity.payload.audioProductionStatus === 'planned';
        const content = (
          <>
            <View style={[styles.number, { backgroundColor: theme.color.surfaceSubtle }]}>
              <AppText tone="action" variant="label">
                {index + 1}
              </AppText>
            </View>
            <View style={styles.copy}>
              <AppText variant="headingMd">{activity.titleVietnamese}</AppText>
              <AppText tone="secondary">{activity.instructionsVietnamese}</AppText>
              <AppText tone="tertiary" variant="caption">
                {`${activityLabels[activity.activityType]} · ${activity.estimatedMinutes} phút`}
              </AppText>
              <AppText
                tone={isSupported ? 'success' : isPlannedListening ? 'action' : 'tertiary'}
                variant="caption"
              >
                {isSupported
                  ? 'Có thể mở để học'
                  : isPlannedListening
                    ? 'Bản nghe chưa được phát hành · Bạn vẫn có thể học các phần khác.'
                    : 'Chưa hỗ trợ trong lượt này'}
              </AppText>
            </View>
            <Ionicons
              color={isSupported ? theme.color.actionPrimary : theme.color.textTertiary}
              importantForAccessibility="no-hide-descendants"
              name={
                isSupported
                  ? 'chevron-forward'
                  : isPlannedListening
                    ? 'volume-mute-outline'
                    : 'lock-closed-outline'
              }
              size={20}
            />
          </>
        );

        const cardStyle = [
          styles.activity,
          { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
        ];

        return isSupported ? (
          <Pressable
            key={activity.activityId}
            accessibilityHint="Mở hoạt động từ vựng để đọc và xác nhận đã học"
            accessibilityLabel={`Mở hoạt động ${index + 1}: ${activity.titleVietnamese}`}
            accessibilityRole="button"
            onPress={() => onOpenVocabularyActivity(activity.activityId)}
            style={({ pressed }) => [...cardStyle, { opacity: pressed ? 0.74 : 1 }]}
          >
            {content}
          </Pressable>
        ) : (
          <View
            key={activity.activityId}
            accessibilityLabel={`Hoạt động ${index + 1}: ${activity.titleVietnamese}. ${isPlannedListening ? 'Bản nghe chưa được phát hành. Bạn vẫn có thể học các phần khác.' : 'Chưa hỗ trợ trong lượt này.'}`}
            accessibilityState={{ disabled: true }}
            style={cardStyle}
          >
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activity: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[3],
    padding: nativeLayoutTokens.spacing[3],
  },
  copy: {
    flex: 1,
    gap: nativeLayoutTokens.spacing[1],
    minWidth: 0,
  },
  list: {
    gap: nativeLayoutTokens.spacing[3],
  },
  number: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.chip,
    height: nativeLayoutTokens.touchTarget.android,
    justifyContent: 'center',
    width: nativeLayoutTokens.touchTarget.android,
  },
});
