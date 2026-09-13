import type { Customer, DocumentCustomerSnapshot, DocumentItem, Invoice } from '../types/models';
import { currentIsoDate } from './date';

export function customerSnapshot(customer: Customer): DocumentCustomerSnapshot {
  return {
    number: customer.number, name: customer.name, contactPerson: customer.contactPerson,
    email: customer.email, phone: customer.phone, address: structuredClone(customer.address),
  };
}

export function generateDocumentNumber(prefix: string, sequence: number, issueDate: string): string {
  const year = new Date(`${issueDate}T12:00:00`).getFullYear();
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

export function cloneDocumentItems(items: DocumentItem[]): DocumentItem[] {
  return items.map((item, index) => ({ ...structuredClone(item), id: `item-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}` }));
}

export function effectiveInvoiceStatus(invoice: Invoice): Invoice['status'] {
  if (invoice.status === 'paid' || invoice.status === 'cancelled' || invoice.status === 'draft') return invoice.status;
  if (invoice.paidAmount >= invoice.total) return 'paid';
  if (invoice.dueDate < currentIsoDate()) return 'overdue';
  if (invoice.paidAmount > 0) return 'partial';
  return invoice.status;
}
