import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ToastViewport() {
  const { toasts } = useApp();
  return <div className="toast-viewport" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`toast toast--${toast.tone}`}>{toast.tone === 'success' ? <CheckCircle2 size={19} /> : toast.tone === 'danger' ? <AlertCircle size={19} /> : <Info size={19} />}<span>{toast.message}</span><X size={16} /></div>)}</div>;
}
