import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import type { CurrencyCode, DocumentItem } from '../../types/models';
import { formatCurrency } from '../../utils/money';

export function DocumentItemRow({ item, index, count, currency, errors, onChange, onMove, onDelete }: {
  item: DocumentItem; index: number; count: number; currency: CurrencyCode; errors?: string[];
  onChange: (item: DocumentItem) => void; onMove: (direction: -1 | 1) => void; onDelete: () => void;
}) {
  const update = <K extends keyof DocumentItem>(key: K, value: DocumentItem[K]) => onChange({ ...item, [key]: value });
  const total = item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.taxRate / 100);
  return <tr className={errors?.length ? 'document-item-row--error' : ''}>
    <td className="item-position"><strong>{String(index + 1).padStart(2, '0')}</strong><span className={`item-type item-type--${item.itemType}`}>{item.itemType === 'labor' ? 'Zeit' : item.itemType === 'material' ? 'Material' : item.itemType === 'flat' ? 'Pauschal' : 'Frei'}</span></td>
    <td className="item-description"><textarea value={item.description} rows={2} onChange={(event) => update('description', event.target.value)} aria-label={`Beschreibung Position ${index + 1}`} />{errors?.map((error) => <small key={error}>{error}</small>)}</td>
    <td><input className="number-input" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => update('quantity', Number(event.target.value))} aria-label={`Menge Position ${index + 1}`} /></td>
    <td><input value={item.unit} onChange={(event) => update('unit', event.target.value)} aria-label={`Einheit Position ${index + 1}`} /></td>
    <td><input className="number-input" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => update('unitPrice', Number(event.target.value))} aria-label={`Einzelpreis Position ${index + 1}`} /></td>
    <td><input className="number-input" type="number" min="0" max="100" step="0.1" value={item.discount} onChange={(event) => update('discount', Number(event.target.value))} aria-label={`Rabatt Position ${index + 1}`} /></td>
    <td><input className="number-input" type="number" min="0" step="0.1" value={item.taxRate} onChange={(event) => update('taxRate', Number(event.target.value))} aria-label={`MwSt. Position ${index + 1}`} /></td>
    <td className="item-total">{formatCurrency(total, currency)}</td>
    <td><div className="item-actions"><button type="button" className="icon-button" disabled={index === 0} onClick={() => onMove(-1)} title="Nach oben"><ArrowUp size={15}/></button><button type="button" className="icon-button" disabled={index === count - 1} onClick={() => onMove(1)} title="Nach unten"><ArrowDown size={15}/></button><button type="button" className="icon-button icon-button--danger" onClick={onDelete} title="Position löschen"><Trash2 size={15}/></button></div></td>
  </tr>;
}
