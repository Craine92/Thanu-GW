import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, CompanySettings, Customer, TimeEntry } from '../types/models';
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

  const value = useMemo(() => ({ data, loading, error, toasts, notify, saveSettings, resetDemo, createCustomer, createTimeEntry }), [data, loading, error, toasts, notify, saveSettings, resetDemo, createCustomer, createTimeEntry]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// The hook intentionally shares the provider module to keep this small demo's public API cohesive.
// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp muss innerhalb des AppProvider verwendet werden.');
  return context;
}
