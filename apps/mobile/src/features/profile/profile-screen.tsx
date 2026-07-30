import { FeatureListCard } from '../../components/feature-list-card';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { profileContent } from './profile-content';

export function ProfileScreen() {
  return (
    <ScreenScaffold
      description={profileContent.description}
      eyebrow={profileContent.eyebrow}
      title={profileContent.title}
    >
      <StatusPanel
        description={profileContent.stateDescription}
        title={profileContent.stateTitle}
        variant="planned"
      />
      <FeatureListCard items={profileContent.controlGroups} title="Kiểm soát sắp có" />
    </ScreenScaffold>
  );
}
