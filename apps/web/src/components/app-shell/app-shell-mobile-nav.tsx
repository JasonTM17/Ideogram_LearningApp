import type { LearnerDestinationKey } from './app-shell-destinations';
import { AppShellNavigation } from './app-shell-navigation';

interface AppShellMobileNavProps {
  activeKey: LearnerDestinationKey;
}

export function AppShellMobileNav({ activeKey }: AppShellMobileNavProps) {
  return <AppShellNavigation activeKey={activeKey} variant="bottom" />;
}
