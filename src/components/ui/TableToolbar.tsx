import { Filter, Search } from 'lucide-react';
import type { ReactNode } from 'react';

export function TableToolbar({ query, onQuery, placeholder = 'Liste durchsuchen …', filter, onFilter, filterOptions, trailing }: { query: string; onQuery: (value: string) => void; placeholder?: string; filter?: string; onFilter?: (value: string) => void; filterOptions?: { value: string; label: string }[]; trailing?: ReactNode }) {
  return <div className="table-toolbar"><label className="table-search"><Search size={17} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={placeholder} /></label>{filterOptions && onFilter && <label className="table-filter"><Filter size={16} /><select value={filter} onChange={(event) => onFilter(event.target.value)}><option value="all">Alle Status</option>{filterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}<div className="table-toolbar__trailing">{trailing}</div></div>;
}
