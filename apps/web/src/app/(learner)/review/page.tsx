import { RotateCcw } from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';
import { DestinationStateView } from '@/features/learner/destination-state-view';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  await requireLearnerPageSession('/review');

  return (
    <AppShell activeKey="review">
      <DestinationStateView
        actionHref="/learn"
        actionLabel="Mở lộ trình"
        description="Mỗi mục ôn phải đến từ một lần học đã ghi nhận và một lịch SRS có thể giải thích."
        eyebrow="Ôn tập"
        icon={RotateCcw}
        panelDescription="Hàng đợi chỉ mở sau khi API nộp bài và review transaction được nối trọn vẹn. Không có thẻ minh họa được tính như lịch sử thật."
        panelLabel="Tính năng đang hoàn thiện"
        panelTitle="Hàng đợi chưa được kết nối"
        title="Gợi nhớ đúng lúc, không lặp vô nghĩa"
      />
    </AppShell>
  );
}
