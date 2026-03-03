import { ClientRecord } from '../types';

const DB_NAME = 'MilleniumDashboardDB';
const DB_VERSION = 3; // Bumped version to force upgrade/reset
const STORE_NAME = 'clients';

export const dbService = {
  openDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // If store exists, delete it to ensure clean slate on upgrade
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  saveClients: async (clients: ClientRecord[]): Promise<void> => {
    const db = await dbService.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear old data first
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // Bulk add inside the same transaction
        let processed = 0;
        if (clients.length === 0) {
            resolve();
            return;
        }
        
        clients.forEach(client => {
          store.put(client);
          processed++;
        });
      };
      
      transaction.oncomplete = () => {
        console.log("Transação de salvamento concluída.");
        resolve();
      };

      transaction.onerror = () => {
        console.error("Erro na transação:", transaction.error);
        reject(transaction.error);
      };
    });
  },

  getAllClients: async (): Promise<ClientRecord[]> => {
    const db = await dbService.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as ClientRecord[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  clearDB: async (): Promise<void> => {
    const db = await dbService.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};