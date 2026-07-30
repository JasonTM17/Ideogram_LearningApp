import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { StatusPanel } from '../../components/status-panel';
import { TaskScreenScaffold } from '../../components/task-screen-scaffold';
import { reviewSessionContent } from './review-content';

export function ReviewSessionScreen() {
  return (
    <TaskScreenScaffold backLabel="Ôn tập" fallbackHref="/review" title="Phiên ôn">
      <View accessibilityRole="header" style={styles.header}>
        <AppText tone="action" variant="label">
          {reviewSessionContent.eyebrow.toLocaleUpperCase('vi')}
        </AppText>
        <AppText variant="headingLg">{reviewSessionContent.title}</AppText>
        <AppText tone="secondary">{reviewSessionContent.description}</AppText>
      </View>
      <StatusPanel
        description={reviewSessionContent.stateDescription}
        title={reviewSessionContent.stateTitle}
        variant="empty"
      />
    </TaskScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: nativeLayoutTokens.spacing[2],
  },
});
