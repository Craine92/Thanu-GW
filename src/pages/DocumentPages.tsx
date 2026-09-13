import {
  CheckCircle2, Copy, CreditCard, Ellipsis, Eye, FileDown, FilePenLine, MailCheck,
  Plus, ReceiptText, Send, Trash2, XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { DataTable, type Column, type RowAction } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableToolbar } from '../components/ui/TableToolbar';
import { DocumentTotals } from '../components/documents/DocumentTotals';
import { useApp } from '../context/AppContext';
import { useDocumentPdf } from '../hooks/useDocumentPdf';
import type { Invoice, Quote } from '../types/models';
import { formatDate, relativeTime } from '../utils/date';
import { formatCurrency } from '../utils/money';
import { invoiceStatusLabels, quoteStatusLabels } from '../utils/status';

type Kind = 'quote' | 'invoice';

export function DocumentsListPage({ kind }: { kind: Kind }) {
  const { data, deleteQuote, duplicateQuote, convertQuoteToInvoice, duplicateInvoice, setInvoiceStatus, removeOrCancelInvoice } = useApp();
  const { downloadPdf } = useDocumentPdf();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [confirm, setConfirm] = useState<{ action: 'delete' | 'cancel' | 'convert'; document: Quote | Invoice } | null>(null);
  const documents = kind === 'quote' ? data!.quotes : data!.invoices;
  const statusLabels = kind === 'quote' ? quoteStatusLabels : invoiceStatusLabels;
  const customer = (id: string) => data!.customers.find((item) => item.id === id)?.name ?? '–';
  const rows = documents.filter((document) => `${document.number} ${document.title} ${customer(document.customerId)}`.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')) && (status === 'all' || document.status === status));

  async function duplicate(document: Quote | Invoice) {
    const created = kind === 'quote' ? await duplicateQuote(document.id) : await duplicateInvoice(document.id);
    navigate(`/${kind === 'quote' ? 'kostenvoranschlaege' : 'rechnungen'}/${created.id}`);
  }
  async function confirmAction() {
    if (!confirm) return;
    if (confirm.action === 'delete') { await deleteQuote(confirm.document.id); setConfirm(null); }
    else if (confirm.action === 'cancel') { await removeOrCancelInvoice(confirm.document.id); setConfirm(null); }
    else {
      const result = await convertQuoteToInvoice(confirm.document.id); setConfirm(null);
      navigate(`/rechnungen/${result.invoice.id}`);
    }
  }

  const quoteActions: RowAction<Quote>[] = [
    { label: 'Öffnen', icon: Eye, onClick: (row) => navigate(`/kostenvoranschlaege/${row.id}`) },
    { label: 'Bearbeiten', icon: FilePenLine, onClick: (row) => navigate(`/kostenvoranschlaege/${row.id}/bearbeiten`) },
    { label: 'PDF herunterladen', icon: FileDown, onClick: (row) => downloadPdf('quote', row) },
    { label: 'Duplizieren', icon: Copy, onClick: duplicate },
    { label: 'In Rechnung umwandeln', icon: ReceiptText, onClick: (row) => setConfirm({ action: 'convert', document: row }) },
    { label: 'Löschen', icon: Trash2, tone: 'danger', onClick: (row) => setConfirm({ action: 'delete', document: row }) },
  ];
  const invoiceActions: RowAction<Invoice>[] = [
    { label: 'Öffnen', icon: Eye, onClick: (row) => navigate(`/rechnungen/${row.id}`) },
    { label: 'Bearbeiten', icon: FilePenLine, onClick: (row) => navigate(`/rechnungen/${row.id}/bearbeiten`) },
    { label: 'PDF herunterladen', icon: FileDown, onClick: (row) => downloadPdf('invoice', row) },
    { label: 'Duplizieren', icon: Copy, onClick: duplicate },
    { label: 'Als versendet markieren', icon: Send, hidden: (row) => row.status !== 'draft', onClick: (row) => setInvoiceStatus(row.id, 'sent') },
    { label: 'Als bezahlt markieren', icon: CheckCircle2, hidden: (row) => ['paid', 'cancelled'].includes(row.status), onClick: (row) => setInvoiceStatus(row.id, 'paid') },
    { label: 'Löschen', icon: Trash2, tone: 'danger', hidden: (row) => row.status !== 'draft', onClick: (row) => setConfirm({ action: 'cancel', document: row }) },
    { label: 'Stornieren', icon: XCircle, tone: 'danger', hidden: (row) => ['draft', 'cancelled'].includes(row.status), onClick: (row) => setConfirm({ action: 'cancel', document: row }) },
  ];
  const quoteColumns: Column<Quote>[] = [
    { key: 'number', label: 'Nummer', render: (row) => <button className="record-link" onClick={() => navigate(`/kostenvoranschlaege/${row.id}`)}>{row.number}</button>, sortValue: (row) => row.number },
    { key: 'customer', label: 'Kunde', render: (row) => customer(row.customerId), sortValue: (row) => customer(row.customerId) },
    { key: 'title', label: 'Titel', render: (row) => row.title }, { key: 'date', label: 'Datum', render: (row) => formatDate(row.issueDate), sortValue: (row) => row.issueDate },
    { key: 'valid', label: 'Gültig bis', render: (row) => formatDate(row.validUntil), sortValue: (row) => row.validUntil },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} label={quoteStatusLabels[row.status]}/> },
    { key: 'total', label: 'Betrag', render: (row) => formatCurrency(row.total, row.currency), sortValue: (row) => row.total, align: 'right' },
  ];
  const invoiceColumns: Column<Invoice>[] = [
    { key: 'number', label: 'Nummer', render: (row) => <button className="record-link" onClick={() => navigate(`/rechnungen/${row.id}`)}>{row.number}</button>, sortValue: (row) => row.number },
    { key: 'customer', label: 'Kunde', render: (row) => customer(row.customerId), sortValue: (row) => customer(row.customerId) },
    { key: 'date', label: 'Rechnungsdatum', render: (row) => formatDate(row.issueDate), sortValue: (row) => row.issueDate },
    { key: 'due', label: 'Fälligkeit', render: (row) => <span className={row.status === 'overdue' ? 'text-danger' : ''}>{formatDate(row.dueDate)}</span>, sortValue: (row) => row.dueDate },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} label={invoiceStatusLabels[row.status]}/> },
    { key: 'total', label: 'Betrag', render: (row) => formatCurrency(row.total, row.currency), sortValue: (row) => row.total, align: 'right' },
    { key: 'open', label: 'Offen', render: (row) => <strong>{formatCurrency(Math.max(0, row.total - row.paidAmount), row.currency)}</strong>, sortValue: (row) => row.total - row.paidAmount, align: 'right' },
  ];

  const convertedInvoice = confirm?.action === 'convert' && (confirm.document as Quote).convertedInvoiceId ? data!.invoices.find((invoice) => invoice.id === (confirm.document as Quote).convertedInvoiceId) : undefined;
  return <div className="page"><PageHeader eyebrow="Verkauf" title={kind === 'quote' ? 'Kostenvoranschläge' : 'Rechnungen'} description={kind === 'quote' ? 'Offerten erstellen, nachverfolgen und direkt in Rechnungen überführen.' : 'Rechnungen erstellen, Zahlungen erfassen und Fälligkeiten verfolgen.'} actions={<Button icon={Plus} onClick={() => navigate(`/${kind === 'quote' ? 'kostenvoranschlaege' : 'rechnungen'}/neu`)}>{kind === 'quote' ? 'Neuer Kostenvoranschlag' : 'Neue Rechnung'}</Button>} />
    <section className="panel list-panel"><TableToolbar query={query} onQuery={setQuery} filter={status} onFilter={setStatus} filterOptions={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} placeholder="Nummer, Kunde oder Titel durchsuchen …"/>{kind === 'quote' ? <DataTable<Quote> rows={rows as Quote[]} columns={quoteColumns} rowLabel={(row) => row.number} actions={quoteActions}/> : <DataTable<Invoice> rows={rows as Invoice[]} columns={invoiceColumns} rowLabel={(row) => row.number} actions={invoiceActions}/>}</section>
    <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.action === 'convert' ? convertedInvoice ? 'Rechnung bereits vorhanden' : 'Kostenvoranschlag in Rechnung umwandeln?' : confirm?.action === 'cancel' && (confirm.document as Invoice)?.status !== 'draft' ? 'Rechnung stornieren?' : 'Dokument löschen?'} size="small" footer={convertedInvoice ? <><Button variant="secondary" onClick={() => setConfirm(null)}>Abbrechen</Button><Button onClick={() => navigate(`/rechnungen/${convertedInvoice.id}`)}>Rechnung öffnen</Button></> : <><Button variant="secondary" onClick={() => setConfirm(null)}>Abbrechen</Button><Button variant={confirm?.action === 'convert' ? 'primary' : 'danger'} onClick={confirmAction}>{confirm?.action === 'convert' ? 'Rechnung erstellen' : confirm?.action === 'cancel' && (confirm.document as Invoice)?.status !== 'draft' ? 'Rechnung stornieren' : 'Endgültig löschen'}</Button></>}>
      <p className="dialog-copy">{convertedInvoice ? `Für diesen Kostenvoranschlag existiert bereits ${convertedInvoice.number}.` : confirm?.action === 'convert' ? `${(confirm.document as Quote)?.status !== 'accepted' ? 'Dieser Kostenvoranschlag wurde noch nicht als angenommen markiert. Trotzdem ' : ''}aus ${(confirm.document as Quote)?.number} eine unabhängige Rechnung erstellen?` : confirm?.action === 'cancel' && (confirm.document as Invoice)?.status !== 'draft' ? `Die Rechnung ${(confirm.document as Invoice)?.number} bleibt erhalten und wird als storniert markiert.` : 'Der Entwurf wird dauerhaft gelöscht. Die verwendete Nummer wird nicht erneut vergeben.'}</p>
    </Modal>
  </div>;
}

export function DocumentDetailPage({ kind }: { kind: Kind }) {
  const { id = '' } = useParams();
  const { data, setQuoteStatus, duplicateQuote, convertQuoteToInvoice, deleteQuote, duplicateInvoice, setInvoiceStatus, recordInvoicePayment, removeOrCancelInvoice } = useApp();
  const { downloadPdf, previewPdf } = useDocumentPdf();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [dialog, setDialog] = useState<'convert' | 'delete' | 'cancel' | 'payment' | null>(null);
  const [payment, setPayment] = useState(0);
  const document = kind === 'quote' ? data!.quotes.find((item) => item.id === id) : data!.invoices.find((item) => item.id === id);
  if (!document) return <div className="page"><PageHeader title="Dokument nicht gefunden"/><section className="panel"><EmptyState title="Der Beleg existiert nicht" text="Er wurde möglicherweise gelöscht oder die Adresse ist ungültig."/></section></div>;
  const quote = document as Quote; const invoice = document as Invoice;
  const labels = kind === 'quote' ? quoteStatusLabels : invoiceStatusLabels;
  const customer = document.customerSnapshot;
  const linkedInvoice = kind === 'quote' && quote.convertedInvoiceId ? data!.invoices.find((item) => item.id === quote.convertedInvoiceId) : undefined;
  const sourceQuote = kind === 'invoice' && invoice.sourceQuoteId ? data!.quotes.find((item) => item.id === invoice.sourceQuoteId) : undefined;
  const activities = data!.activities.filter((entry) => entry.entityId === document.id || entry.text.includes(document.number)).slice(0, 8);

  async function duplicate() { const created = kind === 'quote' ? await duplicateQuote(id) : await duplicateInvoice(id); navigate(`/${kind === 'quote' ? 'kostenvoranschlaege' : 'rechnungen'}/${created.id}`); }
  async function confirmAction() {
    if (dialog === 'convert') { const result = await convertQuoteToInvoice(id); setDialog(null); navigate(`/rechnungen/${result.invoice.id}`); }
    if (dialog === 'delete') { await deleteQuote(id); navigate('/kostenvoranschlaege'); }
    if (dialog === 'cancel') { await removeOrCancelInvoice(id); navigate('/rechnungen'); }
    if (dialog === 'payment') { await recordInvoicePayment(id, payment); setDialog(null); setPayment(0); }
  }
  return <div className="page document-detail-page"><div className="detail-breadcrumb"><Link to={`/${kind === 'quote' ? 'kostenvoranschlaege' : 'rechnungen'}`}>{kind === 'quote' ? 'Kostenvoranschläge' : 'Rechnungen'}</Link><span>/</span><strong>{document.number}</strong></div>
    <header className="document-detail-header"><div><span className="eyebrow">{kind === 'quote' ? 'Kostenvoranschlag' : 'Rechnung'}</span><div className="document-detail-title"><h1>{document.number}</h1><StatusBadge status={document.status} label={labels[document.status as keyof typeof labels]}/></div><p>{document.title}</p></div><div className="document-detail-actions"><Button variant="secondary" icon={FileDown} onClick={() => downloadPdf(kind, document)}>PDF herunterladen</Button><Button variant="secondary" icon={FilePenLine} onClick={() => navigate(`/${kind === 'quote' ? 'kostenvoranschlaege' : 'rechnungen'}/${id}/bearbeiten`)}>Bearbeiten</Button>{kind === 'quote' ? <Button icon={ReceiptText} onClick={() => setDialog('convert')}>{linkedInvoice ? 'Rechnung öffnen' : 'In Rechnung umwandeln'}</Button> : invoice.status === 'draft' ? <Button icon={MailCheck} onClick={() => setInvoiceStatus(id, 'sent')}>Als versendet markieren</Button> : !['paid', 'cancelled'].includes(invoice.status) ? <Button icon={CreditCard} onClick={() => setDialog('payment')}>Zahlung erfassen</Button> : null}<div className="detail-more"><button className="icon-button detail-more__button" onClick={() => setMoreOpen((value) => !value)}><Ellipsis size={20}/></button>{moreOpen && <div className="row-menu detail-more__menu"><button onClick={() => { setMoreOpen(false); void previewPdf(kind, document); }}><Eye size={15}/><span>PDF-Vorschau</span></button><button onClick={() => { setMoreOpen(false); void duplicate(); }}><Copy size={15}/><span>Duplizieren</span></button>{kind === 'quote' && quote.status !== 'accepted' && <button onClick={() => { setMoreOpen(false); void setQuoteStatus(id, 'accepted'); }}><CheckCircle2 size={15}/><span>Als angenommen markieren</span></button>}{kind === 'invoice' && !['paid', 'cancelled'].includes(invoice.status) && <button onClick={() => { setMoreOpen(false); void setInvoiceStatus(id, 'paid'); }}><CheckCircle2 size={15}/><span>Als bezahlt markieren</span></button>}<button className="row-menu__danger" onClick={() => { setMoreOpen(false); setDialog(kind === 'quote' ? 'delete' : 'cancel'); }}>{kind === 'quote' || invoice.status === 'draft' ? <Trash2 size={15}/> : <XCircle size={15}/>}<span>{kind === 'quote' || invoice.status === 'draft' ? 'Löschen' : 'Stornieren'}</span></button></div>}</div></div></header>
    {(linkedInvoice || sourceQuote) && <div className="document-link-banner"><ReceiptText size={17}/><span>{linkedInvoice ? <>Rechnung <Link to={`/rechnungen/${linkedInvoice.id}`}>{linkedInvoice.number}</Link> wurde aus diesem Kostenvoranschlag erstellt.</> : <>Erstellt aus Kostenvoranschlag <Link to={`/kostenvoranschlaege/${sourceQuote!.id}`}>{sourceQuote!.number}</Link>.</>}</span></div>}
    <section className="document-facts"><article><small>Empfänger</small><strong>{customer.name}</strong><span>{customer.contactPerson ?? customer.number}</span></article><article><small>{kind === 'quote' ? 'Ausgestellt am' : 'Rechnungsdatum'}</small><strong>{formatDate(document.issueDate)}</strong><span>{kind === 'quote' ? `Gültig bis ${formatDate(quote.validUntil)}` : `Fällig am ${formatDate(invoice.dueDate)}`}</span></article><article><small>Gesamtbetrag</small><strong>{formatCurrency(document.total, document.currency)}</strong><span>{document.currency}</span></article>{kind === 'invoice' && <><article><small>Bezahlt</small><strong className="text-success">{formatCurrency(invoice.paidAmount, invoice.currency)}</strong><span>Zahlungseingänge</span></article><article><small>Offener Betrag</small><strong className={invoice.total - invoice.paidAmount > 0 ? 'text-danger' : 'text-success'}>{formatCurrency(Math.max(0, invoice.total - invoice.paidAmount), invoice.currency)}</strong><span>{invoice.status === 'paid' ? 'Vollständig beglichen' : 'Noch ausstehend'}</span></article></>}</section>
    <div className="document-detail-layout"><div><section className="panel detail-section"><div className="panel__head"><div><h2>Positionen</h2><p>{document.items.length} Leistungen und Materialien</p></div></div><div className="detail-items-wrap"><table className="detail-items"><thead><tr><th>Pos.</th><th>Beschreibung</th><th>Menge</th><th>Einzelpreis</th><th>Rabatt</th><th>MwSt.</th><th>Gesamt</th></tr></thead><tbody>{document.items.map((item, index) => <tr key={item.id}><td>{String(index + 1).padStart(2, '0')}</td><td><strong>{item.description.split('\n')[0]}</strong>{item.description.includes('\n') && <small>{item.description.split('\n').slice(1).join(' ')}</small>}</td><td>{String(item.quantity).replace('.', ',')} {item.unit}</td><td>{formatCurrency(item.unitPrice, document.currency)}</td><td>{item.discount ? `${item.discount} %` : '–'}</td><td>{item.taxRate} %</td><td><strong>{formatCurrency(item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.taxRate / 100), document.currency)}</strong></td></tr>)}</tbody></table></div></section><section className="panel detail-section detail-texts"><div><small>Einleitung</small><p>{document.introduction || '–'}</p></div><div><small>Schlusstext</small><p>{document.closingText || '–'}</p></div>{document.notes && <div><small>Hinweis</small><p>{document.notes}</p></div>}</section></div><aside><section className="panel detail-summary"><div className="panel__head"><div><h2>Summen</h2><p>Berechnung in {document.currency}</p></div></div><DocumentTotals items={document.items} currency={document.currency}/></section><section className="panel detail-history"><div className="panel__head"><div><h2>Historie</h2><p>Letzte Belegaktionen</p></div></div>{activities.length ? activities.map((entry) => <div className="history-entry" key={entry.id}><span/><div><p>{entry.text}</p><small>{relativeTime(entry.date)}</small></div></div>) : <p className="history-empty">Noch keine protokollierten Aktionen.</p>}</section></aside></div>
    <Modal open={Boolean(dialog)} onClose={() => setDialog(null)} title={dialog === 'convert' ? linkedInvoice ? 'Rechnung bereits vorhanden' : 'In Rechnung umwandeln?' : dialog === 'payment' ? 'Zahlung erfassen' : dialog === 'cancel' && invoice.status !== 'draft' ? 'Rechnung stornieren?' : 'Dokument löschen?'} size="small" footer={dialog === 'convert' && linkedInvoice ? <><Button variant="secondary" onClick={() => setDialog(null)}>Abbrechen</Button><Button onClick={() => navigate(`/rechnungen/${linkedInvoice.id}`)}>Rechnung öffnen</Button></> : <><Button variant="secondary" onClick={() => setDialog(null)}>Abbrechen</Button><Button variant={dialog === 'convert' || dialog === 'payment' ? 'primary' : 'danger'} onClick={confirmAction} disabled={dialog === 'payment' && payment <= 0}>{dialog === 'convert' ? 'Rechnung erstellen' : dialog === 'payment' ? 'Zahlung verbuchen' : dialog === 'cancel' && invoice.status !== 'draft' ? 'Stornieren' : 'Endgültig löschen'}</Button></>}>
      {dialog === 'payment' ? <label className="field"><span>Zahlungsbetrag ({invoice.currency})</span><input type="number" min="0.01" max={Math.max(0, invoice.total - invoice.paidAmount)} step="0.01" value={payment || ''} onChange={(event) => setPayment(Number(event.target.value))}/><small>Offen: {formatCurrency(Math.max(0, invoice.total - invoice.paidAmount), invoice.currency)}</small></label> : <p className="dialog-copy">{dialog === 'convert' && linkedInvoice ? `Für diesen Kostenvoranschlag existiert bereits ${linkedInvoice.number}.` : dialog === 'convert' ? `${quote.status !== 'accepted' ? 'Dieser Kostenvoranschlag ist noch nicht angenommen. Trotzdem ' : ''}eine neue, unabhängige Rechnung aus ${quote.number} erstellen?` : dialog === 'cancel' && invoice.status !== 'draft' ? `Die Rechnung ${invoice.number} wird nicht gelöscht, sondern revisionssicher storniert.` : 'Der Beleg wird dauerhaft entfernt. Seine Nummer bleibt verbraucht.'}</p>}
    </Modal>
  </div>;
}
