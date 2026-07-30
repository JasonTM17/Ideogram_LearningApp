import { useRouter } from 'expo-router';

import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { reviewContent } from './review-content';

export function ReviewScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold
      description={reviewContent.description}
      eyebrow={reviewContent.eyebrow}
      title={reviewContent.title}
    >
      <StatusPanel
        actionHint={reviewContent.stateActionHint}
        actionLabel={reviewContent.stateAction}
        description={reviewContent.stateDescription}
        onAction={() => router.push('/review/session')}
        title={reviewContent.stateTitle}
        variant="planned"
      />
    </ScreenScaffold>
  );
}
