import { activityRepository, invoiceRepository, quoteRepository } from '../data/repositories';
import { databaseService } from '../data/database';
import type { Activity, AppData, Invoice, InvoiceDraft, InvoiceStatus, Quote, QuoteDraft, QuoteStatus } from '../types/models';
import { addDays, currentIsoDate } from '../utils/date';
import { cloneDocumentItems, effectiveInvoiceStatus, generateDocumentNumber } from '../utils/documents';
import { calculateTotal } from '../utils/money';

export interface MutationResult<T> { data: AppData; entity: T }
export interface ConversionResult extends MutationResult<Invoice> { alreadyExisting: boolean }

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function activity(type: Activity['type'], text: string, entityId: string): Activity {
  return { id: uid('activity'), type, text, date: new Date().toISOString(), entityId };
}

function allocateNumber(prefix: string, start: number, issueDate: string, existing: string[]): { number: string; next: number } {
  let sequence = Math.max(1, start);
  let number = generateDocumentNumber(prefix, sequence, issueDate);
  while (existing.includes(number)) { sequence += 1; number = generateDocumentNumber(prefix, sequence, issueDate); }
  return { number, next: sequence + 1 };
}

async function persistQuoteMutation(data: AppData, quotes: Quote[], settings = data.settings, activities = data.activities): Promise<AppData> {
  await Promise.all([quoteRepository.saveAll(quotes), databaseService.saveSettings(settings), activityRepository.saveAll(activities)]);
  return { ...data, quotes, settings, activities };
}

async function persistInvoiceMutation(data: AppData, invoices: Invoice[], settings = data.settings, activities = data.activities): Promise<AppData> {
  await Promise.all([invoiceRepository.saveAll(invoices), databaseService.saveSettings(settings), activityRepository.saveAll(activities)]);
  return { ...data, invoices, settings, activities };
}

export const documentService = {
  async createQuote(data: AppData, draft: QuoteDraft): Promise<MutationResult<Quote>> {
    const now = new Date().toISOString();
    const allocated = allocateNumber(data.settings.numberRanges.quotePrefix, data.settings.numberRanges.nextQuote, draft.issueDate, data.quotes.map((quote) => quote.number));
    const quote: Quote = {
      ...structuredClone(draft), id: uid('quote'),
      number: allocated.number,
      items: cloneDocumentItems(draft.items), total: calculateTotal(draft.items), createdAt: now, updatedAt: now,
    };
    const settings = { ...data.settings, numberRanges: { ...data.settings.numberRanges, nextQuote: allocated.next } };
    const activities = [activity('quote', `Kostenvoranschlag ${quote.number} wurde erstellt.`, quote.id), ...data.activities];
    const next = await persistQuoteMutation(data, [quote, ...data.quotes], settings, activities);
    return { data: next, entity: quote };
  },

  async updateQuote(data: AppData, id: string, draft: QuoteDraft): Promise<MutationResult<Quote>> {
    const existing = data.quotes.find((quote) => quote.id === id);
    if (!existing) throw new Error('Kostenvoranschlag wurde nicht gefunden.');
    const quote: Quote = { ...existing, ...structuredClone(draft), id, number: existing.number, convertedInvoiceId: existing.convertedInvoiceId, items: cloneDocumentItems(draft.items), total: calculateTotal(draft.items), createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    const quotes = data.quotes.map((item) => item.id === id ? quote : item);
    const activities = [activity('quote', `Kostenvoranschlag ${quote.number} wurde gespeichert.`, id), ...data.activities];
    return { data: await persistQuoteMutation(data, quotes, data.settings, activities), entity: quote };
  },

  async deleteQuote(data: AppData, id: string): Promise<AppData> {
    const quote = data.quotes.find((item) => item.id === id);
    if (!quote) throw new Error('Kostenvoranschlag wurde nicht gefunden.');
    const quotes = data.quotes.filter((item) => item.id !== id);
    const invoices = data.invoices.map((invoice) => invoice.sourceQuoteId === id ? { ...invoice, sourceQuoteId: undefined } : invoice);
    const activities = [activity('quote', `Kostenvoranschlag ${quote.number} wurde gelöscht.`, id), ...data.activities];
    await Promise.all([quoteRepository.saveAll(quotes), invoiceRepository.saveAll(invoices), activityRepository.saveAll(activities)]);
    return { ...data, quotes, invoices, activities };
  },

  async duplicateQuote(data: AppData, id: string): Promise<MutationResult<Quote>> {
    const source = data.quotes.find((quote) => quote.id === id);
    if (!source) throw new Error('Kostenvoranschlag wurde nicht gefunden.');
    const issueDate = currentIsoDate();
    return this.createQuote(data, {
      customerId: source.customerId, customerSnapshot: structuredClone(source.customerSnapshot), title: `${source.title} – Kopie`,
      currency: source.currency, status: 'draft', issueDate, validUntil: addDays(issueDate, 30),
      items: cloneDocumentItems(source.items), introduction: source.introduction, notes: source.notes, closingText: source.closingText,
    });
  },

  async setQuoteStatus(data: AppData, id: string, status: QuoteStatus): Promise<MutationResult<Quote>> {
    const quote = data.quotes.find((item) => item.id === id);
    if (!quote) throw new Error('Kostenvoranschlag wurde nicht gefunden.');
    const updated = { ...quote, status, updatedAt: new Date().toISOString() };
    const label = status === 'accepted' ? 'angenommen' : status === 'sent' ? 'an den Kunden versendet' : 'aktualisiert';
    const activities = [activity('quote', `Kostenvoranschlag ${quote.number} wurde ${label}.`, id), ...data.activities];
    return { data: await persistQuoteMutation(data, data.quotes.map((item) => item.id === id ? updated : item), data.settings, activities), entity: updated };
  },

  async convertQuoteToInvoice(data: AppData, id: string): Promise<ConversionResult> {
    const quote = data.quotes.find((item) => item.id === id);
    if (!quote) throw new Error('Kostenvoranschlag wurde nicht gefunden.');
    if (quote.convertedInvoiceId) {
      const existing = data.invoices.find((invoice) => invoice.id === quote.convertedInvoiceId);
      if (existing) return { data, entity: existing, alreadyExisting: true };
    }
    const issueDate = currentIsoDate();
    const allocated = allocateNumber(data.settings.numberRanges.invoicePrefix, data.settings.numberRanges.nextInvoice, issueDate, data.invoices.map((invoice) => invoice.number));
    const now = new Date().toISOString();
    const invoice: Invoice = {
      id: uid('invoice'), number: allocated.number,
      customerId: quote.customerId, customerSnapshot: structuredClone(quote.customerSnapshot), title: quote.title,
      currency: quote.currency, status: 'draft', issueDate, dueDate: addDays(issueDate, data.settings.paymentTerms), paidAmount: 0,
      items: cloneDocumentItems(quote.items), total: calculateTotal(quote.items), introduction: 'Vielen Dank für Ihren Auftrag.',
      notes: quote.notes, closingText: `Zahlbar ohne Abzug innerhalb von ${data.settings.paymentTerms} Tagen.`,
      sourceQuoteId: quote.id, createdAt: now, updatedAt: now,
    };
    const updatedQuote = { ...quote, convertedInvoiceId: invoice.id, updatedAt: now };
    const quotes = data.quotes.map((item) => item.id === id ? updatedQuote : item);
    const invoices = [invoice, ...data.invoices];
    const settings = { ...data.settings, numberRanges: { ...data.settings.numberRanges, nextInvoice: allocated.next } };
    const activities = [
      activity('invoice', `Aus ${quote.number} wurde Rechnung ${invoice.number} erstellt.`, invoice.id),
      activity('invoice', `Rechnung ${invoice.number} wurde erstellt.`, invoice.id), ...data.activities,
    ];
    await Promise.all([quoteRepository.saveAll(quotes), invoiceRepository.saveAll(invoices), databaseService.saveSettings(settings), activityRepository.saveAll(activities)]);
    return { data: { ...data, quotes, invoices, settings, activities }, entity: invoice, alreadyExisting: false };
  },

  async createInvoice(data: AppData, draft: InvoiceDraft): Promise<MutationResult<Invoice>> {
    const now = new Date().toISOString();
    const allocated = allocateNumber(data.settings.numberRanges.invoicePrefix, data.settings.numberRanges.nextInvoice, draft.issueDate, data.invoices.map((invoice) => invoice.number));
    const invoiceDraft: Invoice = {
      ...structuredClone(draft), id: uid('invoice'),
      number: allocated.number,
      items: cloneDocumentItems(draft.items), total: calculateTotal(draft.items), createdAt: now, updatedAt: now,
    };
    const invoice = { ...invoiceDraft, status: effectiveInvoiceStatus(invoiceDraft) };
    const settings = { ...data.settings, numberRanges: { ...data.settings.numberRanges, nextInvoice: allocated.next } };
    const activities = [activity('invoice', `Rechnung ${invoice.number} wurde erstellt.`, invoice.id), ...data.activities];
    return { data: await persistInvoiceMutation(data, [invoice, ...data.invoices], settings, activities), entity: invoice };
  },

  async updateInvoice(data: AppData, id: string, draft: InvoiceDraft): Promise<MutationResult<Invoice>> {
    const existing = data.invoices.find((invoice) => invoice.id === id);
    if (!existing) throw new Error('Rechnung wurde nicht gefunden.');
    const changed: Invoice = { ...existing, ...structuredClone(draft), id, number: existing.number, sourceQuoteId: existing.sourceQuoteId, items: cloneDocumentItems(draft.items), total: calculateTotal(draft.items), createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    const invoice = { ...changed, status: effectiveInvoiceStatus(changed) };
    const activities = [activity('invoice', `Rechnung ${invoice.number} wurde gespeichert.`, id), ...data.activities];
    return { data: await persistInvoiceMutation(data, data.invoices.map((item) => item.id === id ? invoice : item), data.settings, activities), entity: invoice };
  },

  async duplicateInvoice(data: AppData, id: string): Promise<MutationResult<Invoice>> {
    const source = data.invoices.find((invoice) => invoice.id === id);
    if (!source) throw new Error('Rechnung wurde nicht gefunden.');
    const issueDate = currentIsoDate();
    return this.createInvoice(data, {
      customerId: source.customerId, customerSnapshot: structuredClone(source.customerSnapshot), title: `${source.title} – Kopie`,
      currency: source.currency, status: 'draft', issueDate, dueDate: addDays(issueDate, data.settings.paymentTerms), paidAmount: 0,
      items: cloneDocumentItems(source.items), introduction: source.introduction, notes: source.notes, closingText: source.closingText,
      sourceQuoteId: undefined, orderId: undefined,
    });
  },

  async setInvoiceStatus(data: AppData, id: string, status: InvoiceStatus, paidAmount?: number): Promise<MutationResult<Invoice>> {
    const invoice = data.invoices.find((item) => item.id === id);
    if (!invoice) throw new Error('Rechnung wurde nicht gefunden.');
    const amount = status === 'paid' ? invoice.total : paidAmount ?? invoice.paidAmount;
    const updated: Invoice = { ...invoice, status, paidAmount: amount, updatedAt: new Date().toISOString() };
    const label = status === 'sent' ? 'als versendet markiert' : status === 'paid' ? 'als bezahlt markiert' : status === 'cancelled' ? 'storniert' : 'aktualisiert';
    const activities = [activity('invoice', `Rechnung ${invoice.number} wurde ${label}.`, id), ...data.activities];
    return { data: await persistInvoiceMutation(data, data.invoices.map((item) => item.id === id ? updated : item), data.settings, activities), entity: updated };
  },

  async recordInvoicePayment(data: AppData, id: string, payment: number): Promise<MutationResult<Invoice>> {
    const invoice = data.invoices.find((item) => item.id === id);
    if (!invoice) throw new Error('Rechnung wurde nicht gefunden.');
    const paidAmount = Math.min(invoice.total, Math.max(0, invoice.paidAmount + payment));
    const status: InvoiceStatus = paidAmount >= invoice.total ? 'paid' : paidAmount > 0 ? 'partial' : invoice.status;
    return this.setInvoiceStatus(data, id, status, paidAmount);
  },

  async removeOrCancelInvoice(data: AppData, id: string): Promise<AppData> {
    const invoice = data.invoices.find((item) => item.id === id);
    if (!invoice) throw new Error('Rechnung wurde nicht gefunden.');
    if (invoice.status !== 'draft') return (await this.setInvoiceStatus(data, id, 'cancelled')).data;
    const invoices = data.invoices.filter((item) => item.id !== id);
    const quotes = data.quotes.map((quote) => quote.convertedInvoiceId === id ? { ...quote, convertedInvoiceId: undefined } : quote);
    const activities = [activity('invoice', `Rechnung ${invoice.number} wurde gelöscht.`, id), ...data.activities];
    await Promise.all([invoiceRepository.saveAll(invoices), quoteRepository.saveAll(quotes), activityRepository.saveAll(activities)]);
    return { ...data, invoices, quotes, activities };
  },
};
