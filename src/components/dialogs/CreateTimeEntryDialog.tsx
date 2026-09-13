import { useState, type FormEvent } from 'react';
import { Clock3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { currentIsoDate } from '../../utils/date';

export function CreateTimeEntryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, createTimeEntry } = useApp();
  const [saving, setSaving] = useState(false);
  if (!data) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    await createTimeEntry({
      employeeId: String(form.get('employeeId')), orderId: String(form.get('orderId')),
      date: String(form.get('date')), hours: Number(form.get('hours')),
      description: String(form.get('description')), billable: form.get('billable') === 'on',
    });
    setSaving(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Arbeitszeit erfassen" description="Erfassen Sie Arbeitszeit direkt auf einen laufenden Auftrag.">
      <form className="form-grid" onSubmit={submit}>
        <label className="field"><span>Mitarbeiter</span><select name="employeeId" required>{data.employees.filter((employee) => employee.active).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="field"><span>Auftrag</span><select name="orderId" required>{data.orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).map((order) => <option key={order.id} value={order.id}>{order.number} · {order.title}</option>)}</select></label>
        <label className="field"><span>Datum</span><input name="date" type="date" required defaultValue={currentIsoDate()} /></label>
        <label className="field"><span>Stunden</span><input name="hours" type="number" min="0.25" max="24" step="0.25" defaultValue="2" required /></label>
        <label className="field field--full"><span>Tätigkeit</span><textarea name="description" required rows={3} defaultValue="Service- und Montagearbeiten" /></label>
        <label className="check-field field--full"><input type="checkbox" name="billable" defaultChecked /><span>Arbeitszeit ist verrechenbar</span></label>
        <div className="form-actions field--full"><Button type="button" variant="secondary" onClick={onClose}>Abbrechen</Button><Button type="submit" icon={Clock3} disabled={saving}>{saving ? 'Wird gespeichert …' : 'Zeit speichern'}</Button></div>
      </form>
    </Modal>
  );
}
