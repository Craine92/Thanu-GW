import { AlertTriangle } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingScreen } from './components/feedback/LoadingScreen';
import { ToastViewport } from './components/feedback/ToastViewport';
import { AppShell } from './components/layout/AppShell';
import { useApp } from './context/AppContext';
import {
  CustomersPage, EmployeesPage, InvoicesPage, MaterialsPage, OrdersPage, QuotesPage,
  StandardPositionsPage, StockPage, TimeTrackingPage,
} from './pages/ModulePages';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

export default function App() {
  const { loading, data, error } = useApp();
  if (loading) return <LoadingScreen />;
  if (error || !data) return <div className="error-screen"><AlertTriangle size={30}/><strong>Die lokalen Daten konnten nicht geladen werden.</strong><span>{error ?? 'Unbekannter Fehler'}</span><button className="button button--primary" onClick={() => window.location.reload()}>Erneut versuchen</button></div>;
  return <AppShell><Suspense fallback={<div className="route-loading"><div className="spinner"/><span>Ansicht wird geladen …</span></div>}><Routes><Route path="/" element={<DashboardPage />} /><Route path="/kunden" element={<CustomersPage />} /><Route path="/mitarbeiter" element={<EmployeesPage />} /><Route path="/materialien" element={<MaterialsPage />} /><Route path="/standardpositionen" element={<StandardPositionsPage />} /><Route path="/kostenvoranschlaege" element={<QuotesPage />} /><Route path="/auftraege" element={<OrdersPage />} /><Route path="/rechnungen" element={<InvoicesPage />} /><Route path="/zeiterfassung" element={<TimeTrackingPage />} /><Route path="/lager" element={<StockPage />} /><Route path="/berichte" element={<ReportsPage />} /><Route path="/einstellungen" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense><ToastViewport /></AppShell>;
}
