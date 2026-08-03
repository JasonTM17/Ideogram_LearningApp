import { useRouter } from 'expo-router';

import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { reviewContent } from './review-content';

export function ReviewScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold
      description={reviewContent.description}
      eyebrow={reviewContent.eyebrow}
      title={reviewContent.title}
    >
      <StatusPanel
        actionHint="Mở hàng đợi ôn tập được đồng bộ với tài khoản"
        actionLabel="Bắt đầu ôn tập"
        description={reviewContent.description}
        onAction={() => router.push('/review/session')}
        title="Mở phiên ôn tập"
        variant="empty"
      />
    </ScreenScaffold>
  );
}
