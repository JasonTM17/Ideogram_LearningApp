import { AppShell } from '@/components/app-shell/app-shell';

export default function LearnerLoading() {
  return (
    <AppShell activeKey="today">
      <div className="learner-loading" aria-busy="true" aria-label="Đang tải nội dung học">
        <span className="learner-loading__line" />
        <span className="learner-loading__title" />
        <span className="learner-loading__line" />
        <span className="learner-loading__card" />
        <p className="visually-hidden">Đang tải nội dung học…</p>
      </div>
    </AppShell>
  );
}
