import type { InvoiceStatus, OrderStatus, QuoteStatus } from '../types/models';

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: 'Entwurf', sent: 'Versendet', partial: 'Teilbezahlt', paid: 'Bezahlt', overdue: 'Überfällig', cancelled: 'Storniert',
};
export const orderStatusLabels: Record<OrderStatus, string> = {
  planned: 'Geplant', in_progress: 'In Arbeit', waiting: 'Wartet', completed: 'Abgeschlossen', cancelled: 'Storniert',
};
export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: 'Entwurf', sent: 'Versendet', accepted: 'Angenommen', rejected: 'Abgelehnt', expired: 'Abgelaufen',
};

export function statusTone(status: string): string {
  if (['paid', 'completed', 'accepted'].includes(status)) return 'success';
  if (['overdue', 'rejected', 'cancelled'].includes(status)) return 'danger';
  if (['sent', 'in_progress', 'partial'].includes(status)) return 'info';
  if (['waiting', 'expired'].includes(status)) return 'warning';
  return 'neutral';
}
