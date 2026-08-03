import { Settings } from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';
import { DestinationStateView } from '@/features/learner/destination-state-view';
import { OfflineMediaSettings } from '@/features/offline-media/offline-media-settings';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireLearnerPageSession('/you/settings');

  return (
    <AppShell activeKey="profile">
      <DestinationStateView
        actionHref="/you"
        actionLabel="Về hồ sơ"
        description="Mọi lựa chọn ngôn ngữ, quyền riêng tư và AI sẽ có giải thích trước khi thay đổi."
        eyebrow="Cài đặt"
        icon={Settings}
        panelDescription="Phiên closed beta hiện chỉ cho xem thông tin đã xác minh và đăng xuất. Các điều khiển cá nhân hóa sẽ mở khi API preference có lưu vết và hoàn tác."
        panelLabel="Tính năng đang hoàn thiện"
        panelTitle="Chưa có thay đổi nào được ghi tự động"
        title="Cấu hình rõ tác động, có thể hoàn tác"
        tone="warm"
      />
      <OfflineMediaSettings />
    </AppShell>
  );
}
