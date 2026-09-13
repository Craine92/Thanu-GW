import { Banknote, Clock3, Download, ReceiptText, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/money';

export function ReportsPage() {
  const { data, notify } = useApp();
  if (!data) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currency = data.settings.currency;
  const monthKeys = Array.from({ length: 6 }, (_, index) => new Date(currentYear, now.getMonth() - (5 - index), 1));
  const monthly = monthKeys.map((date) => ({
    month: new Intl.DateTimeFormat('de-CH', { month: 'short' }).format(date).replace('.', ''),
    fakturiert: data.invoices.filter((invoice) => invoice.currency === currency && invoice.issueDate.startsWith(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)).reduce((sum, invoice) => sum + invoice.total, 0),
    bezahlt: data.invoices.filter((invoice) => invoice.currency === currency && invoice.issueDate.startsWith(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`) && invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.total, 0),
  }));
  const yearInvoices = data.invoices.filter((invoice) => invoice.currency === currency && invoice.issueDate.startsWith(String(currentYear)));
  const total = yearInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const paid = yearInvoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.total, 0);
  const hours = data.timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const billable = data.timeEntries.filter((entry) => entry.billable).reduce((sum, entry) => sum + entry.hours, 0);

  function exportReport() {
    const csv = ['Monat;Fakturiert;Bezahlt', ...monthly.map((row) => `${row.month};${row.fakturiert.toFixed(2)};${row.bezahlt.toFixed(2)}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `betriebsbericht-${currentYear}.csv`; link.click(); URL.revokeObjectURL(url);
    notify('Bericht wurde als CSV exportiert.');
  }

  return <div className="page"><PageHeader eyebrow="Auswertungen" title="Berichte" description="Die wichtigsten Kennzahlen für fundierte betriebliche Entscheidungen." actions={<Button icon={Download} onClick={exportReport}>Bericht exportieren</Button>} />
    <section className="report-kpis"><article><span><Banknote size={19}/></span><div><small>Fakturierter Umsatz</small><strong>{formatCurrency(total, currency)}</strong><p>laufendes Geschäftsjahr</p></div></article><article><span><ReceiptText size={19}/></span><div><small>Zahlungseingänge</small><strong>{formatCurrency(paid, currency)}</strong><p>{total ? Math.round((paid / total) * 100) : 0} % der Faktura</p></div></article><article><span><Clock3 size={19}/></span><div><small>Verrechenbare Stunden</small><strong>{billable.toFixed(1).replace('.', ',')} h</strong><p>von {hours.toFixed(1).replace('.', ',')} h gesamt</p></div></article><article><span><TrendingUp size={19}/></span><div><small>Ø Rechnungswert</small><strong>{formatCurrency(yearInvoices.length ? total / yearInvoices.length : 0, currency)}</strong><p>über {yearInvoices.length} Rechnungen</p></div></article></section>
    <section className="panel report-chart"><div className="panel__head"><div><h2>Umsatzanalyse {currentYear}</h2><p>Fakturierte Beträge im Vergleich zu realisierten Zahlungseingängen</p></div><span className="period-chip">Geschäftsjahr {currentYear}</span></div><div className="chart chart--report"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{ top: 12, right: 18, left: 5, bottom: 2 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7ebe9"/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`}/><Tooltip formatter={(value) => formatCurrency(Number(value), currency)} /><Legend/><Bar dataKey="fakturiert" name="Fakturiert" fill="#92aaa5" radius={[4,4,0,0]}/><Bar dataKey="bezahlt" name="Bezahlt" fill="#27766d" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section>
  </div>;
}
