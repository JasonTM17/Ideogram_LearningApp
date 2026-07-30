import { AppShell } from '@/components/app-shell/app-shell';
import { ProfileView } from '@/features/profile/profile-view';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const { user } = await requireLearnerPageSession('/you');

  return (
    <AppShell activeKey="profile">
      <ProfileView email={user.email ?? null} />
    </AppShell>
  );
}
