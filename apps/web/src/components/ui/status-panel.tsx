import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatusPanelProps {
  action?: ReactNode;
  description: ReactNode;
  icon: LucideIcon;
  label?: string;
  title: ReactNode;
  tone?: 'neutral' | 'info' | 'warm';
}

export function StatusPanel({
  action,
  description,
  icon: Icon,
  label,
  title,
  tone = 'neutral',
}: StatusPanelProps) {
  return (
    <section className="status-panel" data-tone={tone}>
      <div className="status-panel__icon" aria-hidden="true">
        <Icon size={24} strokeWidth={1.8} />
      </div>
      <div className="status-panel__copy">
        {label ? <p className="status-panel__label">{label}</p> : null}
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="status-panel__action">{action}</div> : null}
    </section>
  );
}
