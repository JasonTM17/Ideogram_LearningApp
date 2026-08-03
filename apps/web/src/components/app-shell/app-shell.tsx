import type { ReactNode } from 'react';

import type { LearnerDestinationKey } from './app-shell-destinations';
import { AppShellMobileNav } from './app-shell-mobile-nav';
import { AppShellSidebar } from './app-shell-sidebar';
import { BrowserOfflineSyncIndicator } from '@/features/offline-sync/browser-offline-sync-indicator';
import { BrowserOfflineSyncProvider } from '@/features/offline-sync/browser-offline-sync-provider';

interface AppShellProps {
  activeKey: LearnerDestinationKey;
  children: ReactNode;
}

export function AppShell({ activeKey, children }: AppShellProps) {
  return (
    <BrowserOfflineSyncProvider>
      <div className="learner-shell">
        <div className="learner-shell__frame">
          <AppShellSidebar activeKey={activeKey} />
          <div className="learner-shell__main-column">
            <main className="learner-shell__content" id="main-content" tabIndex={-1}>
              {children}
            </main>
          </div>
        </div>
        <BrowserOfflineSyncIndicator />
        <div className="learner-shell__bottom-nav">
          <AppShellMobileNav activeKey={activeKey} />
        </div>
      </div>
    </BrowserOfflineSyncProvider>
  );
}
