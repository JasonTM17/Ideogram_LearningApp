import { AppShell } from '@/components/app-shell/app-shell';
import { TutorPreferenceDraft } from '@/features/ai/tutor-preference-draft';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';

export const dynamic = 'force-dynamic';

export default async function AssistantPage() {
  await requireLearnerPageSession('/assistant');

  return (
    <AppShell activeKey="assistant">
      <TutorPreferenceDraft />
    </AppShell>
  );
}
