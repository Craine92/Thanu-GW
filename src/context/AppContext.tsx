import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, CompanySettings, Customer, Invoice, InvoiceDraft, InvoiceStatus, Quote, QuoteDraft, QuoteStatus, TimeEntry } from '../types/models';
import { erpService } from '../services/erpService';
import { settingsRepository } from '../data/repositories';

interface ToastMessage { id: number; message: string; tone: 'success' | 'danger' | 'info' }

interface AppContextValue {
  data: AppData | null;
  loading: boolean;
  error: string | null;
  toasts: ToastMessage[];
  notify: (message: string, tone?: ToastMessage['tone']) => void;
  saveSettings: (settings: CompanySettings) => Promise<void>;
  resetDemo: () => Promise<void>;
  createCustomer: (input: Pick<Customer, 'name' | 'email' | 'phone' | 'type'>) => Promise<void>;
  createTimeEntry: (input: Omit<TimeEntry, 'id'>) => Promise<void>;
  createQuote: (draft: QuoteDraft) => Promise<Quote>;
  updateQuote: (id: string, draft: QuoteDraft) => Promise<Quote>;
  deleteQuote: (id: string) => Promise<void>;
  duplicateQuote: (id: string) => Promise<Quote>;
  setQuoteStatus: (id: string, status: QuoteStatus) => Promise<Quote>;
  convertQuoteToInvoice: (id: string) => Promise<{ invoice: Invoice; alreadyExisting: boolean }>;
  createInvoice: (draft: InvoiceDraft) => Promise<Invoice>;
  updateInvoice: (id: string, draft: InvoiceDraft) => Promise<Invoice>;
  duplicateInvoice: (id: string) => Promise<Invoice>;
  setInvoiceStatus: (id: string, status: InvoiceStatus, paidAmount?: number) => Promise<Invoice>;
  recordInvoicePayment: (id: string, amount: number) => Promise<Invoice>;
  removeOrCancelInvoice: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    let active = true;
    erpService.load()
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Lokale Daten konnten nicht geladen werden.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const notify = useCallback((message: string, tone: ToastMessage['tone'] = 'success') => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  }, []);

  const runDocumentMutation = useCallback(async <T,>(operation: () => Promise<T>, failureMessage: string): Promise<T> => {
    try {
      return await operation();
    } catch (reason) {
      console.error(failureMessage, reason);
      notify(failureMessage, 'danger');
      throw reason;
    }
  }, [notify]);

  const saveSettings = useCallback(async (settings: CompanySettings) => {
    await settingsRepository.save(settings);
    setData((current) => current ? { ...current, settings } : current);
    notify('Einstellungen wurden gespeichert.');
  }, [notify]);

  const resetDemo = useCallback(async () => {
    setLoading(true);
    const fresh = await erpService.reset();
    setData(fresh);
    setLoading(false);
    notify('Die Demo-Daten wurden erfolgreich zurückgesetzt.');
  }, [notify]);

  const createCustomer = useCallback(async (input: Pick<Customer, 'name' | 'email' | 'phone' | 'type'>) => {
    if (!data) return;
    setData(await erpService.createCustomer(data, input));
    notify('Kunde wurde erfolgreich angelegt.');
  }, [data, notify]);

  const createTimeEntry = useCallback(async (input: Omit<TimeEntry, 'id'>) => {
    if (!data) return;
    setData(await erpService.createTimeEntry(data, input));
    notify('Arbeitszeit wurde erfolgreich erfasst.');
  }, [data, notify]);

  const createQuote = useCallback(async (draft: QuoteDraft) => {
    if (!data) throw new Error('Daten sind noch nicht geladen.');
    return runDocumentMutation(async () => {
      const result = await erpService.createQuote(data, draft); setData(result.data);
      notify(`Kostenvoranschlag ${result.entity.number} wurde gespeichert.`); return result.entity;
    }, 'Kostenvoranschlag konnte nicht gespeichert werden.');
  }, [data, notify, runDocumentMutation]);
  const updateQuote = useCallback(async (id: string, draft: QuoteDraft) => {
    if (!data) throw new Error('Daten sind noch nicht geladen.');
    return runDocumentMutation(async () => {
      const result = await erpService.updateQuote(data, id, draft); setData(result.data);
      notify(`Kostenvoranschlag ${result.entity.number} wurde gespeichert.`); return result.entity;
    }, 'Kostenvoranschlag konnte nicht gespeichert werden.');
  }, [data, notify, runDocumentMutation]);
  const deleteQuote = useCallback(async (id: string) => {
    if (!data) return;
    return runDocumentMutation(async () => { setData(await erpService.deleteQuote(data, id)); notify('Kostenvoranschlag wurde gelöscht.'); }, 'Kostenvoranschlag konnte nicht gelöscht werden.');
  }, [data, notify, runDocumentMutation]);
  const duplicateQuote = useCallback(async (id: string) => {
    if (!data) throw new Error('Daten sind noch nicht geladen.');
    return runDocumentMutation(async () => {
      const result = await erpService.duplicateQuote(data, id); setData(result.data); notify('Kostenvoranschlag wurde dupliziert.'); return result.entity;
    }, 'Kostenvoranschlag konnte nicht dupliziert werden.');
  }, [data, notify, runDocumentMutation]);
  const setQuoteStatus = useCallback(async (id: string, status: QuoteStatus) => {
    if (!data) throw new Error('Daten sind noch nicht geladen.');
    return runDocumentMutation(async () => {
      const result = await erpService.setQuoteStatus(data, id, status); setData(result.data); notify(`Status von ${result.entity.number} wurde aktualisiert.`); return result.entity;
    }, 'Status konnte nicht aktualisiert werden.');
  }, [data, notify, runDocumentMutation]);
  const convertQuoteToInvoice = useCallback(async (id: string) => {
    if (!data) throw new Error('Daten sind noch nicht geladen.');
    return runDocumentMutation(async () => {
      const result = await erpService.convertQuoteToInvoice(data, id); setData(result.data);
      if (!result.alreadyExisting) notify(`Rechnung ${result.entity.number} wurde erstellt.`);
      return { invoice: result.entity, alreadyExisting: result.alreadyExisting };
    }, 'Kostenvoranschlag konnte nicht in eine Rechnung umgewandelt werden.');
  }, [data, notify, runDocumentMutation]);
  const createInvoice = useCallback(async (draft: InvoiceDraft) => {
    if (!data) throw new Error('Daten sind noch nicht geladen.');
    return runDocumentMutation(async () => {
      const result = await erpService.createInvoice(data, draft); setData(result.data); notify(`Rechnung ${result.entity.number} wurde gespeichert.`); return result.entity;
    }, 'Rechnung konnte nicht gespeichert werden.');
  }, [data, notify, runDocumentMutation]);
  const updateInvoice = useCallback(async (id: string, draft: InvoiceDraft) => {
    if (!data) throw new Error('Daten sind noch nicht geladen.');
    return runDocumentMutation(async () => {
      const result = await erpService.updateInvoice(data, id, draft); setData(result.data); notify(`Rechnung ${result.entity.number} wurde gespeichert.`); return result.entity;
    }, 'Rechnung konnte nicht gespeichert werden.');
  }, [data, notify, runDocumentMutation]);
  const duplicateInvoice = useCallback(async (id: string) => {
    if (!data) throw new Error('Daten sind noch nicht geladen.');
    return runDocumentMutation(async () => {
      const result = await erpService.duplicateInvoice(data, id); setData(result.data); notify('Rechnung wurde dupliziert.'); return result.entity;
    }, 'Rechnung konnte nicht dupliziert werden.');
  }, [data, notify, runDocumentMutation]);
  const setInvoiceStatus = useCallback(async (id: string, status: InvoiceStatus, paidAmount?: number) => {
    if (!data) throw new Error('Daten sind noch nicht geladen.');
    return runDocumentMutation(async () => {
      const result = await erpService.setInvoiceStatus(data, id, status, paidAmount); setData(result.data); notify(`Status von ${result.entity.number} wurde aktualisiert.`); return result.entity;
    }, 'Rechnungsstatus konnte nicht aktualisiert werden.');
  }, [data, notify, runDocumentMutation]);
  const recordInvoicePayment = useCallback(async (id: string, amount: number) => {
    if (!data) throw new Error('Daten sind noch nicht geladen.');
    return runDocumentMutation(async () => {
      const result = await erpService.recordInvoicePayment(data, id, amount); setData(result.data); notify(`Zahlung zu ${result.entity.number} wurde erfasst.`); return result.entity;
    }, 'Zahlung konnte nicht erfasst werden.');
  }, [data, notify, runDocumentMutation]);
  const removeOrCancelInvoice = useCallback(async (id: string) => {
    if (!data) return;
    return runDocumentMutation(async () => {
      const invoice = data.invoices.find((item) => item.id === id); setData(await erpService.removeOrCancelInvoice(data, id)); notify(invoice?.status === 'draft' ? 'Rechnung wurde gelöscht.' : 'Rechnung wurde storniert.');
    }, 'Rechnung konnte nicht gelöscht oder storniert werden.');
  }, [data, notify, runDocumentMutation]);

  const value = useMemo(() => ({ data, loading, error, toasts, notify, saveSettings, resetDemo, createCustomer, createTimeEntry, createQuote, updateQuote, deleteQuote, duplicateQuote, setQuoteStatus, convertQuoteToInvoice, createInvoice, updateInvoice, duplicateInvoice, setInvoiceStatus, recordInvoicePayment, removeOrCancelInvoice }), [data, loading, error, toasts, notify, saveSettings, resetDemo, createCustomer, createTimeEntry, createQuote, updateQuote, deleteQuote, duplicateQuote, setQuoteStatus, convertQuoteToInvoice, createInvoice, updateInvoice, duplicateInvoice, setInvoiceStatus, recordInvoicePayment, removeOrCancelInvoice]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// The hook intentionally shares the provider module to keep this small demo's public API cohesive.
// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp muss innerhalb des AppProvider verwendet werden.');
  return context;
}
