import type {
  Activity, AppData, CompanySettings, Customer, DocumentItem, Employee, Invoice,
  InvoiceStatus, Material, Order, OrderStatus, Quote, QuoteStatus, StandardPosition,
  StockMovement, TimeEntry,
} from '../types/models';
import { calculateTotal } from '../utils/money';
import { shiftDays } from '../utils/date';
import { customerSnapshot } from '../utils/documents';

const today = new Date('2026-09-13T09:00:00');

const customerNames = [
  'Meier Immobilien AG', 'Schneider & Partner GmbH', 'Familie Keller', 'Hotel Seeblick',
  'Praxis Dr. Weber', 'Hausverwaltung Rosenberg AG', 'Bäckerei Huber', 'Architekturbüro Frei',
  'Restaurant Lindenhof', 'Familie Baumgartner', 'Kita Sonnenblume', 'Garage Rüegg AG',
  'Wohnbaugenossenschaft Limmat', 'Apotheke am Markt', 'Familie Schmid', 'Zürichsee Treuhand GmbH',
  'Pension Alpenblick', 'Kanzlei Graf & Bühler', 'Verein Werkraum', 'Blumenhaus Steiner',
  'Familie Moser', 'Elektro Jost AG', 'Physiotherapie Balance', 'Café Morgenrot', 'ImmoNova Zürich AG',
];

const streets = [
  'Seefeldstrasse 84', 'Badenerstrasse 210', 'Weinbergstrasse 33', 'Utoquai 41', 'Klosbachstrasse 67',
  'Rosenbergstrasse 18', 'Birmensdorferstrasse 102', 'Dufourstrasse 55', 'Niederdorfstrasse 24',
  'Forchstrasse 128', 'Sihlfeldstrasse 91', 'Albisriederstrasse 175', 'Limmatstrasse 204',
  'Marktgasse 12', 'Hegibachstrasse 76', 'Talstrasse 38', 'Höschgasse 22', 'Bahnhofstrasse 64',
  'Hohlstrasse 310', 'Universitätstrasse 45', 'Witikonerstrasse 286', 'Hardturmstrasse 122',
  'Freiestrasse 119', 'Langstrasse 87', 'Thurgauerstrasse 101',
];

const roles = [
  ['Marco Keller', 'Servicetechniker'], ['Daniel Frei', 'Sanitärinstallateur'],
  ['Tobias Meier', 'Heizungsmonteur'], ['Lena Graf', 'Administration'],
  ['Stefan Baumann', 'Projektleiter'], ['Nina Rüegg', 'Sanitärinstallateurin'],
  ['Patrick Bühler', 'Servicetechniker'], ['Sarah Moser', 'Geschäftsleitung'],
];

const materialNames = [
  ['Geberit Silent-PP Rohr DN 50', 'Rohrsysteme', 'm'], ['Geberit Silent-PP Bogen 45°', 'Rohrsysteme', 'Stk.'],
  ['Kupferrohr 15 mm', 'Rohrsysteme', 'm'], ['Kupferrohr 22 mm', 'Rohrsysteme', 'm'],
  ['Pressfitting Winkel 15 mm', 'Fittings', 'Stk.'], ['Pressfitting Muffe 22 mm', 'Fittings', 'Stk.'],
  ['Kugelhahn 1/2 Zoll', 'Armaturen', 'Stk.'], ['Kugelhahn 3/4 Zoll', 'Armaturen', 'Stk.'],
  ['Hansgrohe Waschtischmischer', 'Armaturen', 'Stk.'], ['Grohe Küchenarmatur', 'Armaturen', 'Stk.'],
  ['Geberit Sigma Unterputzspülkasten', 'Sanitär', 'Stk.'], ['Keramag Wand-WC Renova', 'Sanitär', 'Stk.'],
  ['Laufen Pro Waschtisch 60 cm', 'Sanitär', 'Stk.'], ['Duschrinne Edelstahl 80 cm', 'Sanitär', 'Stk.'],
  ['Viega Siphon 1 1/4 Zoll', 'Sanitär', 'Stk.'], ['Ausdehnungsgefäss 25 l', 'Heizung', 'Stk.'],
  ['Thermostatkopf Danfoss', 'Heizung', 'Stk.'], ['Heizkörperventil 1/2 Zoll', 'Heizung', 'Stk.'],
  ['Umwälzpumpe Grundfos Alpha2', 'Heizung', 'Stk.'], ['Manometer 0–6 bar', 'Heizung', 'Stk.'],
  ['Sicherheitsventil 3 bar', 'Heizung', 'Stk.'], ['Fernwärmeregler', 'Heizung', 'Stk.'],
  ['Gasströmungswächter DN 25', 'Gas', 'Stk.'], ['Gas-Kugelhahn 3/4 Zoll', 'Gas', 'Stk.'],
  ['Dichtband PTFE', 'Verbrauchsmaterial', 'Rolle'], ['Hanfspule 80 g', 'Verbrauchsmaterial', 'Stk.'],
  ['Dichtpaste 250 g', 'Verbrauchsmaterial', 'Dose'], ['Rohrschelle 50 mm', 'Befestigung', 'Stk.'],
  ['Montageschiene 2 m', 'Befestigung', 'Stk.'], ['Schallschutzeinlage DN 50', 'Befestigung', 'Stk.'],
  ['Dämmrohr 22/20 mm', 'Dämmung', 'm'], ['Dämmmatte selbstklebend', 'Dämmung', 'm²'],
  ['Rückflussverhinderer DN 20', 'Armaturen', 'Stk.'], ['Druckminderer DN 25', 'Armaturen', 'Stk.'],
  ['Wasserfilter rückspülbar', 'Wasseraufbereitung', 'Stk.'], ['Enthärtungsanlage compact', 'Wasseraufbereitung', 'Stk.'],
  ['Leckagesensor Smart Home', 'Messtechnik', 'Stk.'], ['Rauchgasthermometer', 'Messtechnik', 'Stk.'],
  ['Silikon Sanitär weiss', 'Verbrauchsmaterial', 'Kart.'], ['Revisionsdeckel 20 × 20 cm', 'Sanitär', 'Stk.'],
] as const;

const jobTitles = [
  'Boilerwartung und Sicherheitsprüfung', 'Erneuerung Waschtischarmatur', 'Heizungsstörung analysieren',
  'Sanierung Gäste-WC', 'Leckageprüfung Hauptleitung', 'Austausch Umwälzpumpe',
  'Montage Rückflussverhinderer', 'Entkalkung Warmwasserspeicher', 'Umbau Sanitäranschlüsse',
  'Wartung Gastherme', 'Einbau Duschrinne', 'Heizkörperventile ersetzen',
];

const itemDescriptions = [
  'Servicetechniker – Arbeitszeit', 'Anfahrt und Fahrzeugpauschale', 'Installationsmaterial gemäss Rapport',
  'Funktions- und Dichtheitsprüfung', 'Entsorgung und Kleinmaterial',
];

function makeItems(seed: number, tax = 8.1): DocumentItem[] {
  const prices = [148, 68, 235 + seed * 11, 112, 46];
  return itemDescriptions.slice(0, 3 + (seed % 3)).map((description, index) => ({
    id: `item-${seed}-${index}`,
    itemType: index === 0 ? 'labor' as const : index === 1 ? 'flat' as const : 'custom' as const,
    description,
    quantity: index === 0 ? 2 + (seed % 7) * 0.5 : 1 + (seed % 3),
    unit: index === 0 ? 'Std.' : 'Pausch.',
    unitPrice: prices[index],
    discount: seed % 6 === 0 ? 5 : 0,
    taxRate: tax,
  }));
}

function createCustomers(): Customer[] {
  return customerNames.map((name, index) => ({
    id: `customer-${index + 1}`,
    number: `KD-${String(10001 + index)}`,
    type: name.startsWith('Familie') ? 'private' : 'company',
    name,
    contactPerson: name.startsWith('Familie') ? undefined : ['Anna Meier', 'Peter Schneider', 'Claudia Weber', 'Lukas Huber'][index % 4],
    email: `${name.toLowerCase().replace(/[^a-zäöü]+/g, '.').replace(/(^\.|\.$)/g, '').replace(/[äöü]/g, 'a')}@beispiel.ch`,
    phone: `+41 44 ${String(210 + index).padStart(3, '0')} ${String(20 + index).padStart(2, '0')} ${String(30 + index).padStart(2, '0')}`,
    address: { street: streets[index], postalCode: String(8001 + (index % 9)), city: index % 5 === 0 ? 'Küsnacht' : 'Zürich', country: 'Schweiz' },
    createdAt: shiftDays(today, -320 + index * 8),
    notes: index % 4 === 0 ? 'Wiederkehrender Wartungskunde' : undefined,
  }));
}

function createEmployees(): Employee[] {
  const colors = ['#27766d', '#3a67a3', '#b26b32', '#7b579b', '#3d7852', '#a24f64', '#61717c', '#1e4e49'];
  return roles.map(([name, role], index) => ({
    id: `employee-${index + 1}`,
    employeeNumber: `MA-${String(index + 1).padStart(3, '0')}`,
    name,
    role,
    email: `${name.toLowerCase().replace(' ', '.')}@mueller-haustechnik.ch`,
    phone: `+41 79 555 ${String(10 + index).padStart(2, '0')} ${String(20 + index).padStart(2, '0')}`,
    initials: name.split(' ').map((part) => part[0]).join(''),
    color: colors[index],
    active: true,
  }));
}

function createQuotes(customers: Customer[]): Quote[] {
  const statuses: QuoteStatus[] = ['sent', 'accepted', 'draft', 'accepted', 'rejected', 'sent', 'expired'];
  return Array.from({ length: 15 }, (_, index) => {
    const items = makeItems(index + 4);
    const customerId = `customer-${(index * 2) % 25 + 1}`;
    return {
      id: `quote-${index + 1}`, number: `KV-2026-${String(index + 31).padStart(4, '0')}`,
      customerId, customerSnapshot: customerSnapshot(customers.find((customer) => customer.id === customerId)!), title: jobTitles[index % jobTitles.length], currency: 'CHF',
      status: statuses[index % statuses.length], issueDate: shiftDays(today, -84 + index * 5),
      validUntil: shiftDays(today, -54 + index * 5), items, total: calculateTotal(items),
      introduction: 'Vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgenden Kostenvoranschlag.',
      notes: index % 4 === 0 ? 'Ausführung nach gemeinsamer Terminvereinbarung.' : '',
      closingText: 'Die Offerte ist 30 Tage gültig. Wir freuen uns auf Ihren Auftrag.',
      convertedInvoiceId: index === 1 ? 'invoice-3' : undefined,
      createdAt: `${shiftDays(today, -84 + index * 5)}T09:20:00`,
      updatedAt: `${shiftDays(today, -84 + index * 5)}T09:20:00`,
    };
  });
}

function createOrders(customers: Customer[]): Order[] {
  const statuses: OrderStatus[] = ['in_progress', 'planned', 'waiting', 'completed', 'in_progress', 'planned'];
  return Array.from({ length: 12 }, (_, index) => {
    const customer = customers[(index * 2 + 1) % customers.length];
    return {
      id: `order-${index + 1}`, number: `AU-2026-${String(index + 36).padStart(4, '0')}`,
      customerId: customer.id, quoteId: index < 8 ? `quote-${index + 1}` : undefined,
      title: jobTitles[(index + 2) % jobTitles.length], description: 'Ausführung gemäss Kundenauftrag inklusive Funktionskontrolle und Rapport.',
      status: statuses[index % statuses.length], employeeId: `employee-${(index % 6) + 1}`,
      scheduledAt: `${shiftDays(today, -8 + index * 2)}T${String(8 + (index % 5)).padStart(2, '0')}:00:00`,
      address: customer.address, createdAt: `${shiftDays(today, -45 + index * 3)}T10:00:00`,
    };
  });
}

function createInvoices(customers: Customer[]): Invoice[] {
  const statuses: InvoiceStatus[] = ['sent', 'paid', 'overdue', 'paid', 'partial', 'draft', 'paid', 'overdue'];
  return Array.from({ length: 20 }, (_, index) => {
    const items = makeItems(index + 21);
    const issueOffset = -168 + index * 9;
    const status = statuses[index % statuses.length];
    const total = calculateTotal(items);
    const customerId = index === 2 ? 'customer-3' : `customer-${(index * 3) % 25 + 1}`;
    return {
      id: `invoice-${index + 1}`, number: `RE-2026-${String(index + 42).padStart(4, '0')}`,
      customerId, customerSnapshot: customerSnapshot(customers.find((customer) => customer.id === customerId)!), orderId: index < 12 ? `order-${(index % 12) + 1}` : undefined,
      title: jobTitles[index % jobTitles.length], currency: 'CHF', status, issueDate: shiftDays(today, issueOffset),
      dueDate: shiftDays(today, issueOffset + 30), paidAmount: status === 'paid' ? total : status === 'partial' ? total * 0.45 : 0,
      items, total, createdAt: `${shiftDays(today, issueOffset)}T14:15:00`,
      introduction: 'Vielen Dank für Ihren Auftrag.', notes: '',
      closingText: 'Zahlbar ohne Abzug innerhalb von 30 Tagen.',
      sourceQuoteId: index === 2 ? 'quote-2' : undefined,
      updatedAt: `${shiftDays(today, issueOffset)}T14:15:00`,
    };
  });
}

function createMaterials(): Material[] {
  return materialNames.map(([name, category, unit], index) => ({
    id: `material-${index + 1}`, sku: `MAT-${String(2100 + index)}`, name, category, unit,
    purchasePrice: Number((6.8 + index * 4.75).toFixed(2)), salePrice: Number((12.9 + index * 8.4).toFixed(2)),
    stock: (index * 7) % 43, minStock: 4 + (index % 5) * 2, location: `Lager ${String.fromCharCode(65 + (index % 4))}-${1 + (index % 6)}`,
  }));
}

function createStandardPositions(): StandardPosition[] {
  const titles = [
    'Servicetechniker', 'Sanitärinstallateur', 'Heizungsmonteur', 'Projektleitung', 'Anfahrt Stadtgebiet',
    'Anfahrt Agglomeration', 'Kleinmaterialpauschale', 'Dichtheitsprüfung Wasser', 'Dichtheitsprüfung Gas',
    'Boiler entkalken bis 200 l', 'Gastherme Jahreswartung', 'Heizungsanlage entlüften', 'Armatur austauschen',
    'WC-Anlage montieren', 'Waschtisch montieren', 'Leckortung', 'Notdienstzuschlag Werktag',
    'Notdienstzuschlag Wochenende', 'Entsorgung Altmaterial', 'Dokumentation und Übergabe',
  ];
  return titles.map((title, index) => ({
    id: `position-${index + 1}`, code: `POS-${String(index + 101).padStart(4, '0')}`, title,
    description: `${title} fachgerecht ausführen und dokumentieren.`, category: index < 4 ? 'Arbeitszeit' : index < 7 ? 'Pauschalen' : 'Leistungen',
    unit: index < 4 ? 'Std.' : 'Pausch.', unitPrice: 58 + index * 17, taxRate: 8.1,
  }));
}

function createTimeEntries(): TimeEntry[] {
  const descriptions = ['Montagearbeiten', 'Service und Diagnose', 'Materialdisposition', 'Inbetriebnahme', 'Kundenbesprechung', 'Funktionsprüfung'];
  return Array.from({ length: 88 }, (_, index) => ({
    id: `time-${index + 1}`, employeeId: `employee-${(index % 7) + 1}`, orderId: `order-${(index % 12) + 1}`,
    date: shiftDays(today, -(index % 42)), hours: 1.5 + (index % 8) * 0.5,
    description: descriptions[index % descriptions.length], billable: index % 9 !== 0,
  }));
}

function createStockMovements(): StockMovement[] {
  return Array.from({ length: 28 }, (_, index) => ({
    id: `stock-${index + 1}`, materialId: `material-${(index * 3) % 40 + 1}`,
    type: index % 4 === 0 ? 'in' : 'out', quantity: index % 4 === 0 ? 10 + index : -(1 + (index % 4)),
    date: `${shiftDays(today, -(index % 21))}T${String(8 + (index % 8)).padStart(2, '0')}:30:00`,
    orderId: index % 4 === 0 ? undefined : `order-${(index % 12) + 1}`,
    note: index % 4 === 0 ? 'Wareneingang Lieferant' : 'Materialentnahme Auftrag',
  }));
}

function createActivities(): Activity[] {
  return [
    ['invoice', 'Rechnung RE-2026-0058 wurde als bezahlt markiert.', 'invoice-17'],
    ['time', 'Marco Keller hat 3,5 Stunden auf Auftrag AU-2026-0041 erfasst.', 'time-1'],
    ['quote', 'Kostenvoranschlag KV-2026-0042 wurde angenommen.', 'quote-12'],
    ['stock', 'Material Geberit Silent-PP Rohr wurde aus dem Lager entnommen.', 'material-1'],
    ['order', 'Auftrag AU-2026-0045 wurde für Nina Rüegg eingeplant.', 'order-10'],
    ['customer', 'Neuer Kunde ImmoNova Zürich AG wurde angelegt.', 'customer-25'],
    ['invoice', 'Zahlungseingang zu RE-2026-0055 wurde verbucht.', 'invoice-14'],
    ['order', 'Auftrag AU-2026-0039 wurde abgeschlossen.', 'order-4'],
  ].map(([type, text, entityId], index) => ({
    id: `activity-${index + 1}`, type: type as Activity['type'], text,
    date: new Date(today.getTime() - index * 1000 * 60 * (38 + index * 29)).toISOString(), entityId,
  }));
}

export const defaultSettings: CompanySettings = {
  companyName: 'Müller Haustechnik AG', industry: 'Sanitär · Heizung · Gas · Wasser · Service',
  address: { street: 'Hardturmstrasse 253', postalCode: '8005', city: 'Zürich', country: 'Schweiz' },
  phone: '+41 44 555 18 80', email: 'info@mueller-haustechnik.ch', website: 'www.mueller-haustechnik.ch',
  vatId: 'CHE-284.517.906 MWST', currency: 'CHF', locale: 'de-CH', defaultTaxRate: 8.1,
  paymentTerms: 30, defaultDiscount: 0,
  numberRanges: { invoicePrefix: 'RE', quotePrefix: 'KV', orderPrefix: 'AU', nextInvoice: 62, nextQuote: 46, nextOrder: 48, nextCustomer: 10026 },
};

export function createDemoData(): AppData {
  const customers = createCustomers();
  return {
    customers, employees: createEmployees(), quotes: createQuotes(customers), orders: createOrders(customers),
    invoices: createInvoices(customers), materials: createMaterials(), stockMovements: createStockMovements(),
    standardPositions: createStandardPositions(), timeEntries: createTimeEntries(), activities: createActivities(),
    settings: structuredClone(defaultSettings),
  };
}
