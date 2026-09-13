import { SearchX } from 'lucide-react';

export function EmptyState({ title = 'Keine Ergebnisse', text = 'Passen Sie Suche oder Filter an.' }: { title?: string; text?: string }) {
  return <div className="empty-state"><SearchX size={30} /><strong>{title}</strong><span>{text}</span></div>;
}
