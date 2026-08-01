import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { StyleSheet, View } from 'react-native';

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
}

export function LessonActivityList({ activities }: LessonActivityListProps) {
  const { theme } = useMobileTheme();

  return (
    <View style={styles.list}>
      <AppText variant="headingMd">Hoạt động trong bài</AppText>
      {activities.map((activity, index) => (
        <View
          key={activity.activityId}
          accessibilityLabel={`Hoạt động ${index + 1}: ${activity.titleVietnamese}`}
          style={[
            styles.activity,
            { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
          ]}
        >
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
          </View>
          <Ionicons
            color={theme.color.textTertiary}
            name="chevron-forward"
            size={20}
            importantForAccessibility="no-hide-descendants"
          />
        </View>
      ))}
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
