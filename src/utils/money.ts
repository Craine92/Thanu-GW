import type { CurrencyCode, DocumentItem } from '../types/models';

const localeByCurrency: Record<CurrencyCode, string> = {
  CHF: 'de-CH',
  EUR: 'de-DE',
  USD: 'en-US',
  GBP: 'en-GB',
};

export function formatCurrency(amount: number, currency: CurrencyCode, locale?: string): string {
  return new Intl.NumberFormat(locale || localeByCurrency[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculateSubtotal(items: DocumentItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function calculateDiscount(items: DocumentItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.discount / 100), 0);
}

export function calculateTax(items: DocumentItem[]): number {
  return items.reduce((sum, item) => {
    const net = item.quantity * item.unitPrice * (1 - item.discount / 100);
    return sum + net * (item.taxRate / 100);
  }, 0);
}

export function calculateTotal(items: DocumentItem[]): number {
  return calculateSubtotal(items) - calculateDiscount(items) + calculateTax(items);
}

export interface MoneySummary {
  subtotal: number;
  discount: number;
  net: number;
  taxes: { rate: number; amount: number }[];
  tax: number;
  total: number;
}

export function calculateMoneySummary(items: DocumentItem[]): MoneySummary {
  const subtotal = calculateSubtotal(items);
  const discount = calculateDiscount(items);
  const taxMap = new Map<number, number>();
  for (const item of items) {
    const itemNet = item.quantity * item.unitPrice * (1 - item.discount / 100);
    taxMap.set(item.taxRate, (taxMap.get(item.taxRate) ?? 0) + itemNet * (item.taxRate / 100));
  }
  const taxes = [...taxMap.entries()].sort(([a], [b]) => b - a).map(([rate, amount]) => ({ rate, amount }));
  const tax = taxes.reduce((sum, entry) => sum + entry.amount, 0);
  return { subtotal, discount, net: subtotal - discount, taxes, tax, total: subtotal - discount + tax };
}

export function getCurrencyLocale(currency: CurrencyCode): string {
  return localeByCurrency[currency];
}
