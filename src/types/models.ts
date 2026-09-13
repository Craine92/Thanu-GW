export type CurrencyCode = 'EUR' | 'CHF' | 'USD' | 'GBP';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type OrderStatus = 'planned' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface Address {
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface Customer {
  id: string;
  number: string;
  type: 'company' | 'private';
  name: string;
  contactPerson?: string;
  email: string;
  phone: string;
  address: Address;
  createdAt: string;
  notes?: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  initials: string;
  color: string;
  active: boolean;
}

export interface DocumentItem {
  id: string;
  itemType: 'labor' | 'material' | 'flat' | 'custom';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxRate: number;
  materialId?: string;
  standardPositionId?: string;
}

export interface DocumentCustomerSnapshot {
  number: string;
  name: string;
  contactPerson?: string;
  email: string;
  phone: string;
  address: Address;
}

export interface DocumentContent {
  customerId: string;
  customerSnapshot: DocumentCustomerSnapshot;
  title: string;
  currency: CurrencyCode;
  introduction: string;
  notes: string;
  closingText: string;
  items: DocumentItem[];
}

export interface Quote {
  id: string;
  number: string;
  customerId: string;
  title: string;
  customerSnapshot: DocumentCustomerSnapshot;
  currency: CurrencyCode;
  status: QuoteStatus;
  issueDate: string;
  validUntil: string;
  items: DocumentItem[];
  total: number;
  introduction: string;
  notes: string;
  closingText: string;
  convertedInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  number: string;
  customerId: string;
  quoteId?: string;
  title: string;
  description: string;
  status: OrderStatus;
  employeeId: string;
  scheduledAt: string;
  address: Address;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  orderId?: string;
  title: string;
  customerSnapshot: DocumentCustomerSnapshot;
  currency: CurrencyCode;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidAmount: number;
  items: DocumentItem[];
  total: number;
  introduction: string;
  notes: string;
  closingText: string;
  sourceQuoteId?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuoteDraft = Omit<Quote, 'id' | 'number' | 'total' | 'createdAt' | 'updatedAt' | 'convertedInvoiceId'>;
export type InvoiceDraft = Omit<Invoice, 'id' | 'number' | 'total' | 'createdAt' | 'updatedAt'>;

export type InvoiceItem = DocumentItem;
export type QuoteItem = DocumentItem;

export interface Material {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  location: string;
}

export interface StockMovement {
  id: string;
  materialId: string;
  type: 'in' | 'out' | 'correction';
  quantity: number;
  date: string;
  orderId?: string;
  note: string;
}

export interface StandardPosition {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  unit: string;
  unitPrice: number;
  taxRate: number;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  orderId: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
}

export interface Activity {
  id: string;
  type: 'invoice' | 'quote' | 'order' | 'time' | 'stock' | 'customer';
  text: string;
  date: string;
  entityId?: string;
}

export interface NumberRanges {
  invoicePrefix: string;
  quotePrefix: string;
  orderPrefix: string;
  nextInvoice: number;
  nextQuote: number;
  nextOrder: number;
  nextCustomer: number;
}

export interface CompanySettings {
  companyName: string;
  industry: string;
  address: Address;
  phone: string;
  email: string;
  website: string;
  vatId: string;
  logo?: string;
  currency: CurrencyCode;
  locale: string;
  defaultTaxRate: number;
  paymentTerms: number;
  defaultDiscount: number;
  numberRanges: NumberRanges;
}

export interface AppData {
  customers: Customer[];
  employees: Employee[];
  quotes: Quote[];
  orders: Order[];
  invoices: Invoice[];
  materials: Material[];
  stockMovements: StockMovement[];
  standardPositions: StandardPosition[];
  timeEntries: TimeEntry[];
  activities: Activity[];
  settings: CompanySettings;
}
