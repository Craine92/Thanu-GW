import { useCallback } from 'react';
import type { Invoice, Quote } from '../types/models';
import { useApp } from '../context/AppContext';

export function useDocumentPdf() {
  const { data, notify } = useApp();
  const run = useCallback(async (mode: 'download' | 'preview', kind: 'quote' | 'invoice', document: Quote | Invoice) => {
    if (!data) return;
    try {
      const { documentPdfService } = await import('../services/pdf/documentPdfService');
      const customer = data.customers.find((item) => item.id === document.customerId);
      const reference = kind === 'invoice' && (document as Invoice).sourceQuoteId ? data.quotes.find((quote) => quote.id === (document as Invoice).sourceQuoteId)?.number : undefined;
      documentPdfService[mode](kind, document, customer, data.settings, reference);
      if (mode === 'download') notify(`${kind === 'quote' ? 'Kostenvoranschlag' : 'Rechnung'} wurde als PDF erstellt.`);
    } catch (error) {
      console.error('PDF konnte nicht erstellt werden.', error);
      notify('PDF konnte nicht erstellt werden.', 'danger');
    }
  }, [data, notify]);
  return {
    downloadPdf: (kind: 'quote' | 'invoice', document: Quote | Invoice) => run('download', kind, document),
    previewPdf: (kind: 'quote' | 'invoice', document: Quote | Invoice) => run('preview', kind, document),
  };
}
