import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CompanySettings, Customer, Invoice, Quote } from '../../types/models';
import { formatDate } from '../../utils/date';
import { calculateMoneySummary } from '../../utils/money';

type PdfDocument = Quote | Invoice;
type DocumentKind = 'quote' | 'invoice';

const accent: [number, number, number] = [33, 100, 92];
const ink: [number, number, number] = [32, 44, 40];
const muted: [number, number, number] = [94, 108, 103];

function money(amount: number, currency: PdfDocument['currency']): string {
  return new Intl.NumberFormat(currency === 'CHF' ? 'de-CH' : currency === 'EUR' ? 'de-DE' : currency === 'GBP' ? 'en-GB' : 'en-US', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

function safeFilename(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function drawCompanyHeader(pdf: jsPDF, settings: CompanySettings) {
  if (settings.logo) {
    try {
      const properties = pdf.getImageProperties(settings.logo);
      const ratio = properties.width / properties.height;
      let width = 36; let height = width / ratio;
      if (height > 20) { height = 20; width = height * ratio; }
      pdf.addImage(settings.logo, settings.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG', 16, 15, width, height);
    } catch (error) {
      console.error('Logo konnte nicht in das PDF eingefügt werden.', error);
    }
  } else {
    pdf.setTextColor(...accent); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
    pdf.text(settings.companyName, 16, 24);
  }
  const lines = [settings.companyName, settings.industry, settings.address.street, `${settings.address.postalCode} ${settings.address.city}`, settings.phone, settings.email, settings.website, settings.vatId].filter(Boolean);
  pdf.setFontSize(8); pdf.setTextColor(...muted);
  lines.forEach((line, index) => { pdf.setFont('helvetica', index === 0 ? 'bold' : 'normal'); pdf.text(line, 194, 16 + index * 3.7, { align: 'right' }); });
  pdf.setDrawColor(...accent); pdf.setLineWidth(.7); pdf.line(16, 47, 194, 47);
}

function drawFooter(pdf: jsPDF, settings: CompanySettings) {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page); pdf.setDrawColor(210, 219, 216); pdf.setLineWidth(.25); pdf.line(16, 280, 194, 280);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(...muted);
    pdf.text(`${settings.companyName} · ${settings.address.street} · ${settings.address.postalCode} ${settings.address.city}`, 16, 285);
    pdf.text(`${settings.phone} · ${settings.email} · ${settings.website} · ${settings.vatId}`, 16, 289);
    pdf.text(`Seite ${page} / ${pageCount}`, 194, 287, { align: 'right' });
  }
}

function buildPdf(kind: DocumentKind, document: PdfDocument, customer: Customer | undefined, settings: CompanySettings, referenceNumber?: string): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  drawCompanyHeader(pdf, settings);
  const recipient = document.customerSnapshot;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...ink); pdf.text(recipient.name, 16, 57);
  const recipientLines = [recipient.contactPerson ? `z. Hd. ${recipient.contactPerson}` : '', recipient.address.street, `${recipient.address.postalCode} ${recipient.address.city}`, recipient.address.country].filter(Boolean);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); recipientLines.forEach((line, index) => pdf.text(line, 16, 62 + index * 4));

  const isInvoice = kind === 'invoice';
  const metadata = [
    ['Kundennummer', recipient.number || customer?.number || '–'],
    [isInvoice ? 'Rechnungsnummer' : 'Kostenvoranschlag', document.number],
    [isInvoice ? 'Rechnungsdatum' : 'Datum', formatDate(document.issueDate)],
    [isInvoice ? 'Fällig am' : 'Gültig bis', formatDate(isInvoice ? (document as Invoice).dueDate : (document as Quote).validUntil)],
  ];
  if (referenceNumber) metadata.push(['Referenz', referenceNumber]);
  metadata.forEach(([label, value], index) => {
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...muted); pdf.text(label, 128, 57 + index * 5);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ink); pdf.text(value, 194, 57 + index * 5, { align: 'right' });
  });

  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...accent); pdf.setFontSize(18);
  pdf.text(isInvoice ? 'RECHNUNG' : 'KOSTENVORANSCHLAG', 16, 92);
  pdf.setFontSize(9); pdf.setTextColor(...muted); pdf.text(document.number, 16, 98);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(...ink); pdf.text(document.title, 16, 106);
  let tableY = 114;
  if (document.introduction) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...muted);
    const introLines = pdf.splitTextToSize(document.introduction, 178) as string[];
    pdf.text(introLines, 16, tableY); tableY += introLines.length * 4 + 4;
  }

  autoTable(pdf, {
    startY: tableY,
    margin: { left: 16, right: 16, bottom: 24 },
    head: [['Pos.', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Rabatt', 'MwSt.', 'Gesamt']],
    body: document.items.map((item, index) => [
      String(index + 1), item.description, String(item.quantity).replace('.', ','), item.unit,
      money(item.unitPrice, document.currency), item.discount ? `${item.discount.toFixed(1).replace('.', ',')} %` : '–',
      `${item.taxRate.toFixed(1).replace('.', ',')} %`, money(item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.taxRate / 100), document.currency),
    ]),
    theme: 'plain',
    headStyles: { fillColor: accent, textColor: 255, fontStyle: 'bold', fontSize: 7.2, cellPadding: 2.4 },
    bodyStyles: { textColor: ink, fontSize: 7.2, cellPadding: 2.3, lineColor: [225, 231, 228], lineWidth: { bottom: .15 }, valign: 'top', overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    columnStyles: {
      0: { cellWidth: 10 }, 1: { cellWidth: 57 }, 2: { cellWidth: 14, halign: 'right' }, 3: { cellWidth: 15 },
      4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 15, halign: 'right' }, 6: { cellWidth: 14, halign: 'right' }, 7: { cellWidth: 28, halign: 'right' },
    },
    showHead: 'everyPage',
  });

  const summary = calculateMoneySummary(document.items);
  const lastTableY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? tableY;
  let summaryY = lastTableY + 8;
  const requiredHeight = 30 + summary.taxes.length * 5 + (document.closingText || document.notes ? 25 : 0);
  if (summaryY + requiredHeight > 274) { pdf.addPage(); summaryY = 22; }
  const summaryRows: [string, string][] = [
    ['Zwischensumme', money(summary.subtotal, document.currency)],
    ['Rabatte', summary.discount ? `– ${money(summary.discount, document.currency)}` : money(0, document.currency)],
    ['Nettosumme', money(summary.net, document.currency)],
    ...summary.taxes.map((tax) => [`MwSt. ${tax.rate.toFixed(1).replace('.', ',')} %`, money(tax.amount, document.currency)] as [string, string]),
  ];
  summaryRows.forEach(([label, value], index) => {
    pdf.setFont('helvetica', index === 2 ? 'bold' : 'normal'); pdf.setFontSize(8); pdf.setTextColor(...muted);
    pdf.text(label, 132, summaryY + index * 5); pdf.setTextColor(...ink); pdf.text(value, 194, summaryY + index * 5, { align: 'right' });
  });
  const totalY = summaryY + summaryRows.length * 5 + 1;
  pdf.setFillColor(237, 246, 244); pdf.roundedRect(128, totalY - 4, 66, 9, 1, 1, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...accent); pdf.text('GESAMTSUMME', 132, totalY + 1.5); pdf.text(money(summary.total, document.currency), 191, totalY + 1.5, { align: 'right' });
  let textY = totalY + 14;
  if (document.closingText) { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...muted); const lines = pdf.splitTextToSize(document.closingText, 178) as string[]; pdf.text(lines, 16, textY); textY += lines.length * 4 + 4; }
  if (document.notes) { pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.text(pdf.splitTextToSize(`Hinweis: ${document.notes}`, 178) as string[], 16, textY); }
  drawFooter(pdf, settings);
  return pdf;
}

export const documentPdfService = {
  download(kind: DocumentKind, document: PdfDocument, customer: Customer | undefined, settings: CompanySettings, referenceNumber?: string) {
    const pdf = buildPdf(kind, document, customer, settings, referenceNumber);
    const prefix = kind === 'invoice' ? 'Rechnung' : 'Kostenvoranschlag';
    pdf.save(`${prefix}_${safeFilename(document.number)}_${safeFilename(document.customerSnapshot.name)}.pdf`);
  },
  preview(kind: DocumentKind, document: PdfDocument, customer: Customer | undefined, settings: CompanySettings, referenceNumber?: string) {
    const pdf = buildPdf(kind, document, customer, settings, referenceNumber);
    const url = URL.createObjectURL(pdf.output('blob'));
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
  createBlob(kind: DocumentKind, document: PdfDocument, customer: Customer | undefined, settings: CompanySettings, referenceNumber?: string): Blob {
    return buildPdf(kind, document, customer, settings, referenceNumber).output('blob');
  },
};
