import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { StatusPanel } from '../../components/status-panel';
import { TaskScreenScaffold } from '../../components/task-screen-scaffold';
import { findCatalogLesson } from '../today/catalog-lesson-context';
import { useNativeLearnerCatalog } from '../today/native-learner-catalog-provider';
import { LessonActivityList } from './lesson-activity-list';

export function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId?: string | string[] }>();
  const { reload, state } = useNativeLearnerCatalog();
  const catalogLesson =
    state.kind === 'ready' && typeof lessonId === 'string'
      ? findCatalogLesson(state.catalog, lessonId)
      : null;

  return (
    <TaskScreenScaffold backLabel="Hôm nay" fallbackHref="/" title="Bài học">
      {state.kind === 'waiting' || state.kind === 'loading' ? (
        <StatusPanel
          description="Đang tải bài học đã xuất bản từ danh mục của bạn."
          title="Đang mở bài học"
          variant="loading"
        />
      ) : null}
      {state.kind === 'error' ? (
        <StatusPanel
          actionHint="Thử tải lại danh mục và bài học"
          actionLabel="Thử lại"
          description="Chưa thể mở bài học. Tiến độ của bạn không bị thay đổi."
          onAction={reload}
          title="Bài học tạm thời chưa sẵn sàng"
          variant="error"
        />
      ) : null}
      {state.kind === 'ready' && catalogLesson === null ? (
        <StatusPanel
          description="Bài học này không còn có trong danh mục đã xuất bản."
          title="Không tìm thấy bài học"
          variant="empty"
        />
      ) : null}
      {catalogLesson ? (
        <>
          <View accessibilityRole="header" style={styles.header}>
            <AppText tone="action" variant="label">
              {`${catalogLesson.languageName} · ${catalogLesson.levelCode}`.toLocaleUpperCase('vi')}
            </AppText>
            <AppText variant="headingLg">{catalogLesson.lesson.titleVietnamese}</AppText>
            <AppText tone="secondary">{catalogLesson.lesson.summaryVietnamese}</AppText>
            <AppText tone="tertiary" variant="caption">
              {`${catalogLesson.unitTitle} · ${catalogLesson.lesson.estimatedMinutes} phút`}
            </AppText>
          </View>
          <LessonActivityList activities={catalogLesson.lesson.activities} />
        </>
      ) : null}
    </TaskScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: nativeLayoutTokens.spacing[2],
  },
});
