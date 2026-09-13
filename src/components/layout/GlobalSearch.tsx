import { FileText, Search, UserRound, Users, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

interface SearchResult { id: string; title: string; subtitle: string; path: string; icon: typeof Search }

export function GlobalSearch() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ref.current?.querySelector('input')?.focus();
        setOpen(true);
      }
    };
    const clickHandler = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener('keydown', keyHandler);
    document.addEventListener('mousedown', clickHandler);
    return () => { document.removeEventListener('keydown', keyHandler); document.removeEventListener('mousedown', clickHandler); };
  }, []);

  const results = useMemo(() => {
    if (!data || query.trim().length < 2) return [];
    const needle = query.toLocaleLowerCase('de');
    const all: SearchResult[] = [
      ...data.customers.map((item) => ({ id: item.id, title: item.name, subtitle: `Kunde · ${item.number}`, path: `/kunden?highlight=${item.id}`, icon: Users })),
      ...data.employees.map((item) => ({ id: item.id, title: item.name, subtitle: `Mitarbeiter · ${item.role}`, path: `/mitarbeiter?highlight=${item.id}`, icon: UserRound })),
      ...data.invoices.map((item) => ({ id: item.id, title: item.number, subtitle: `Rechnung · ${item.title}`, path: `/rechnungen?highlight=${item.id}`, icon: FileText })),
      ...data.quotes.map((item) => ({ id: item.id, title: item.number, subtitle: `Kostenvoranschlag · ${item.title}`, path: `/kostenvoranschlaege?highlight=${item.id}`, icon: FileText })),
      ...data.orders.map((item) => ({ id: item.id, title: item.number, subtitle: `Auftrag · ${item.title}`, path: `/auftraege?highlight=${item.id}`, icon: Wrench })),
    ];
    return all.filter((item) => `${item.title} ${item.subtitle}`.toLocaleLowerCase('de').includes(needle)).slice(0, 8);
  }, [data, query]);

  function choose(result: SearchResult) {
    navigate(result.path); setQuery(''); setOpen(false);
  }

  return (
    <div className="global-search" ref={ref}>
      <Search size={18} aria-hidden="true" />
      <input value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Kunden, Belege, Aufträge suchen …" aria-label="Globale Suche" />
      <kbd>Strg K</kbd>
      {open && query.length >= 2 && <div className="search-results">
        <div className="search-results__label">Suchergebnisse</div>
        {results.length ? results.map((result) => <button key={result.id} onClick={() => choose(result)}><span className="search-results__icon"><result.icon size={17} /></span><span><strong>{result.title}</strong><small>{result.subtitle}</small></span><span className="search-results__open">Öffnen</span></button>) : <div className="search-results__empty">Keine passenden Einträge gefunden</div>}
      </div>}
    </div>
  );
}
