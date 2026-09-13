import { databaseService } from '../data/database';
import { activityRepository, customerRepository, timeEntryRepository } from '../data/repositories';
import type { AppData, Customer, TimeEntry } from '../types/models';

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const erpService = {
  load(): Promise<AppData> {
    return databaseService.load();
  },

  reset(): Promise<AppData> {
    return databaseService.reset();
  },

  async createCustomer(data: AppData, input: Pick<Customer, 'name' | 'email' | 'phone' | 'type'>): Promise<AppData> {
    const customer: Customer = {
      ...input,
      id: uid('customer'), number: `KD-${data.settings.numberRanges.nextCustomer}`,
      address: { street: '', postalCode: '', city: 'Zürich', country: 'Schweiz' },
      createdAt: new Date().toISOString(),
    };
    const customers = [customer, ...data.customers];
    const activities = [{ id: uid('activity'), type: 'customer' as const, text: `Neuer Kunde ${customer.name} wurde angelegt.`, date: new Date().toISOString(), entityId: customer.id }, ...data.activities];
    const settings = { ...data.settings, numberRanges: { ...data.settings.numberRanges, nextCustomer: data.settings.numberRanges.nextCustomer + 1 } };
    await Promise.all([customerRepository.saveAll(customers), activityRepository.saveAll(activities), databaseService.saveSettings(settings)]);
    return { ...data, customers, activities, settings };
  },

  async createTimeEntry(data: AppData, input: Omit<TimeEntry, 'id'>): Promise<AppData> {
    const entry: TimeEntry = { ...input, id: uid('time') };
    const employee = data.employees.find((item) => item.id === input.employeeId);
    const order = data.orders.find((item) => item.id === input.orderId);
    const timeEntries = [entry, ...data.timeEntries];
    const activities = [{
      id: uid('activity'), type: 'time' as const,
      text: `${employee?.name ?? 'Mitarbeiter'} hat ${String(input.hours).replace('.', ',')} Stunden auf Auftrag ${order?.number ?? ''} erfasst.`,
      date: new Date().toISOString(), entityId: entry.id,
    }, ...data.activities];
    await Promise.all([timeEntryRepository.saveAll(timeEntries), activityRepository.saveAll(activities)]);
    return { ...data, timeEntries, activities };
  },
};
