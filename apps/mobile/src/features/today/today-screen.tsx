import { useRouter } from 'expo-router';

import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { CatalogLessonCard } from './catalog-lesson-card';
import { CatalogTrackList } from './catalog-track-list';
import { useNativeLearnerCatalog } from './native-learner-catalog-provider';
import { useNativeOfflineSync } from '../offline-sync/native-offline-sync-provider';
import { NativeOfflineMediaPanel } from '../offline-media/native-offline-media-panel';
import { createCatalogTracks } from './catalog-track-presentation';
import { todayContent } from './today-content';

export function TodayScreen() {
  const router = useRouter();
  const { reload, state } = useNativeLearnerCatalog();
  const offlineSync = useNativeOfflineSync();
  const nextLesson = state.kind === 'ready' ? state.nextLesson : null;
  const tracks = state.kind === 'ready' ? createCatalogTracks(state.catalog) : [];
  const openLesson = (lessonId: string) =>
    router.push({ pathname: '/lessons/[lessonId]', params: { lessonId } });

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
          actionHint="Mở bài placement để chọn điểm bắt đầu"
          actionLabel="Làm placement"
          description="Tài khoản này chưa có bài đã xuất bản để bắt đầu."
          onAction={() => router.push('/onboarding')}
          title="Chưa có bài học"
          variant="empty"
        />
      ) : null}
      {nextLesson ? (
        <CatalogLessonCard
          lessonContext={nextLesson}
          onStart={() => openLesson(nextLesson.lesson.lessonId)}
        />
      ) : null}
      {state.kind === 'ready' && tracks.length > 0 ? (
        <CatalogTrackList onSelect={openLesson} tracks={tracks} />
      ) : null}
      {state.kind === 'ready' ? <NativeOfflineMediaPanel /> : null}
      {offlineSync.pendingCount > 0 ? (
        <StatusPanel
          actionHint="Gửi các thay đổi đã lưu trên thiết bị"
          actionLabel="Đồng bộ ngay"
          description={`${offlineSync.pendingCount} thay đổi đang chờ; dữ liệu chỉ được xóa sau khi máy chủ xác nhận.`}
          onAction={() => void offlineSync.syncNow()}
          title="Đang chờ đồng bộ"
          variant="offline"
        />
      ) : null}
      {offlineSync.blockedCount > 0 ? (
        <StatusPanel
          actionHint="Thử gửi lại các thay đổi đang bị chặn"
          actionLabel="Thử lại mục lỗi"
          description={`${offlineSync.blockedCount} thay đổi bị máy chủ từ chối hoặc đã hết lượt thử. Bạn có thể thử lại hoặc bỏ chúng khỏi thiết bị.`}
          onAction={() => void offlineSync.retryBlocked()}
          onSecondaryAction={() => void offlineSync.discardBlocked()}
          secondaryActionHint="Bỏ các thay đổi lỗi khỏi thiết bị; dữ liệu chưa được máy chủ xác nhận sẽ không thể khôi phục"
          secondaryActionLabel="Bỏ mục lỗi"
          title="Cần xử lý đồng bộ"
          variant="error"
        />
      ) : null}
    </ScreenScaffold>
  );
}
