import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { findCatalogVocabularyActivity } from '@/features/learning/catalog-presentation';
import { VocabularyActivityView } from '@/features/learning/vocabulary-activity-view';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';
import { readLearnerCatalog } from '@/server/learning/learner-catalog-repository';

export const dynamic = 'force-dynamic';

export default async function LessonActivityPage({
  params,
}: {
  params: Promise<{ activityId: string; lessonId: string }>;
}) {
  const { activityId, lessonId } = await params;
  const returnPath = `/lessons/${encodeURIComponent(lessonId)}/activities/${encodeURIComponent(activityId)}`;
  const { client } = await requireLearnerPageSession(returnPath);
  const catalog = await readLearnerCatalog(client);
  const activityContext = findCatalogVocabularyActivity(catalog, lessonId, activityId);

  if (!activityContext) {
    notFound();
  }

  return (
    <AppShell activeKey="today">
      <VocabularyActivityView
        activityContext={activityContext}
        signInHref={`/sign-in?returnTo=${encodeURIComponent(returnPath)}`}
      />
    </AppShell>
  );
}
