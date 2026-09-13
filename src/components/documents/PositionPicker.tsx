import { BriefcaseBusiness, ChevronDown, Clock3, FilePlus2, Package, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DocumentItem, Material, StandardPosition } from '../../types/models';
import { Modal } from '../ui/Modal';

type PickerMode = 'material' | 'labor' | 'standard' | 'flat' | null;

function itemId() { return `editor-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export function PositionPicker({ materials, positions, defaultTax, onAdd }: { materials: Material[]; positions: StandardPosition[]; defaultTax: number; onAdd: (item: DocumentItem) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<PickerMode>(null);
  const [query, setQuery] = useState('');
  const entries = useMemo(() => {
    if (mode === 'material') return materials.filter((item) => `${item.sku} ${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
    let list = positions;
    if (mode === 'labor') list = list.filter((item) => item.category === 'Arbeitszeit');
    if (mode === 'flat') list = list.filter((item) => item.category === 'Pauschalen');
    return list.filter((item) => `${item.code} ${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  }, [mode, materials, positions, query]);
  function addFree() { onAdd({ id: itemId(), itemType: 'custom', description: 'Individuelle Leistung', quantity: 1, unit: 'Stk.', unitPrice: 0, discount: 0, taxRate: defaultTax }); setMenuOpen(false); }
  function choose(entry: Material | StandardPosition) {
    if ('sku' in entry) onAdd({ id: itemId(), itemType: 'material', materialId: entry.id, description: entry.name, quantity: 1, unit: entry.unit, unitPrice: entry.salePrice, discount: 0, taxRate: defaultTax });
    else onAdd({ id: itemId(), itemType: mode === 'labor' ? 'labor' : mode === 'flat' ? 'flat' : 'custom', standardPositionId: entry.id, description: `${entry.title}\n${entry.description}`, quantity: 1, unit: entry.unit, unitPrice: entry.unitPrice, discount: 0, taxRate: entry.taxRate });
    setMode(null); setMenuOpen(false); setQuery('');
  }
  const options = [
    { label: 'Arbeitszeit', icon: Clock3, mode: 'labor' as PickerMode }, { label: 'Material', icon: Package, mode: 'material' as PickerMode },
    { label: 'Standardposition', icon: BriefcaseBusiness, mode: 'standard' as PickerMode }, { label: 'Pauschale', icon: FilePlus2, mode: 'flat' as PickerMode },
  ];
  return <div className="position-picker"><button type="button" className="button button--secondary" onClick={() => setMenuOpen((value) => !value)}><FilePlus2 size={16}/><span>Position hinzufügen</span><ChevronDown size={14}/></button>{menuOpen && <div className="position-picker__menu">{options.map((option) => <button key={option.label} type="button" onClick={() => setMode(option.mode)}><option.icon size={16}/><span>{option.label}</span></button>)}<button type="button" onClick={addFree}><FilePlus2 size={16}/><span>Freie Position</span></button></div>}
    <Modal open={Boolean(mode)} onClose={() => { setMode(null); setQuery(''); }} title={mode === 'material' ? 'Material auswählen' : mode === 'labor' ? 'Arbeitszeit auswählen' : mode === 'flat' ? 'Pauschale auswählen' : 'Standardposition auswählen'} description="Die übernommenen Werte können anschließend individuell geändert werden." size="large"><label className="picker-search"><Search size={17}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Position durchsuchen …" /></label><div className="picker-results">{entries.map((entry) => <button type="button" key={entry.id} onClick={() => choose(entry)}><span className="picker-results__icon">{'sku' in entry ? <Package size={17}/> : <BriefcaseBusiness size={17}/>}</span><span><strong>{'sku' in entry ? entry.name : entry.title}</strong><small>{'sku' in entry ? `${entry.sku} · ${entry.category} · Bestand ${entry.stock} ${entry.unit}` : `${entry.code} · ${entry.description}`}</small></span><span className="picker-results__meta">{'sku' in entry ? `${entry.salePrice.toFixed(2)} / ${entry.unit}` : `${entry.unitPrice.toFixed(2)} / ${entry.unit}`}</span></button>)}</div></Modal>
  </div>;
}
