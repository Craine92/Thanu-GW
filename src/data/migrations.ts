import type { AppData, Customer, DocumentCustomerSnapshot, DocumentItem, Invoice, Quote } from '../types/models';
import { calculateTotal } from '../utils/money';
import { effectiveInvoiceStatus } from '../utils/documents';

export const APP_DATA_VERSION = 2;

function snapshot(customer: Customer | undefined): DocumentCustomerSnapshot {
  return {
    number: customer?.number ?? '', name: customer?.name ?? 'Unbekannter Kunde',
    contactPerson: customer?.contactPerson, email: customer?.email ?? '', phone: customer?.phone ?? '',
    address: structuredClone(customer?.address ?? { street: '', postalCode: '', city: '', country: 'Schweiz' }),
  };
}

function itemDefaults(item: Partial<DocumentItem>, index: number): DocumentItem {
  return {
    id: item.id ?? `migrated-item-${Date.now()}-${index}`,
    itemType: item.itemType ?? (item.materialId ? 'material' : item.standardPositionId ? 'flat' : item.unit === 'Std.' ? 'labor' : 'custom'),
    description: item.description ?? '', quantity: item.quantity ?? 1, unit: item.unit ?? 'Stk.',
    unitPrice: item.unitPrice ?? 0, discount: item.discount ?? 0, taxRate: item.taxRate ?? 0,
    materialId: item.materialId, standardPositionId: item.standardPositionId,
  };
}

export function normalizeAppData(data: AppData): AppData {
  const currency = data.settings?.currency ?? 'CHF';
  const quotes = (data.quotes ?? []).map((quote: Quote) => {
    const items = quote.items.map(itemDefaults);
    return {
      ...quote, items, total: calculateTotal(items), currency: quote.currency ?? currency,
      customerSnapshot: quote.customerSnapshot ?? snapshot(data.customers.find((customer) => customer.id === quote.customerId)),
      introduction: quote.introduction ?? 'Vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgenden Kostenvoranschlag.',
      notes: quote.notes ?? '', closingText: quote.closingText ?? `Dieser Kostenvoranschlag ist bis zum ${quote.validUntil} gültig.`,
      updatedAt: quote.updatedAt ?? quote.createdAt,
    };
  });
  const invoices = (data.invoices ?? []).map((invoice: Invoice) => {
    const items = invoice.items.map(itemDefaults);
    return {
      ...invoice, items, total: calculateTotal(items), currency: invoice.currency ?? currency,
      customerSnapshot: invoice.customerSnapshot ?? snapshot(data.customers.find((customer) => customer.id === invoice.customerId)),
      introduction: invoice.introduction ?? 'Vielen Dank für Ihren Auftrag.', notes: invoice.notes ?? '',
      closingText: invoice.closingText ?? `Zahlbar ohne Abzug innerhalb von ${data.settings.paymentTerms} Tagen.`,
      updatedAt: invoice.updatedAt ?? invoice.createdAt,
    };
  });
  const linkedQuotes = quotes.map((quote) => quote.id === 'quote-2' && !quote.convertedInvoiceId ? { ...quote, convertedInvoiceId: 'invoice-3' } : quote);
  const linkedInvoices = invoices.map((invoice) => {
    const linked = invoice.id === 'invoice-3' && !invoice.sourceQuoteId ? { ...invoice, sourceQuoteId: 'quote-2' } : invoice;
    return { ...linked, status: effectiveInvoiceStatus(linked) };
  });
  return { ...data, quotes: linkedQuotes, invoices: linkedInvoices };
}
