import { AppShell } from '@/components/app-shell/app-shell';
import { ReviewQueueView } from '@/features/review/review-queue-view';
import { createReviewQueuePresentation } from '@/features/review/review-queue-presentation';
import { requireLearnerPageSession } from '@/lib/supabase/learner-session';
import { readLearnerCatalog } from '@/server/learning/learner-catalog-repository';
import { readLearnerReviewQueue } from '@/server/learning/review-queue-repository';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const { client } = await requireLearnerPageSession('/review');
  const [catalog, queue] = await Promise.all([
    readLearnerCatalog(client),
    readLearnerReviewQueue(client),
  ]);

  return (
    <AppShell activeKey="review">
      <ReviewQueueView
        presentation={createReviewQueuePresentation(queue, catalog)}
        signInHref="/sign-in?returnTo=%2Freview"
      />
    </AppShell>
  );
}
