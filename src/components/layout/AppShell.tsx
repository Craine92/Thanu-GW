import {
  BarChart3, Bell, Boxes, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileCheck2,
  FileText, Gauge, Menu, Package, Plus, ReceiptText, Settings, Users, UserRound, Warehouse, Wrench, X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CreateCustomerDialog } from '../dialogs/CreateCustomerDialog';
import { CreateTimeEntryDialog } from '../dialogs/CreateTimeEntryDialog';
import { GlobalSearch } from './GlobalSearch';

const navGroups = [
  { label: 'Übersicht', items: [{ to: '/', label: 'Dashboard', icon: Gauge }] },
  { label: 'Verkauf', items: [
    { to: '/kostenvoranschlaege', label: 'Kostenvoranschläge', icon: FileCheck2 },
    { to: '/auftraege', label: 'Aufträge', icon: Wrench },
    { to: '/rechnungen', label: 'Rechnungen', icon: ReceiptText },
  ] },
  { label: 'Stammdaten', items: [
    { to: '/kunden', label: 'Kunden', icon: Users }, { to: '/mitarbeiter', label: 'Mitarbeiter', icon: UserRound },
    { to: '/materialien', label: 'Materialien', icon: Package }, { to: '/standardpositionen', label: 'Standardpositionen', icon: FileText },
  ] },
  { label: 'Betrieb', items: [{ to: '/zeiterfassung', label: 'Zeiterfassung', icon: Clock3 }, { to: '/lager', label: 'Lager', icon: Warehouse }] },
  { label: 'Auswertungen', items: [{ to: '/berichte', label: 'Berichte', icon: BarChart3 }] },
  { label: 'System', items: [{ to: '/einstellungen', label: 'Einstellungen', icon: Settings }] },
];

const titleByPath: Record<string, string> = Object.fromEntries(navGroups.flatMap((group) => group.items.map((item) => [item.to, item.label])));

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => !menuRef.current?.contains(event.target as Node) && setNewOpen(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const quickItems = [
    { label: 'Neuer Kunde', icon: Users, action: () => setCustomerOpen(true) },
    { label: 'Neuer Kostenvoranschlag', icon: FileCheck2, action: () => navigate('/kostenvoranschlaege?neu=1') },
    { label: 'Neuer Auftrag', icon: Wrench, action: () => navigate('/auftraege?neu=1') },
    { label: 'Neue Rechnung', icon: ReceiptText, action: () => navigate('/rechnungen?neu=1') },
    { label: 'Zeit erfassen', icon: Clock3, action: () => setTimeOpen(true) },
  ];

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      {mobileOpen && <button className="mobile-overlay" aria-label="Navigation schliessen" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="brand"><div className="brand__mark"><Boxes size={22} /></div><div className="brand__text"><strong>Müller</strong><span>Haustechnik</span></div><button className="sidebar__mobile-close" onClick={() => setMobileOpen(false)} aria-label="Navigation schliessen"><X size={20} /></button></div>
        <nav className="sidebar__nav">
          {navGroups.map((group) => <div className="nav-group" key={group.label}><span className="nav-group__label">{group.label}</span>{group.items.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} title={collapsed ? item.label : undefined} onClick={() => setMobileOpen(false)}><item.icon size={18} /><span>{item.label}</span></NavLink>)}</div>)}
        </nav>
        <div className="sidebar__footer"><div className="sidebar__support"><span className="status-dot" /><div><strong>Demo-System</strong><span>Alle Daten lokal</span></div></div><button className="sidebar__collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}>{collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Einklappen</span></>}</button></div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar__title"><button className="topbar__menu" onClick={() => setMobileOpen(true)} aria-label="Navigation öffnen"><Menu size={20} /></button><div><span>Arbeitsbereich</span><strong>{titleByPath[location.pathname] ?? 'Übersicht'}</strong></div></div>
          <GlobalSearch />
          <div className="topbar__actions">
            <div className="quick-new" ref={menuRef}><button className="button button--primary" onClick={() => setNewOpen((value) => !value)}><Plus size={16} /><span>Neu</span><ChevronDown size={14} /></button>{newOpen && <div className="dropdown-menu dropdown-menu--new">{quickItems.map((item) => <button key={item.label} onClick={() => { item.action(); setNewOpen(false); }}><item.icon size={17} />{item.label}</button>)}</div>}</div>
            <div className="notice"><button className="icon-button notice__button" onClick={() => setNoticeOpen((value) => !value)} aria-label="Benachrichtigungen"><Bell size={19} /><span /></button>{noticeOpen && <div className="dropdown-menu notice-panel"><div className="notice-panel__head"><strong>Benachrichtigungen</strong><span>3 neu</span></div><div className="notice-item"><i className="notice-item__dot notice-item__dot--danger" /><div><strong>2 Rechnungen sind überfällig</strong><span>Bitte Zahlungseingänge prüfen.</span><small>vor 18 Min.</small></div></div><div className="notice-item"><i className="notice-item__dot" /><div><strong>Niedriger Lagerbestand</strong><span>5 Materialien haben Mindestbestand erreicht.</span><small>vor 2 Std.</small></div></div><button className="notice-panel__all" onClick={() => { navigate('/'); setNoticeOpen(false); }}>Alle Aktivitäten anzeigen</button></div>}</div>
            <div className="profile"><span className="avatar">SG</span><div><strong>Sarah Moser</strong><span>Geschäftsleitung</span></div><ChevronDown size={14} /></div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      {data && <><CreateCustomerDialog open={customerOpen} onClose={() => setCustomerOpen(false)} /><CreateTimeEntryDialog open={timeOpen} onClose={() => setTimeOpen(false)} /></>}
    </div>
  );
}
