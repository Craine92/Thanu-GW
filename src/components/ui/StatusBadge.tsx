import { statusTone } from '../../utils/status';

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`status-badge status-badge--${statusTone(status)}`}><span />{label}</span>;
}
