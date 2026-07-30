import { AppShell } from '@/components/app-shell/app-shell';
import { LearningPathView } from '@/features/learning/learning-path-view';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';
import { readLearnerCatalog } from '@/server/learning/learner-catalog-repository';

export const dynamic = 'force-dynamic';

export default async function LearnPage() {
  const { client } = await requireLearnerPageSession('/learn');
  const catalog = await readLearnerCatalog(client);

  return (
    <AppShell activeKey="today">
      <LearningPathView catalog={catalog} />
    </AppShell>
  );
}
