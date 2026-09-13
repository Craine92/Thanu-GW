import { Check, ChevronLeft, ChevronRight, Copy, Eye, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';

export interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  sortValue?: (item: T) => string | number;
  align?: 'left' | 'right';
}

export interface RowAction<T> {
  label: string;
  icon?: LucideIcon;
  tone?: 'default' | 'danger';
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
  onClick: (row: T) => void | Promise<unknown>;
}

export function DataTable<T extends { id: string }>({ columns, rows, pageSize = 8, rowLabel, actions }: { columns: Column<T>[]; rows: T[]; pageSize?: number; rowLabel: (row: T) => string; actions?: RowAction<T>[] }) {
  const [sortKey, setSortKey] = useState('');
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);
  const [actionRow, setActionRow] = useState<string | null>(null);
  const [selected, setSelected] = useState<T | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = column.sortValue?.(a) ?? '';
      const bv = column.sortValue?.(b) ?? '';
      return (av < bv ? -1 : av > bv ? 1 : 0) * (ascending ? 1 : -1);
    });
  }, [rows, columns, sortKey, ascending]);
  const maxPage = Math.max(0, Math.ceil(sorted.length / pageSize) - 1);
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize);

  function sort(column: Column<T>) {
    if (!column.sortValue) return;
    if (sortKey === column.key) setAscending((value) => !value);
    else { setSortKey(column.key); setAscending(true); }
    setPage(0);
  }

  async function copyLabel(row: T) {
    await navigator.clipboard.writeText(rowLabel(row));
    setCopied(row.id);
    window.setTimeout(() => setCopied(null), 1500);
  }

  const defaultActions: RowAction<T>[] = [
    { label: 'Schnellansicht', icon: Eye, onClick: (row) => setSelected(row) },
    { label: 'Bezeichnung kopieren', icon: copied ? Check : Copy, onClick: copyLabel },
  ];

  if (!rows.length) return <EmptyState />;
  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr>{columns.map((column) => <th key={column.key} className={column.align === 'right' ? 'align-right' : ''}><button className={column.sortValue ? 'sortable' : ''} onClick={() => sort(column)}>{column.label}{sortKey === column.key && <span>{ascending ? '↑' : '↓'}</span>}</button></th>)}<th aria-label="Aktionen" /></tr></thead>
          <tbody>{visible.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key} className={column.align === 'right' ? 'align-right' : ''} data-label={column.label}>{column.render(row)}</td>)}<td className="row-action"><button className="icon-button" aria-label={`Aktionen für ${rowLabel(row)}`} title="Weitere Aktionen" onClick={() => setActionRow((current) => current === row.id ? null : row.id)}><MoreHorizontal size={18} /></button>{actionRow === row.id && <div className="row-menu">{(actions ?? defaultActions).filter((action) => !action.hidden?.(row)).map((action) => { const ActionIcon = action.icon; return <button key={action.label} className={action.tone === 'danger' ? 'row-menu__danger' : ''} disabled={action.disabled?.(row)} onClick={() => { void action.onClick(row); setActionRow(null); }}>{ActionIcon && <ActionIcon size={15}/>}<span>{action.label}</span></button>; })}</div>}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="table-footer"><span>{sorted.length} Einträge</span><div><button className="icon-button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} aria-label="Vorherige Seite"><ChevronLeft size={17} /></button><span>Seite {page + 1} von {maxPage + 1}</span><button className="icon-button" disabled={page >= maxPage} onClick={() => setPage((value) => value + 1)} aria-label="Nächste Seite"><ChevronRight size={17} /></button></div></div>
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? rowLabel(selected) : 'Schnellansicht'} description="Zusammenfassung des ausgewählten Datensatzes" size="small" footer={<Button variant="secondary" onClick={() => setSelected(null)}>Schliessen</Button>}>
        {selected && <dl className="record-detail-grid">{columns.map((column) => <div key={column.key}><dt>{column.label}</dt><dd>{column.render(selected)}</dd></div>)}</dl>}
      </Modal>
    </>
  );
}
