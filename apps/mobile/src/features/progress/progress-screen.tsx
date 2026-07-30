import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { progressContent } from './progress-content';

export function ProgressScreen() {
  return (
    <ScreenScaffold
      description={progressContent.description}
      eyebrow={progressContent.eyebrow}
      title={progressContent.title}
    >
      <StatusPanel
        description={progressContent.stateDescription}
        title={progressContent.stateTitle}
        variant="empty"
      />
    </ScreenScaffold>
  );
}
