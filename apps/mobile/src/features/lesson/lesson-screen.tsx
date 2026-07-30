import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { StatusPanel } from '../../components/status-panel';
import { TaskScreenScaffold } from '../../components/task-screen-scaffold';
import { lessonContent } from './lesson-content';

export function LessonScreen() {
  return (
    <TaskScreenScaffold backLabel="Hôm nay" fallbackHref="/" title="Bài học">
      <View accessibilityRole="header" style={styles.header}>
        <AppText tone="action" variant="label">
          {lessonContent.eyebrow.toLocaleUpperCase('vi')}
        </AppText>
        <AppText variant="headingLg">{lessonContent.title}</AppText>
        <AppText tone="secondary">{lessonContent.description}</AppText>
      </View>
      <StatusPanel
        description={lessonContent.stateDescription}
        title={lessonContent.stateTitle}
        variant="planned"
      />
    </TaskScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: nativeLayoutTokens.spacing[2],
  },
});
