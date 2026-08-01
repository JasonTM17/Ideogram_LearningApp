import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { PrimaryAction } from '../../components/primary-action';
import { useMobileTheme } from '../../components/use-mobile-theme';

import type { CatalogLessonContext } from './native-learner-catalog';

interface CatalogLessonCardProps {
  lessonContext: CatalogLessonContext;
  onStart: () => void;
}

export function CatalogLessonCard({ lessonContext, onStart }: CatalogLessonCardProps) {
  const { theme } = useMobileTheme();
  const { languageName, lesson, levelCode, unitTitle } = lessonContext;
  const activityCount = lesson.activities.length;

  return (
    <View
      accessibilityLabel={`Bài học ${lesson.titleVietnamese}, ${languageName} ${levelCode}`}
      style={[
        styles.card,
        { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
      ]}
    >
      <View style={styles.heading}>
        <View
          importantForAccessibility="no-hide-descendants"
          style={[styles.icon, { backgroundColor: theme.color.surfaceSubtle }]}
        >
          <Ionicons color={theme.color.actionPrimary} name="book-outline" size={24} />
        </View>
        <View style={styles.copy}>
          <AppText tone="action" variant="label">
            {`${languageName} · ${levelCode}`.toLocaleUpperCase('vi')}
          </AppText>
          <AppText variant="headingMd">{lesson.titleVietnamese}</AppText>
        </View>
      </View>
      <AppText tone="secondary">{lesson.summaryVietnamese}</AppText>
      <AppText tone="tertiary" variant="caption">
        {`${unitTitle} · ${lesson.estimatedMinutes} phút · ${activityCount} hoạt động`}
      </AppText>
      <PrimaryAction
        accessibilityHint="Mở bài học đã xuất bản trong danh mục của bạn"
        label="Bắt đầu bài học"
        onPress={onStart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[3],
    padding: nativeLayoutTokens.spacing[4],
  },
  copy: {
    flex: 1,
    gap: nativeLayoutTokens.spacing[1],
    minWidth: 0,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[3],
  },
  icon: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.chip,
    height: nativeLayoutTokens.touchTarget.android,
    justifyContent: 'center',
    width: nativeLayoutTokens.touchTarget.android,
  },
});
