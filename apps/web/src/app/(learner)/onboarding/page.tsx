import { AppShell } from '@/components/app-shell/app-shell';
import { PlacementFlow } from '@/features/placement/placement-flow';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';
import { readPlacementCatalog } from '@/server/learning/placement-repository';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const { client } = await requireLearnerPageSession('/onboarding');
  const catalog = await readPlacementCatalog(client);
  return (
    <AppShell activeKey="today">
      <PlacementFlow catalog={catalog} />
    </AppShell>
  );
}
