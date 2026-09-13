import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppData } from '../types/models';
import { createDemoData } from './demoData';
import { APP_DATA_VERSION, normalizeAppData } from './migrations';

type CollectionName = Exclude<keyof AppData, 'settings'>;

interface ErpDatabase extends DBSchema {
  collections: { key: CollectionName; value: { key: CollectionName; value: AppData[CollectionName] } };
  settings: { key: 'company'; value: AppData['settings'] };
  meta: { key: string; value: string | number | boolean };
}

let databasePromise: Promise<IDBPDatabase<ErpDatabase>> | null = null;

function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDB<ErpDatabase>('mueller-haustechnik-erp', 1, {
      upgrade(database) {
        database.createObjectStore('collections', { keyPath: 'key' });
        database.createObjectStore('settings');
        database.createObjectStore('meta');
      },
    });
  }
  return databasePromise;
}

async function writeAll(data: AppData): Promise<void> {
  const database = await getDatabase();
  const transaction = database.transaction(['collections', 'settings', 'meta'], 'readwrite');
  const collections = transaction.objectStore('collections');
  const keys: CollectionName[] = [
    'customers', 'employees', 'quotes', 'orders', 'invoices', 'materials',
    'stockMovements', 'standardPositions', 'timeEntries', 'activities',
  ];
  await Promise.all(keys.map((key) => collections.put({ key, value: data[key] } as never)));
  await transaction.objectStore('settings').put(data.settings, 'company');
  await transaction.objectStore('meta').put(true, 'seeded');
  await transaction.objectStore('meta').put(APP_DATA_VERSION, 'dataVersion');
  await transaction.done;
}

export const databaseService = {
  async initialize(): Promise<void> {
    const database = await getDatabase();
    const seeded = await database.get('meta', 'seeded');
    if (!seeded) await writeAll(createDemoData());
  },

  async load(): Promise<AppData> {
    await this.initialize();
    const database = await getDatabase();
    const keys: CollectionName[] = [
      'customers', 'employees', 'quotes', 'orders', 'invoices', 'materials',
      'stockMovements', 'standardPositions', 'timeEntries', 'activities',
    ];
    const values = await Promise.all(keys.map((key) => database.get('collections', key)));
    const settings = await database.get('settings', 'company');
    const data = { ...Object.fromEntries(values.map((entry, index) => [keys[index], entry?.value ?? []])), settings } as AppData;
    const version = await database.get('meta', 'dataVersion');
    const normalized = normalizeAppData(data);
    if (version !== APP_DATA_VERSION) await writeAll(normalized);
    return normalized;
  },

  async saveCollection<K extends CollectionName>(key: K, value: AppData[K]): Promise<void> {
    const database = await getDatabase();
    await database.put('collections', { key, value } as never);
  },

  async saveSettings(settings: AppData['settings']): Promise<void> {
    const database = await getDatabase();
    await database.put('settings', settings, 'company');
  },

  async reset(): Promise<AppData> {
    const data = createDemoData();
    await writeAll(data);
    return data;
  },
};
