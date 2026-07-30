import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { findCatalogLesson } from '@/features/learning/catalog-presentation';
import { LessonOverviewView } from '@/features/learning/lesson-overview-view';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';
import { readLearnerCatalog } from '@/server/learning/learner-catalog-repository';

export const dynamic = 'force-dynamic';

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const returnPath = `/lessons/${encodeURIComponent(lessonId)}`;
  const { client } = await requireLearnerPageSession(returnPath);
  const catalog = await readLearnerCatalog(client);
  const lessonContext = findCatalogLesson(catalog, lessonId);

  if (!lessonContext) {
    notFound();
  }

  return (
    <AppShell activeKey="today">
      <LessonOverviewView lessonContext={lessonContext} />
    </AppShell>
  );
}
