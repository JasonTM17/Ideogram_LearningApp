interface PlannedBadgeProps {
  compact?: boolean;
}

export function PlannedBadge({ compact = false }: PlannedBadgeProps) {
  return <span className="planned-badge">{compact ? 'Sắp mở' : 'Đã lên kế hoạch'}</span>;
}
