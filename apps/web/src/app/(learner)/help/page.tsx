import { CircleHelp } from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';
import { DestinationStateView } from '@/features/learner/destination-state-view';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';

export const dynamic = 'force-dynamic';

export default async function HelpPage() {
  await requireLearnerPageSession('/help');

  return (
    <AppShell activeKey="profile">
      <DestinationStateView
        actionHref="/you"
        actionLabel="Kiểm tra tài khoản"
        description="Các hướng dẫn khôi phục phải rõ ràng, không yêu cầu bạn gửi dữ liệu học hoặc mã phiên."
        eyebrow="Trợ giúp"
        icon={CircleHelp}
        panelDescription="Trong closed beta, hãy thử lại từ đúng màn đang dùng. Nếu liên kết đăng nhập hết hạn, yêu cầu một liên kết mới; không chuyển tiếp liên kết hoặc mã phiên cho người khác."
        panelLabel="Hướng dẫn an toàn"
        panelTitle="Khôi phục mà không làm lộ phiên"
        title="Gỡ vướng theo đúng ngữ cảnh"
        tone="info"
      />
    </AppShell>
  );
}
