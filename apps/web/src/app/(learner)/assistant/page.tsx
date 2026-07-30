import { Bot } from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';
import { DestinationStateView } from '@/features/learner/destination-state-view';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';

export const dynamic = 'force-dynamic';

export default async function AssistantPage() {
  await requireLearnerPageSession('/assistant');

  return (
    <AppShell activeKey="assistant">
      <DestinationStateView
        description="Trợ lý sẽ dùng cấu hình học riêng, ngữ cảnh bài và ranh giới dữ liệu dành cho người Việt."
        eyebrow="Trợ lý"
        icon={Bot}
        panelDescription="Phase 6 sẽ nối DeepSeek qua server với giới hạn chi phí, kiểm duyệt, nguồn học và cơ chế fallback. Màn này không giả lập hội thoại."
        panelLabel="Tính năng sắp mở"
        panelTitle="Gia sư AI chưa được kích hoạt"
        title="Hỏi đúng ngữ cảnh, nhận câu trả lời có căn cứ"
        tone="warm"
      />
    </AppShell>
  );
}
