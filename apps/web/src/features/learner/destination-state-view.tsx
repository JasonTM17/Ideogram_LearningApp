import { ArrowRight } from 'lucide-react';

import { ActionLink } from '@/components/ui/action-link';
import { PageHeading } from '@/components/ui/page-heading';
import { StatusPanel } from '@/components/ui/status-panel';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface DestinationStateViewProps {
  actionHref?: string;
  actionLabel?: string;
  description: ReactNode;
  eyebrow: string;
  icon: LucideIcon;
  panelDescription: ReactNode;
  panelLabel?: string;
  panelTitle: ReactNode;
  title: ReactNode;
  tone?: 'neutral' | 'info' | 'warm';
}

export function DestinationStateView({
  actionHref = '/today',
  actionLabel = 'Về Hôm nay',
  description,
  eyebrow,
  icon,
  panelDescription,
  panelLabel,
  panelTitle,
  title,
  tone,
}: DestinationStateViewProps) {
  return (
    <div className="destination-state-view">
      <PageHeading description={description} eyebrow={eyebrow} title={title} />
      <StatusPanel
        action={
          <ActionLink href={actionHref} variant="secondary">
            {actionLabel}
            <ArrowRight aria-hidden="true" size={18} />
          </ActionLink>
        }
        description={panelDescription}
        icon={icon}
        title={panelTitle}
        {...(panelLabel ? { label: panelLabel } : {})}
        {...(tone ? { tone } : {})}
      />
    </div>
  );
}
