import type { CurrencyCode, DocumentItem } from '../../types/models';
import { EmptyState } from '../ui/EmptyState';
import { DocumentItemRow } from './DocumentItemRow';

export function DocumentItemsTable({ items, currency, errors, onChange }: { items: DocumentItem[]; currency: CurrencyCode; errors: Record<string, string[]>; onChange: (items: DocumentItem[]) => void }) {
  const update = (index: number, item: DocumentItem) => onChange(items.map((current, itemIndex) => itemIndex === index ? item : current));
  const move = (index: number, direction: -1 | 1) => { const next = [...items]; const target = index + direction; [next[index], next[target]] = [next[target], next[index]]; onChange(next); };
  if (!items.length) return <EmptyState title="Noch keine Positionen" text="Fügen Sie Arbeitszeit, Material oder eine freie Position hinzu." />;
  return <div className="document-items-wrap"><table className="document-items-table"><thead><tr><th>Pos.</th><th>Beschreibung</th><th>Menge</th><th>Einheit</th><th>Einzelpreis</th><th>Rabatt %</th><th>MwSt. %</th><th>Gesamt</th><th>Aktionen</th></tr></thead><tbody>{items.map((item, index) => <DocumentItemRow key={item.id} item={item} index={index} count={items.length} currency={currency} errors={errors[item.id]} onChange={(updated) => update(index, updated)} onMove={(direction) => move(index, direction)} onDelete={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} />)}</tbody></table></div>;
}
