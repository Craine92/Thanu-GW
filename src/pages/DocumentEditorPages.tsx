import { useNavigate, useParams } from 'react-router-dom';
import { DocumentEditor } from '../components/documents/DocumentEditor';
import { useApp } from '../context/AppContext';
import { useDocumentPdf } from '../hooks/useDocumentPdf';
import type { InvoiceDraft, QuoteDraft } from '../types/models';
import { calculateTotal } from '../utils/money';

export function QuoteEditorPage() {
  const { id } = useParams();
  const { data, createQuote, updateQuote } = useApp();
  const { downloadPdf } = useDocumentPdf();
  const navigate = useNavigate();
  const initial = id ? data!.quotes.find((quote) => quote.id === id) : undefined;
  async function save(draft: QuoteDraft, close: boolean) {
    const quote = initial ? await updateQuote(initial.id, draft) : await createQuote(draft);
    navigate(close ? `/kostenvoranschlaege/${quote.id}` : `/kostenvoranschlaege/${quote.id}/bearbeiten`, { replace: !initial });
  }
  function pdf(draft: QuoteDraft) {
    if (!initial) return;
    downloadPdf('quote', { ...initial, ...draft, items: structuredClone(draft.items), total: calculateTotal(draft.items), updatedAt: new Date().toISOString() });
  }
  return <DocumentEditor kind="quote" initial={initial} onSave={save} onPdf={initial ? pdf : undefined} onCancel={() => navigate(initial ? `/kostenvoranschlaege/${initial.id}` : '/kostenvoranschlaege')} />;
}

export function InvoiceEditorPage() {
  const { id } = useParams();
  const { data, createInvoice, updateInvoice } = useApp();
  const { downloadPdf } = useDocumentPdf();
  const navigate = useNavigate();
  const initial = id ? data!.invoices.find((invoice) => invoice.id === id) : undefined;
  async function save(draft: InvoiceDraft, close: boolean) {
    const invoice = initial ? await updateInvoice(initial.id, draft) : await createInvoice(draft);
    navigate(close ? `/rechnungen/${invoice.id}` : `/rechnungen/${invoice.id}/bearbeiten`, { replace: !initial });
  }
  function pdf(draft: InvoiceDraft) {
    if (!initial) return;
    downloadPdf('invoice', { ...initial, ...draft, items: structuredClone(draft.items), total: calculateTotal(draft.items), updatedAt: new Date().toISOString() });
  }
  return <DocumentEditor kind="invoice" initial={initial} onSave={save} onPdf={initial ? pdf : undefined} onCancel={() => navigate(initial ? `/rechnungen/${initial.id}` : '/rechnungen')} />;
}
