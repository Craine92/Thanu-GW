import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Banknote, Clock3, FileCheck2, Plus, ReceiptText,
  Users, Wrench,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { InvoiceStatus, OrderStatus } from '../types/models';
import { formatDate, relativeTime } from '../utils/date';
import { formatCurrency } from '../utils/money';
import { invoiceStatusLabels, orderStatusLabels } from '../utils/status';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const chartColors = ['#27766d', '#4f83a8', '#d29a50', '#63a37e', '#c75b65', '#8b98a0'];

function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }

export function DashboardPage() {
  const { data } = useApp();
  const navigate = useNavigate();
  if (!data) return null;
  const { invoices, quotes, orders, timeEntries, customers, employees, settings } = data;
  const currency = settings.currency;
  const now = new Date();
  const currentMonth = monthKey(now);
  const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const paidRevenue = (month: string) => invoices.filter((invoice) => invoice.currency === currency && invoice.issueDate.startsWith(month) && invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.total, 0);
  const revenue = paidRevenue(currentMonth);
  const previousRevenue = paidRevenue(previousMonth);
  const delta = previousRevenue ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0;
  const outstanding = invoices.filter((invoice) => ['sent', 'partial', 'overdue'].includes(invoice.status));
  const overdue = invoices.filter((invoice) => invoice.status === 'overdue');
  const openQuotes = quotes.filter((quote) => ['draft', 'sent'].includes(quote.status));
  const activeOrders = orders.filter((order) => ['planned', 'in_progress', 'waiting'].includes(order.status));
  const hours = timeEntries.filter((entry) => entry.date.startsWith(currentMonth)).reduce((sum, entry) => sum + entry.hours, 0);

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = monthKey(date);
    return { month: new Intl.DateTimeFormat('de-CH', { month: 'short' }).format(date).replace('.', ''), umsatz: paidRevenue(key), offen: invoices.filter((invoice) => invoice.currency === currency && invoice.issueDate.startsWith(key) && ['sent', 'partial', 'overdue'].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.total - invoice.paidAmount, 0) };
  });
  const invoiceStatuses = (Object.keys(invoiceStatusLabels) as InvoiceStatus[]).filter((status) => status !== 'cancelled').map((status) => ({ name: invoiceStatusLabels[status], value: invoices.filter((item) => item.status === status).length }));
  const orderStatuses = (['planned', 'in_progress', 'waiting', 'completed'] as OrderStatus[]).map((status) => ({ name: orderStatusLabels[status], value: orders.filter((item) => item.status === status).length }));
  const customerName = (id: string) => customers.find((item) => item.id === id)?.name ?? 'Unbekannter Kunde';
  const employeeName = (id: string) => employees.find((item) => item.id === id)?.name ?? 'Nicht zugewiesen';

  const kpis = [
    { label: 'Umsatz aktueller Monat', value: formatCurrency(revenue, currency), detail: `${Math.abs(delta).toFixed(1).replace('.', ',')} % zum Vormonat`, icon: Banknote, trend: delta >= 0 ? 'up' : 'down' },
    { label: 'Offene Rechnungen', value: formatCurrency(outstanding.filter((invoice) => invoice.currency === currency).reduce((sum, invoice) => sum + invoice.total - invoice.paidAmount, 0), currency), detail: `${outstanding.length} Rechnungen ausstehend`, icon: ReceiptText },
    { label: 'Überfällige Rechnungen', value: String(overdue.length), detail: formatCurrency(overdue.filter((invoice) => invoice.currency === currency).reduce((sum, invoice) => sum + invoice.total, 0), currency), icon: ReceiptText, alert: true },
    { label: 'Offene Kostenvoranschläge', value: String(openQuotes.length), detail: formatCurrency(openQuotes.filter((quote) => quote.currency === currency).reduce((sum, quote) => sum + quote.total, 0), currency), icon: FileCheck2 },
    { label: 'Aktive Aufträge', value: String(activeOrders.length), detail: `${activeOrders.filter((item) => item.status === 'in_progress').length} aktuell in Arbeit`, icon: Wrench },
    { label: 'Geleistete Stunden', value: `${hours.toFixed(1).replace('.', ',')} h`, detail: 'im aktuellen Monat', icon: Clock3 },
  ];

  const actions = [
    { label: 'Neuer Kunde', icon: Users, path: '/kunden?neu=1' },
    { label: 'Neuer Kostenvoranschlag', icon: FileCheck2, path: '/kostenvoranschlaege/neu' },
    { label: 'Neuer Auftrag', icon: Wrench, path: '/auftraege?neu=1' },
    { label: 'Neue Rechnung', icon: ReceiptText, path: '/rechnungen/neu' },
    { label: 'Zeit erfassen', icon: Clock3, path: '/zeiterfassung?neu=1' },
  ];

  return (
    <div className="page dashboard-page">
      <PageHeader eyebrow={new Intl.DateTimeFormat('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(now)} title="Guten Morgen, Sarah" description="Hier sehen Sie, was heute in Ihrem Betrieb wichtig ist." actions={<Button icon={Plus} onClick={() => navigate('/auftraege?neu=1')}>Neuer Vorgang</Button>} />
      <section className="quick-actions" aria-label="Schnellaktionen">{actions.map((action) => <button key={action.label} onClick={() => navigate(action.path)}><span><action.icon size={17} /></span>{action.label}</button>)}</section>
      <section className="kpi-grid">{kpis.map((kpi) => <article className={`kpi-card ${kpi.alert ? 'kpi-card--alert' : ''}`} key={kpi.label}><div className="kpi-card__head"><span>{kpi.label}</span><span className="kpi-card__icon"><kpi.icon size={18} /></span></div><strong>{kpi.value}</strong><small>{kpi.trend === 'up' ? <ArrowUpRight size={14} /> : kpi.trend === 'down' ? <ArrowDownRight size={14} /> : null}{kpi.detail}</small></article>)}</section>
      <section className="dashboard-grid dashboard-grid--charts">
        <article className="panel panel--wide"><div className="panel__head"><div><h2>Umsatzentwicklung</h2><p>Bezahlte und offene Rechnungsbeträge der letzten 6 Monate</p></div><span className="period-chip">Letzte 6 Monate</span></div><div className="chart chart--revenue"><ResponsiveContainer width="100%" height="100%"><AreaChart data={months} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#27766d" stopOpacity={0.22}/><stop offset="95%" stopColor="#27766d" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7ebe9"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6a7773', fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#6a7773', fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`}/><Tooltip formatter={(value) => formatCurrency(Number(value), currency)} contentStyle={{ borderRadius: 8, border: '1px solid #dce3e0', boxShadow: '0 10px 30px rgba(17, 45, 40, .1)' }}/><Area type="monotone" dataKey="umsatz" name="Bezahlt" stroke="#27766d" strokeWidth={2.5} fill="url(#revenueFill)"/><Area type="monotone" dataKey="offen" name="Offen" stroke="#d29a50" strokeWidth={2} fill="transparent" strokeDasharray="5 4"/></AreaChart></ResponsiveContainer></div></article>
        <article className="panel"><div className="panel__head"><div><h2>Rechnungsstatus</h2><p>{invoices.length} Rechnungen gesamt</p></div></div><div className="donut-layout"><div className="chart chart--donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={invoiceStatuses} dataKey="value" innerRadius={48} outerRadius={73} paddingAngle={3} stroke="none">{invoiceStatuses.map((entry, index) => <Cell key={entry.name} fill={chartColors[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{invoices.length}</strong><span>Belege</span></div></div><div className="chart-legend">{invoiceStatuses.map((item, index) => <div key={item.name}><span style={{ backgroundColor: chartColors[index] }} /><small>{item.name}</small><strong>{item.value}</strong></div>)}</div></div></article>
        <article className="panel"><div className="panel__head"><div><h2>Auftragsstatus</h2><p>Aktueller Ausführungsstand</p></div></div><div className="chart chart--orders"><ResponsiveContainer width="100%" height="100%"><BarChart data={orderStatuses} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}><CartesianGrid horizontal={false} stroke="#e7ebe9"/><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" width={92} axisLine={false} tickLine={false} tick={{ fill: '#56635f', fontSize: 11 }}/><Tooltip cursor={{ fill: '#f5f7f6' }}/><Bar dataKey="value" name="Aufträge" fill="#397e75" radius={[0, 4, 4, 0]} barSize={18}/></BarChart></ResponsiveContainer></div></article>
      </section>
      <section className="dashboard-grid dashboard-grid--tables">
        <article className="panel panel--wide"><div className="panel__head"><div><h2>Offene Rechnungen</h2><p>Priorisiert nach Fälligkeit</p></div><button className="text-link" onClick={() => navigate('/rechnungen')}>Alle Rechnungen <ArrowRight size={15} /></button></div><div className="compact-table-wrap"><table className="compact-table"><thead><tr><th>Nummer</th><th>Kunde</th><th>Fällig</th><th>Status</th><th className="align-right">Betrag</th></tr></thead><tbody>{outstanding.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5).map((invoice) => <tr key={invoice.id}><td><strong>{invoice.number}</strong></td><td>{customerName(invoice.customerId)}</td><td className={invoice.status === 'overdue' ? 'text-danger' : ''}>{formatDate(invoice.dueDate)}</td><td><StatusBadge status={invoice.status} label={invoiceStatusLabels[invoice.status]} /></td><td className="align-right money">{formatCurrency(invoice.total - invoice.paidAmount, invoice.currency)}</td></tr>)}</tbody></table></div></article>
        <article className="panel"><div className="panel__head"><div><h2>Letzte Aktivitäten</h2><p>Heute im Betrieb</p></div></div><div className="activity-list">{data.activities.slice(0, 6).map((activity) => <div className="activity" key={activity.id}><span className={`activity__icon activity__icon--${activity.type}`}>{activity.type === 'time' ? <Clock3 size={15}/> : activity.type === 'invoice' ? <ReceiptText size={15}/> : activity.type === 'order' ? <Wrench size={15}/> : activity.type === 'customer' ? <Users size={15}/> : <FileCheck2 size={15}/>}</span><div><p>{activity.text}</p><span>{relativeTime(activity.date)}</span></div></div>)}</div></article>
        <article className="panel panel--full"><div className="panel__head"><div><h2>Aktuelle Aufträge</h2><p>Geplante und laufende Einsätze</p></div><button className="text-link" onClick={() => navigate('/auftraege')}>Alle Aufträge <ArrowRight size={15} /></button></div><div className="compact-table-wrap"><table className="compact-table"><thead><tr><th>Auftrag</th><th>Kunde</th><th>Tätigkeit</th><th>Mitarbeiter</th><th>Termin</th><th>Status</th></tr></thead><tbody>{activeOrders.slice(0, 6).map((order) => <tr key={order.id}><td><strong>{order.number}</strong></td><td>{customerName(order.customerId)}</td><td>{order.title}</td><td>{employeeName(order.employeeId)}</td><td>{formatDate(order.scheduledAt, true)}</td><td><StatusBadge status={order.status} label={orderStatusLabels[order.status]} /></td></tr>)}</tbody></table></div></article>
      </section>
    </div>
  );
}
