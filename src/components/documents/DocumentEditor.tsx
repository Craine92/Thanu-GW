import { ArrowLeft, FileDown, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CurrencyCode, DocumentItem, Invoice, InvoiceDraft, InvoiceStatus, Quote, QuoteDraft, QuoteStatus } from '../../types/models';
import { addDays, currentIsoDate, formatDate } from '../../utils/date';
import { customerSnapshot } from '../../utils/documents';
import { calculateMoneySummary } from '../../utils/money';
import { invoiceStatusLabels, quoteStatusLabels } from '../../utils/status';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { DocumentItemsTable } from './DocumentItemsTable';
import { DocumentTotals } from './DocumentTotals';
import { PositionPicker } from './PositionPicker';

type QuoteEditorProps = { kind: 'quote'; initial?: Quote; onSave: (draft: QuoteDraft, close: boolean) => Promise<void>; onPdf?: (draft: QuoteDraft) => void; onCancel: () => void };
type InvoiceEditorProps = { kind: 'invoice'; initial?: Invoice; onSave: (draft: InvoiceDraft, close: boolean) => Promise<void>; onPdf?: (draft: InvoiceDraft) => void; onCancel: () => void };
type DocumentEditorProps = QuoteEditorProps | InvoiceEditorProps;

interface FormErrors { customerId?: string; title?: string; issueDate?: string; endDate?: string; items?: string }

export function DocumentEditor(props: DocumentEditorProps) {
  const { data } = useApp();
  const settings = data!.settings;
  const initial = props.initial;
  const [customerId, setCustomerId] = useState(initial?.customerId ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? currentIsoDate());
  const [endDate, setEndDate] = useState(initial ? (props.kind === 'quote' ? (initial as Quote).validUntil : (initial as Invoice).dueDate) : addDays(currentIsoDate(), props.kind === 'quote' ? 30 : settings.paymentTerms));
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? settings.currency);
  const [status, setStatus] = useState<QuoteStatus | InvoiceStatus>(initial?.status ?? 'draft');
  const [introduction, setIntroduction] = useState(initial?.introduction ?? (props.kind === 'quote' ? 'Vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgenden Kostenvoranschlag.' : 'Vielen Dank für Ihren Auftrag.'));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [closingText, setClosingText] = useState(initial?.closingText ?? (props.kind === 'quote' ? 'Wir freuen uns auf Ihren Auftrag.' : `Zahlbar ohne Abzug innerhalb von ${settings.paymentTerms} Tagen.`));
  const [items, setItems] = useState<DocumentItem[]>(() => structuredClone(initial?.items ?? []));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string[]>>({});
  const [leaveOpen, setLeaveOpen] = useState(false);
  const chosenCustomer = useMemo(() => data!.customers.find((customer) => customer.id === customerId), [data, customerId]);
  const summary = calculateMoneySummary(items);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function change<T>(setter: (value: T) => void, value: T) { setter(value); setDirty(true); }
  function validate(): boolean {
    const next: FormErrors = {};
    if (!customerId) next.customerId = 'Bitte wählen Sie einen Kunden aus.';
    if (!title.trim()) next.title = 'Bitte geben Sie eine Bezeichnung ein.';
    if (!issueDate) next.issueDate = 'Bitte wählen Sie ein Ausstellungsdatum.';
    if (!endDate) next.endDate = 'Bitte wählen Sie ein Datum.';
    if (!items.length) next.items = 'Mindestens eine Position ist erforderlich.';
    const rows: Record<string, string[]> = {};
    for (const item of items) {
      const messages: string[] = [];
      if (!item.description.trim()) messages.push('Beschreibung fehlt.');
      if (!(item.quantity > 0)) messages.push('Menge muss grösser als 0 sein.');
      if (item.unitPrice < 0) messages.push('Preis darf nicht negativ sein.');
      if (item.discount < 0 || item.discount > 100) messages.push('Rabatt muss zwischen 0 und 100 % liegen.');
      if (item.taxRate < 0) messages.push('MwSt. darf nicht negativ sein.');
      if (messages.length) rows[item.id] = messages;
    }
    setErrors(next); setItemErrors(rows);
    return !Object.keys(next).length && !Object.keys(rows).length;
  }

  function createCommonDraft() {
    const snapshot = initial && initial.customerId === customerId ? structuredClone(initial.customerSnapshot) : customerSnapshot(chosenCustomer!);
    return { customerId, customerSnapshot: snapshot, title: title.trim(), currency, issueDate, items: structuredClone(items), introduction: introduction.trim(), notes: notes.trim(), closingText: closingText.trim() };
  }

  async function save(close: boolean) {
    if (!validate()) return;
    setSaving(true);
    try {
      if (props.kind === 'quote') await props.onSave({ ...createCommonDraft(), validUntil: endDate, status: status as QuoteStatus }, close);
      else await props.onSave({ ...createCommonDraft(), dueDate: endDate, status: status as InvoiceStatus, paidAmount: (initial as Invoice | undefined)?.paidAmount ?? 0, sourceQuoteId: (initial as Invoice | undefined)?.sourceQuoteId, orderId: (initial as Invoice | undefined)?.orderId }, close);
      setDirty(false);
    } catch {
      // Der AppContext hält den Editor geöffnet und zeigt die persistenzbezogene Fehlermeldung als Toast an.
    } finally { setSaving(false); }
  }

  function pdf() {
    if (!validate() || !props.onPdf) return;
    if (props.kind === 'quote') props.onPdf({ ...createCommonDraft(), validUntil: endDate, status: status as QuoteStatus });
    else props.onPdf({ ...createCommonDraft(), dueDate: endDate, status: status as InvoiceStatus, paidAmount: (initial as Invoice).paidAmount, sourceQuoteId: (initial as Invoice).sourceQuoteId, orderId: (initial as Invoice).orderId });
  }

  function cancel() { if (dirty) setLeaveOpen(true); else props.onCancel(); }
  const labels = props.kind === 'quote' ? quoteStatusLabels : invoiceStatusLabels;
  return <div className="page document-editor-page">
    <div className="document-editor-heading"><button onClick={cancel} className="back-link"><ArrowLeft size={16}/>Zurück zur Übersicht</button><div><span className="eyebrow">{props.kind === 'quote' ? 'Kostenvoranschlag' : 'Rechnung'} · {initial?.number ?? 'Neuer Beleg'}</span><h1>{initial ? `${initial.number} bearbeiten` : props.kind === 'quote' ? 'Neuen Kostenvoranschlag erstellen' : 'Neue Rechnung erstellen'}</h1></div></div>
    <div className="editor-actionbar"><div>{initial && <StatusBadge status={status} label={labels[status as keyof typeof labels]} />}<span>{dirty ? 'Nicht gespeicherte Änderungen' : initial ? `Zuletzt gespeichert ${formatDate(initial.updatedAt, true)}` : 'Noch nicht gespeichert'}</span></div><div><Button variant="secondary" onClick={cancel}>Abbrechen</Button>{initial && props.onPdf && <Button variant="secondary" icon={FileDown} onClick={pdf}>PDF</Button>}<Button variant="secondary" icon={Save} onClick={() => save(false)} disabled={saving}>{saving ? 'Speichert …' : 'Speichern'}</Button><Button icon={Save} onClick={() => save(true)} disabled={saving}>Speichern & schliessen</Button></div></div>
    <div className="document-editor-layout"><div className="document-editor-main">
      <section className="editor-section"><div className="editor-section__head"><div><span>01</span><div><h2>Dokumentdaten</h2><p>Empfänger, Laufzeit und Belegstatus</p></div></div></div><div className="editor-section__body form-grid"><label className={`field field--full ${errors.customerId ? 'field--error' : ''}`}><span>Kunde *</span><select value={customerId} onChange={(event) => change(setCustomerId, event.target.value)}><option value="">Kunde auswählen …</option>{data!.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.number} · {customer.name}</option>)}</select>{errors.customerId && <small>{errors.customerId}</small>}</label>{chosenCustomer && <div className="customer-snapshot-card field--full"><div><strong>{chosenCustomer.name}</strong><span>{chosenCustomer.contactPerson && `z. Hd. ${chosenCustomer.contactPerson} · `}{chosenCustomer.address.street}, {chosenCustomer.address.postalCode} {chosenCustomer.address.city}</span></div><small>Adresssnapshot wird beim Speichern festgeschrieben</small></div>}<label className={`field field--full ${errors.title ? 'field--error' : ''}`}><span>Bezeichnung / Titel *</span><input value={title} onChange={(event) => change(setTitle, event.target.value)} placeholder="z. B. Erneuerung Sanitäranlagen 2. Obergeschoss" />{errors.title && <small>{errors.title}</small>}</label><label className={`field ${errors.issueDate ? 'field--error' : ''}`}><span>{props.kind === 'quote' ? 'Ausstellungsdatum' : 'Rechnungsdatum'} *</span><input type="date" value={issueDate} onChange={(event) => { change(setIssueDate, event.target.value); if (!initial) setEndDate(addDays(event.target.value, props.kind === 'quote' ? 30 : settings.paymentTerms)); }} />{errors.issueDate && <small>{errors.issueDate}</small>}</label><label className={`field ${errors.endDate ? 'field--error' : ''}`}><span>{props.kind === 'quote' ? 'Gültig bis' : 'Fällig am'} *</span><input type="date" value={endDate} onChange={(event) => change(setEndDate, event.target.value)} />{errors.endDate && <small>{errors.endDate}</small>}</label><label className="field"><span>Währung</span><select value={currency} onChange={(event) => change(setCurrency, event.target.value as CurrencyCode)}><option value="CHF">CHF – Schweizer Franken</option><option value="EUR">EUR – Euro</option><option value="USD">USD – US-Dollar</option><option value="GBP">GBP – Britisches Pfund</option></select></label><label className="field"><span>Status</span><select value={status} onChange={(event) => change(setStatus, event.target.value as QuoteStatus | InvoiceStatus)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></section>
      <section className={`editor-section ${errors.items ? 'editor-section--error' : ''}`}><div className="editor-section__head"><div><span>02</span><div><h2>Positionen</h2><p>Leistungen, Arbeitszeit und Material</p></div></div><PositionPicker materials={data!.materials} positions={data!.standardPositions} defaultTax={settings.defaultTaxRate} onAdd={(item) => change(setItems, [...items, item])}/></div>{errors.items && <div className="section-error">{errors.items}</div>}<DocumentItemsTable items={items} currency={currency} errors={itemErrors} onChange={(value) => change(setItems, value)} /></section>
      <section className="editor-section"><div className="editor-section__head"><div><span>03</span><div><h2>Texte und Hinweise</h2><p>Individuelle Angaben für Kunde und internes Team</p></div></div></div><div className="editor-section__body form-grid"><label className="field field--full"><span>Einleitungstext</span><textarea rows={3} value={introduction} onChange={(event) => change(setIntroduction, event.target.value)} /></label><label className="field field--full"><span>Schlusstext / Zahlungshinweis</span><textarea rows={3} value={closingText} onChange={(event) => change(setClosingText, event.target.value)} /></label><label className="field field--full"><span>Notiz</span><textarea rows={3} value={notes} onChange={(event) => change(setNotes, event.target.value)} /><small>Hinweise werden im PDF dezent unter dem Schlusstext ausgegeben.</small></label></div></section>
    </div><aside className="editor-summary"><div className="editor-summary__head"><span>Zusammenfassung</span><StatusBadge status={status} label={labels[status as keyof typeof labels]} /></div><DocumentTotals items={items} currency={currency}/><div className="editor-summary__meta"><div><span>Positionen</span><strong>{items.length}</strong></div><div><span>Währung</span><strong>{currency}</strong></div><div><span>{props.kind === 'quote' ? 'Gültig bis' : 'Fällig am'}</span><strong>{endDate ? formatDate(endDate) : '–'}</strong></div></div><div className="editor-summary__trust"><ShieldCheck size={17}/><span>Alle Werte werden lokal und ohne Zwischenrundung berechnet.</span></div><Button icon={Save} onClick={() => save(true)} disabled={saving}>{saving ? 'Wird gespeichert …' : `Gesamt ${new Intl.NumberFormat(currency === 'CHF' ? 'de-CH' : undefined, { style: 'currency', currency }).format(summary.total)} speichern`}</Button></aside></div>
    <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Ungespeicherte Änderungen verwerfen?" description="Ihre Eingaben wurden noch nicht gespeichert." size="small" footer={<><Button variant="secondary" onClick={() => setLeaveOpen(false)}>Weiter bearbeiten</Button><Button variant="danger" onClick={props.onCancel}>Änderungen verwerfen</Button></>}><p className="dialog-copy">Wenn Sie den Editor jetzt verlassen, gehen alle Änderungen seit dem letzten Speichern verloren.</p></Modal>
  </div>;
}
