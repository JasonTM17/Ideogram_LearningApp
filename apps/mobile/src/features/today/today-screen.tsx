import { useRouter } from 'expo-router';

import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { todayContent } from './today-content';

export function TodayScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold
      description={todayContent.description}
      eyebrow={todayContent.eyebrow}
      title={todayContent.title}
    >
      <StatusPanel
        actionHint={todayContent.stateActionHint}
        actionLabel={todayContent.stateAction}
        description={todayContent.stateDescription}
        onAction={() =>
          router.push({
            pathname: '/lessons/[lessonId]',
            params: { lessonId: 'planned' },
          })
        }
        title={todayContent.stateTitle}
        variant="planned"
      />
    </ScreenScaffold>
  );
}
