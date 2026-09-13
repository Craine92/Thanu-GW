import type { AppData, CompanySettings } from '../types/models';
import { databaseService } from './database';

type CollectionName = Exclude<keyof AppData, 'settings'>;
type Entity<K extends CollectionName> = AppData[K] extends Array<infer T> ? T : never;

function createRepository<K extends CollectionName>(key: K) {
  return {
    async getAll(): Promise<AppData[K]> {
      return (await databaseService.load())[key];
    },
    async saveAll(items: AppData[K]): Promise<void> {
      await databaseService.saveCollection(key, items);
    },
    async getById(id: string): Promise<Entity<K> | undefined> {
      const items = await this.getAll() as unknown as Entity<K>[];
      return items.find((item) => (item as { id: string }).id === id);
    },
    async save(item: Entity<K>): Promise<void> {
      const items = await this.getAll() as unknown as Entity<K>[];
      const index = items.findIndex((entry) => (entry as { id: string }).id === (item as { id: string }).id);
      const next = index >= 0 ? items.map((entry, itemIndex) => itemIndex === index ? item : entry) : [item, ...items];
      await databaseService.saveCollection(key, next as unknown as AppData[K]);
    },
    async delete(id: string): Promise<void> {
      const items = await this.getAll() as unknown as Entity<K>[];
      await databaseService.saveCollection(key, items.filter((item) => (item as { id: string }).id !== id) as unknown as AppData[K]);
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
