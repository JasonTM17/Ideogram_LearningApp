import { useRouter } from 'expo-router';

import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { CatalogLessonCard } from './catalog-lesson-card';
import { useNativeLearnerCatalog } from './native-learner-catalog-provider';
import { todayContent } from './today-content';

export function TodayScreen() {
  const router = useRouter();
  const { reload, state } = useNativeLearnerCatalog();
  const nextLesson = state.kind === 'ready' ? state.nextLesson : null;

  return (
    <ScreenScaffold
      description={todayContent.description}
      eyebrow={todayContent.eyebrow}
      title={todayContent.title}
    >
      {state.kind === 'waiting' || state.kind === 'loading' ? (
        <StatusPanel
          description="Đang xác minh phiên và tải nội dung học an toàn."
          title="Đang chuẩn bị bài học"
          variant="loading"
        />
      ) : null}
      {state.kind === 'error' ? (
        <StatusPanel
          actionHint="Thử tải lại danh mục bài học"
          actionLabel="Thử lại"
          description="Chưa thể tải danh mục học. Tiến độ của bạn không bị thay đổi."
          onAction={reload}
          title="Nội dung tạm thời chưa sẵn sàng"
          variant="error"
        />
      ) : null}
      {state.kind === 'ready' && nextLesson === null ? (
        <StatusPanel
          description="Tài khoản này chưa có bài đã xuất bản để bắt đầu."
          title="Chưa có bài học"
          variant="empty"
        />
      ) : null}
      {nextLesson ? (
        <CatalogLessonCard
          lessonContext={nextLesson}
          onStart={() =>
            router.push({
              pathname: '/lessons/[lessonId]',
              params: { lessonId: nextLesson.lesson.lessonId },
            })
          }
        />
      ) : null}
    </ScreenScaffold>
  );
}
