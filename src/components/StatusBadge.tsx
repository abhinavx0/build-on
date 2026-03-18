import { PlacementStatus, STATUS_LABELS } from '@/data/mockData';

export function StatusBadge({ status }: { status: PlacementStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
