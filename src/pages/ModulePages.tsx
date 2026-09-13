import { Plus, TimerReset, TrendingUp, Users, Warehouse } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreateCustomerDialog } from '../components/dialogs/CreateCustomerDialog';
import { CreateTimeEntryDialog } from '../components/dialogs/CreateTimeEntryDialog';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/ui/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableToolbar } from '../components/ui/TableToolbar';
import { useApp } from '../context/AppContext';
import type { Customer, Employee, Invoice, Material, Order, Quote, StandardPosition, StockMovement, TimeEntry } from '../types/models';
import { formatDate } from '../utils/date';
import { formatCurrency } from '../utils/money';
import { invoiceStatusLabels, orderStatusLabels, quoteStatusLabels } from '../utils/status';

function useListFilter<T>(items: T[], searchText: (item: T) => string, statusValue?: (item: T) => string) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const rows = useMemo(() => items.filter((item) => searchText(item).toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')) && (!statusValue || status === 'all' || statusValue(item) === status)), [items, query, status, searchText, statusValue]);
  return { query, setQuery, status, setStatus, rows };
}

function ListPanel<T extends { id: string }>({ rows, columns, rowLabel, query, setQuery, status, setStatus, options, placeholder, trailing }: { rows: T[]; columns: Column<T>[]; rowLabel: (row: T) => string; query: string; setQuery: (value: string) => void; status?: string; setStatus?: (value: string) => void; options?: { value: string; label: string }[]; placeholder?: string; trailing?: React.ReactNode }) {
  return <section className="panel list-panel"><TableToolbar query={query} onQuery={setQuery} filter={status} onFilter={setStatus} filterOptions={options} placeholder={placeholder} trailing={trailing} /><DataTable rows={rows} columns={columns} rowLabel={rowLabel} /></section>;
}

export function CustomersPage() {
  const { data: nullableData } = useApp();
  const data = nullableData!;
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('neu') === '1');
  const close = () => { setOpen(false); params.delete('neu'); setParams(params, { replace: true }); };
  const filter = useListFilter(data.customers, (item) => `${item.number} ${item.name} ${item.email} ${item.address.city}`);
  const columns: Column<Customer>[] = [
    { key: 'number', label: 'Kundennr.', render: (item) => <strong className="record-number">{item.number}</strong>, sortValue: (item) => item.number },
    { key: 'name', label: 'Kunde', render: (item) => <div className="primary-cell"><span className="customer-avatar">{item.name.split(' ').slice(0, 2).map((word) => word[0]).join('')}</span><div><strong>{item.name}</strong><small>{item.contactPerson ?? (item.type === 'private' ? 'Privatkunde' : 'Geschäftskunde')}</small></div></div>, sortValue: (item) => item.name },
    { key: 'location', label: 'Ort', render: (item) => <>{item.address.postalCode} {item.address.city}</>, sortValue: (item) => item.address.city },
    { key: 'contact', label: 'Kontakt', render: (item) => <div className="stacked-cell"><span>{item.email}</span><small>{item.phone}</small></div> },
    { key: 'since', label: 'Kunde seit', render: (item) => formatDate(item.createdAt), sortValue: (item) => item.createdAt },
  ];
  return <div className="page"><PageHeader eyebrow="Stammdaten" title="Kunden" description="Verwalten Sie Kontakte, Objekte und Kundenbeziehungen an einem Ort." actions={<Button icon={Plus} onClick={() => setOpen(true)}>Neuer Kunde</Button>} /><div className="summary-strip"><div><Users size={18}/><span><strong>{data.customers.length}</strong> Kunden gesamt</span></div><div><span className="status-dot"/><span><strong>{data.customers.filter((item) => item.type === 'company').length}</strong> Geschäftskunden</span></div><div><span className="status-dot status-dot--blue"/><span><strong>{data.customers.filter((item) => item.type === 'private').length}</strong> Privatkunden</span></div></div><ListPanel {...filter} columns={columns} rowLabel={(row) => row.name} placeholder="Name, Nummer, Ort oder E-Mail …" /><CreateCustomerDialog open={open} onClose={close}/></div>;
}

export function EmployeesPage() {
  const { data: nullableData } = useApp(); const data = nullableData!;
  const filter = useListFilter(data.employees, (item) => `${item.name} ${item.role} ${item.email}`);
  const columns: Column<Employee>[] = [
    { key: 'name', label: 'Mitarbeiter', render: (item) => <div className="primary-cell"><span className="employee-avatar" style={{ backgroundColor: item.color }}>{item.initials}</span><div><strong>{item.name}</strong><small>{item.employeeNumber}</small></div></div>, sortValue: (item) => item.name },
    { key: 'role', label: 'Funktion', render: (item) => item.role, sortValue: (item) => item.role },
    { key: 'email', label: 'E-Mail', render: (item) => item.email }, { key: 'phone', label: 'Telefon', render: (item) => item.phone },
    { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.active ? 'accepted' : 'cancelled'} label={item.active ? 'Aktiv' : 'Inaktiv'} /> },
  ];
  return <div className="page"><PageHeader eyebrow="Stammdaten" title="Mitarbeiter" description="Team, Funktionen und Kontaktdaten im Überblick." /><ListPanel {...filter} columns={columns} rowLabel={(row) => row.name} placeholder="Mitarbeiter durchsuchen …" /></div>;
}

export function MaterialsPage() {
  const { data: nullableData } = useApp(); const data = nullableData!;
  const filter = useListFilter(data.materials, (item) => `${item.sku} ${item.name} ${item.category}`);
  const columns: Column<Material>[] = [
    { key: 'sku', label: 'Artikelnummer', render: (item) => <strong className="record-number">{item.sku}</strong>, sortValue: (item) => item.sku },
    { key: 'name', label: 'Material', render: (item) => <div className="stacked-cell"><strong>{item.name}</strong><small>{item.category}</small></div>, sortValue: (item) => item.name },
    { key: 'location', label: 'Lagerplatz', render: (item) => item.location },
    { key: 'stock', label: 'Bestand', render: (item) => <span className={item.stock <= item.minStock ? 'stock-low' : ''}>{item.stock} {item.unit}</span>, sortValue: (item) => item.stock },
    { key: 'price', label: 'Verkaufspreis', render: (item) => formatCurrency(item.salePrice, data.settings.currency), sortValue: (item) => item.salePrice, align: 'right' },
  ];
  return <div className="page"><PageHeader eyebrow="Stammdaten" title="Materialien" description="Artikelstamm, Verkaufspreise und Bestände zentral verwalten." /><ListPanel {...filter} columns={columns} rowLabel={(row) => row.name} placeholder="Artikelnummer, Material oder Kategorie …" /></div>;
}

export function StandardPositionsPage() {
  const { data: nullableData } = useApp(); const data = nullableData!;
  const filter = useListFilter(data.standardPositions, (item) => `${item.code} ${item.title} ${item.category}`);
  const columns: Column<StandardPosition>[] = [
    { key: 'code', label: 'Code', render: (item) => <strong className="record-number">{item.code}</strong>, sortValue: (item) => item.code },
    { key: 'title', label: 'Leistung', render: (item) => <div className="stacked-cell"><strong>{item.title}</strong><small>{item.description}</small></div>, sortValue: (item) => item.title },
    { key: 'category', label: 'Kategorie', render: (item) => item.category }, { key: 'unit', label: 'Einheit', render: (item) => item.unit },
    { key: 'price', label: 'Preis', render: (item) => formatCurrency(item.unitPrice, data.settings.currency), align: 'right', sortValue: (item) => item.unitPrice },
  ];
  return <div className="page"><PageHeader eyebrow="Stammdaten" title="Standardpositionen" description="Wiederkehrende Leistungen für schnelle und konsistente Belege." /><ListPanel {...filter} columns={columns} rowLabel={(row) => row.title} placeholder="Leistung, Code oder Kategorie …" /></div>;
}

export function QuotesPage() {
  const { data: nullableData } = useApp(); const data = nullableData!;
  const customer = (id: string) => data.customers.find((item) => item.id === id)?.name ?? '–';
  const filter = useListFilter(data.quotes, (item) => `${item.number} ${item.title} ${customer(item.customerId)}`, (item) => item.status);
  const columns: Column<Quote>[] = [
    { key: 'number', label: 'Nummer', render: (item) => <strong className="record-number">{item.number}</strong>, sortValue: (item) => item.number },
    { key: 'customer', label: 'Kunde', render: (item) => customer(item.customerId), sortValue: (item) => customer(item.customerId) },
    { key: 'title', label: 'Bezeichnung', render: (item) => item.title }, { key: 'date', label: 'Datum', render: (item) => formatDate(item.issueDate), sortValue: (item) => item.issueDate },
    { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} label={quoteStatusLabels[item.status]} /> },
    { key: 'total', label: 'Betrag', render: (item) => formatCurrency(item.total, data.settings.currency), align: 'right', sortValue: (item) => item.total },
  ];
  return <div className="page"><PageHeader eyebrow="Verkauf" title="Kostenvoranschläge" description="Offerten erstellen, nachverfolgen und in Aufträge überführen." /><ListPanel {...filter} columns={columns} rowLabel={(row) => row.number} placeholder="Nummer, Kunde oder Bezeichnung …" options={Object.entries(quoteStatusLabels).map(([value, label]) => ({ value, label }))} /></div>;
}

export function OrdersPage() {
  const { data: nullableData } = useApp(); const data = nullableData!;
  const customer = (id: string) => data.customers.find((item) => item.id === id)?.name ?? '–';
  const employee = (id: string) => data.employees.find((item) => item.id === id)?.name ?? '–';
  const filter = useListFilter(data.orders, (item) => `${item.number} ${item.title} ${customer(item.customerId)} ${employee(item.employeeId)}`, (item) => item.status);
  const columns: Column<Order>[] = [
    { key: 'number', label: 'Nummer', render: (item) => <strong className="record-number">{item.number}</strong>, sortValue: (item) => item.number },
    { key: 'customer', label: 'Kunde', render: (item) => customer(item.customerId), sortValue: (item) => customer(item.customerId) },
    { key: 'title', label: 'Tätigkeit', render: (item) => item.title }, { key: 'employee', label: 'Zuständig', render: (item) => employee(item.employeeId) },
    { key: 'date', label: 'Termin', render: (item) => formatDate(item.scheduledAt, true), sortValue: (item) => item.scheduledAt },
    { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} label={orderStatusLabels[item.status]} /> },
  ];
  return <div className="page"><PageHeader eyebrow="Verkauf" title="Aufträge" description="Einsätze planen, Mitarbeitende koordinieren und Fortschritt verfolgen." /><ListPanel {...filter} columns={columns} rowLabel={(row) => row.number} placeholder="Nummer, Kunde, Tätigkeit oder Mitarbeiter …" options={Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label }))} /></div>;
}

export function InvoicesPage() {
  const { data: nullableData } = useApp(); const data = nullableData!;
  const customer = (id: string) => data.customers.find((item) => item.id === id)?.name ?? '–';
  const filter = useListFilter(data.invoices, (item) => `${item.number} ${item.title} ${customer(item.customerId)}`, (item) => item.status);
  const columns: Column<Invoice>[] = [
    { key: 'number', label: 'Nummer', render: (item) => <strong className="record-number">{item.number}</strong>, sortValue: (item) => item.number },
    { key: 'customer', label: 'Kunde', render: (item) => customer(item.customerId), sortValue: (item) => customer(item.customerId) },
    { key: 'date', label: 'Rechnungsdatum', render: (item) => formatDate(item.issueDate), sortValue: (item) => item.issueDate },
    { key: 'due', label: 'Fällig', render: (item) => <span className={item.status === 'overdue' ? 'text-danger' : ''}>{formatDate(item.dueDate)}</span>, sortValue: (item) => item.dueDate },
    { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} label={invoiceStatusLabels[item.status]} /> },
    { key: 'total', label: 'Betrag', render: (item) => formatCurrency(item.total, data.settings.currency), align: 'right', sortValue: (item) => item.total },
  ];
  return <div className="page"><PageHeader eyebrow="Verkauf" title="Rechnungen" description="Rechnungsstatus und offene Zahlungen zuverlässig im Blick behalten." /><ListPanel {...filter} columns={columns} rowLabel={(row) => row.number} placeholder="Nummer, Kunde oder Bezeichnung …" options={Object.entries(invoiceStatusLabels).map(([value, label]) => ({ value, label }))} /></div>;
}

export function TimeTrackingPage() {
  const { data: nullableData } = useApp(); const data = nullableData!; const [params, setParams] = useSearchParams(); const [open, setOpen] = useState(params.get('neu') === '1');
  const employee = (id: string) => data.employees.find((item) => item.id === id)?.name ?? '–'; const order = (id: string) => data.orders.find((item) => item.id === id)?.number ?? '–';
  const filter = useListFilter(data.timeEntries, (item) => `${employee(item.employeeId)} ${order(item.orderId)} ${item.description} ${item.date}`);
  const columns: Column<TimeEntry>[] = [
    { key: 'date', label: 'Datum', render: (item) => formatDate(item.date), sortValue: (item) => item.date },
    { key: 'employee', label: 'Mitarbeiter', render: (item) => employee(item.employeeId), sortValue: (item) => employee(item.employeeId) },
    { key: 'order', label: 'Auftrag', render: (item) => <strong className="record-number">{order(item.orderId)}</strong> },
    { key: 'description', label: 'Tätigkeit', render: (item) => item.description }, { key: 'billable', label: 'Abrechnung', render: (item) => <StatusBadge status={item.billable ? 'accepted' : 'draft'} label={item.billable ? 'Verrechenbar' : 'Intern'} /> },
    { key: 'hours', label: 'Stunden', render: (item) => <strong>{item.hours.toFixed(2).replace('.', ',')} h</strong>, align: 'right', sortValue: (item) => item.hours },
  ];
  const close = () => { setOpen(false); params.delete('neu'); setParams(params, { replace: true }); };
  return <div className="page"><PageHeader eyebrow="Betrieb" title="Zeiterfassung" description="Arbeitszeiten auftragsbezogen und abrechenbar dokumentieren." actions={<Button icon={TimerReset} onClick={() => setOpen(true)}>Zeit erfassen</Button>} /><div className="summary-strip"><div><TimerReset size={18}/><span><strong>{data.timeEntries.reduce((sum, item) => sum + item.hours, 0).toFixed(1).replace('.', ',')} h</strong> gesamt erfasst</span></div><div><TrendingUp size={18}/><span><strong>{data.timeEntries.filter((item) => item.billable).length}</strong> verrechenbare Einträge</span></div></div><ListPanel {...filter} columns={columns} rowLabel={(row) => row.description} placeholder="Mitarbeiter, Auftrag oder Tätigkeit …" /><CreateTimeEntryDialog open={open} onClose={close}/></div>;
}

export function StockPage() {
  const { data: nullableData } = useApp(); const data = nullableData!; const material = (id: string) => data.materials.find((item) => item.id === id);
  const filter = useListFilter(data.stockMovements, (item) => `${material(item.materialId)?.name} ${item.note} ${item.date}`);
  const columns: Column<StockMovement>[] = [
    { key: 'date', label: 'Datum', render: (item) => formatDate(item.date, true), sortValue: (item) => item.date },
    { key: 'material', label: 'Material', render: (item) => <div className="stacked-cell"><strong>{material(item.materialId)?.name}</strong><small>{material(item.materialId)?.sku}</small></div> },
    { key: 'type', label: 'Bewegung', render: (item) => <StatusBadge status={item.type === 'in' ? 'accepted' : 'sent'} label={item.type === 'in' ? 'Wareneingang' : item.type === 'out' ? 'Entnahme' : 'Korrektur'} /> },
    { key: 'note', label: 'Grund', render: (item) => item.note }, { key: 'order', label: 'Auftrag', render: (item) => item.orderId ? data.orders.find((order) => order.id === item.orderId)?.number : '–' },
    { key: 'quantity', label: 'Menge', render: (item) => <strong className={item.quantity < 0 ? 'text-danger' : 'text-success'}>{item.quantity > 0 ? '+' : ''}{item.quantity} {material(item.materialId)?.unit}</strong>, align: 'right', sortValue: (item) => item.quantity },
  ];
  const low = data.materials.filter((item) => item.stock <= item.minStock).length;
  return <div className="page"><PageHeader eyebrow="Betrieb" title="Lager" description="Bestände, Entnahmen und Wareneingänge lückenlos nachvollziehen." /><div className="summary-strip"><div><Warehouse size={18}/><span><strong>{data.materials.length}</strong> gelagerte Artikel</span></div><div><span className="status-dot status-dot--amber"/><span><strong>{low}</strong> unter Mindestbestand</span></div></div><ListPanel {...filter} columns={columns} rowLabel={(row) => row.note} placeholder="Material oder Buchungsgrund …" /></div>;
}
