import { useState, type FormEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function CreateCustomerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createCustomer } = useApp();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    await createCustomer({
      name: String(form.get('name')), email: String(form.get('email')), phone: String(form.get('phone')),
      type: form.get('type') as 'company' | 'private',
    });
    setSaving(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Neuen Kunden anlegen" description="Die Adressdaten können Sie später im Kundenprofil ergänzen.">
      <form id="customer-form" className="form-grid" onSubmit={submit}>
        <label className="field field--full"><span>Name / Firma</span><input name="name" required autoFocus placeholder="z. B. Familie Muster" /></label>
        <label className="field"><span>Kundentyp</span><select name="type"><option value="company">Unternehmen</option><option value="private">Privatperson</option></select></label>
        <label className="field"><span>Telefon</span><input name="phone" required placeholder="+41 44 000 00 00" /></label>
        <label className="field field--full"><span>E-Mail</span><input name="email" type="email" required placeholder="kontakt@beispiel.ch" /></label>
        <div className="form-actions field--full"><Button type="button" variant="secondary" onClick={onClose}>Abbrechen</Button><Button type="submit" disabled={saving}>{saving ? 'Wird gespeichert …' : 'Kunde anlegen'}</Button></div>
      </form>
    </Modal>
  );
}
