import { AppShell } from '@/components/app-shell/app-shell';
import { TodayView } from '@/features/learning/today-view';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';
import { readLearnerCatalog } from '@/server/learning/learner-catalog-repository';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const { client } = await requireLearnerPageSession('/today');
  const catalog = await readLearnerCatalog(client);

  return (
    <AppShell activeKey="today">
      <TodayView catalog={catalog} />
    </AppShell>
  );
}
