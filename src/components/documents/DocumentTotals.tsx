import type { CurrencyCode, DocumentItem } from '../../types/models';
import { calculateMoneySummary, formatCurrency } from '../../utils/money';

export function DocumentTotals({ items, currency, compact = false }: { items: DocumentItem[]; currency: CurrencyCode; compact?: boolean }) {
  const summary = calculateMoneySummary(items);
  return <div className={`document-totals ${compact ? 'document-totals--compact' : ''}`}>
    <div><span>Zwischensumme</span><strong>{formatCurrency(summary.subtotal, currency)}</strong></div>
    <div><span>Rabatte</span><strong className={summary.discount ? 'text-danger' : ''}>{summary.discount ? '– ' : ''}{formatCurrency(summary.discount, currency)}</strong></div>
    <div className="document-totals__net"><span>Nettosumme</span><strong>{formatCurrency(summary.net, currency)}</strong></div>
    {summary.taxes.map((tax) => <div key={tax.rate}><span>MwSt. {tax.rate.toFixed(1).replace('.', ',')} %</span><strong>{formatCurrency(tax.amount, currency)}</strong></div>)}
    <div className="document-totals__grand"><span>Gesamtsumme</span><strong>{formatCurrency(summary.total, currency)}</strong></div>
  </div>;
}
