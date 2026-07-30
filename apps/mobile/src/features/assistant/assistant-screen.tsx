import { FeatureListCard } from '../../components/feature-list-card';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { assistantContent } from './assistant-content';

export function AssistantScreen() {
  return (
    <ScreenScaffold
      description={assistantContent.description}
      eyebrow={assistantContent.eyebrow}
      title={assistantContent.title}
    >
      <StatusPanel
        description={assistantContent.stateDescription}
        title={assistantContent.stateTitle}
        variant="planned"
      />
      <FeatureListCard items={assistantContent.plannedCapabilities} title="Phạm vi dự kiến" />
    </ScreenScaffold>
  );
}
