import { CircleHelp, Settings } from 'lucide-react';
import Link from 'next/link';

import { AppShellNavigation } from './app-shell-navigation';
import type { LearnerDestinationKey } from './app-shell-destinations';
import { BrandMark } from '@/components/ui/brand-mark';

interface AppShellSidebarProps {
  activeKey: LearnerDestinationKey;
}

export function AppShellSidebar({ activeKey }: AppShellSidebarProps) {
  return (
    <>
      <aside className="learner-shell__sidebar" aria-label="Thanh điều hướng chính">
        <div className="learner-shell__sidebar-inner">
          <BrandMark />
          <p className="learner-shell__pack-status">
            <span aria-hidden="true" className="learner-shell__pack-dot" />
            Tiếng Nhật đang hoạt động
          </p>
          <AppShellNavigation activeKey={activeKey} variant="sidebar" />
          <nav className="learner-shell__utility-nav" aria-label="Cài đặt và hỗ trợ">
            <Link href="/you/settings">
              <Settings aria-hidden="true" size={18} strokeWidth={1.8} />
              Cài đặt
            </Link>
            <Link href="/help">
              <CircleHelp aria-hidden="true" size={18} strokeWidth={1.8} />
              Trợ giúp
            </Link>
          </nav>
        </div>
      </aside>
      <aside className="learner-shell__rail" aria-label="Rail điều hướng">
        <div className="learner-shell__rail-inner">
          <BrandMark />
          <AppShellNavigation activeKey={activeKey} variant="rail" />
        </div>
      </aside>
    </>
  );
}
