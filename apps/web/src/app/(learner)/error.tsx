'use client';

import { CircleAlert, RotateCw } from 'lucide-react';

import { AppShell } from '@/components/app-shell/app-shell';

export default function LearnerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell activeKey="today">
      <section className="learner-error" role="alert">
        <span aria-hidden="true">
          <CircleAlert size={26} />
        </span>
        <div>
          <p>Không tải được dữ liệu</p>
          <h1>Không gian học tạm thời chưa sẵn sàng</h1>
          <p>Phiên của bạn vẫn an toàn. Hãy thử tải lại; nếu lỗi còn tiếp diễn, quay lại sau.</p>
          <button onClick={reset} type="button">
            <RotateCw aria-hidden="true" size={18} />
            Thử lại
          </button>
        </div>
      </section>
    </AppShell>
  );
}
