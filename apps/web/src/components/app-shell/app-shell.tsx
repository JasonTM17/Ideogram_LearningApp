import type { ReactNode } from 'react';

import type { LearnerDestinationKey } from './app-shell-destinations';
import { AppShellMobileNav } from './app-shell-mobile-nav';
import { AppShellSidebar } from './app-shell-sidebar';

interface AppShellProps {
  activeKey: LearnerDestinationKey;
  children: ReactNode;
}

export function AppShell({ activeKey, children }: AppShellProps) {
  return (
    <div className="learner-shell">
      <div className="learner-shell__frame">
        <AppShellSidebar activeKey={activeKey} />
        <div className="learner-shell__main-column">
          <main className="learner-shell__content" id="main-content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
      <div className="learner-shell__bottom-nav">
        <AppShellMobileNav activeKey={activeKey} />
      </div>
    </div>
  );
}
