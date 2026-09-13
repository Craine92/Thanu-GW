import type { AppData, CompanySettings } from '../types/models';
import { databaseService } from './database';

type CollectionName = Exclude<keyof AppData, 'settings'>;

function createRepository<K extends CollectionName>(key: K) {
  return {
    async getAll(): Promise<AppData[K]> {
      return (await databaseService.load())[key];
    },
    async saveAll(items: AppData[K]): Promise<void> {
      await databaseService.saveCollection(key, items);
    },
  };
}

export const customerRepository = createRepository('customers');
export const employeeRepository = createRepository('employees');
export const quoteRepository = createRepository('quotes');
export const orderRepository = createRepository('orders');
export const invoiceRepository = createRepository('invoices');
export const materialRepository = createRepository('materials');
export const stockMovementRepository = createRepository('stockMovements');
export const standardPositionRepository = createRepository('standardPositions');
export const timeEntryRepository = createRepository('timeEntries');
export const activityRepository = createRepository('activities');

export const settingsRepository = {
  async get(): Promise<CompanySettings> {
    return (await databaseService.load()).settings;
  },
  async save(settings: CompanySettings): Promise<void> {
    await databaseService.saveSettings(settings);
  },
};
