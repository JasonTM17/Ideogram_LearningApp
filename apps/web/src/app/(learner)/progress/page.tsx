import { ChartColumn } from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';
import { DestinationStateView } from '@/features/learner/destination-state-view';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  await requireLearnerPageSession('/progress');

  return (
    <AppShell activeKey="progress">
      <DestinationStateView
        actionHref="/learn"
        actionLabel="Xem lộ trình"
        description="Tiến độ phải giúp bạn chọn bước tiếp theo, không phải trang trí bằng biểu đồ."
        eyebrow="Tiến độ"
        icon={ChartColumn}
        panelDescription="Chỉ số sẽ xuất hiện sau khi activity attempt và review history được ghi nhận. Khi mở, mọi biểu đồ đều có bản tóm tắt bằng chữ."
        panelLabel="Tính năng đang hoàn thiện"
        panelTitle="Insight chưa được kết nối"
        title="Hiểu điểm mạnh và lỗi lặp lại"
        tone="info"
      />
    </AppShell>
  );
}
