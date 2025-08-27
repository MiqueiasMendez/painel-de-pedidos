// IndexedDB Service para cache persistente
export interface CacheEntry {
  id: string;
  url: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
  version: number;
}

export interface SyncQueueEntry {
  id: string;
  method: string;
  url: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class IndexedDBService {
  private dbName = 'PainelPedidosCache';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para cache de dados
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'id' });
          cacheStore.createIndex('url', 'url', { unique: false });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para fila de sincronização
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para configurações
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // Cache Operations
  async setCache(id: string, url: string, data: any, ttl?: number): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    const entry: CacheEntry = {
      id,
      url,
      data,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
      version: 1
    };

    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache(id: string): Promise<CacheEntry | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry;
        
        // Verificar se o cache expirou
        if (entry && entry.expiresAt && entry.expiresAt < Date.now()) {
          this.deleteCache(id);
          resolve(null);
          return;
        }
        
        resolve(entry || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheByUrl(url: string): Promise<CacheEntry | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    const index = store.index('url');

    return new Promise((resolve, reject) => {
      const request = index.get(url);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry;
        
        // Verificar se o cache expirou
        if (entry && entry.expiresAt && entry.expiresAt < Date.now()) {
          this.deleteCache(entry.id);
          resolve(null);
          return;
        }
        
        resolve(entry || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCache(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<number> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    const index = store.index('timestamp');

    const now = Date.now();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const request = index.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          if (entry.expiresAt && entry.expiresAt < now) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Queue Operations
  async addToSyncQueue(
    method: string,
    url: string,
    data?: any,
    maxRetries: number = 3
  ): Promise<string> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entry: SyncQueueEntry = {
      id,
      method,
      url,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries
    };

    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueEntry[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncEntry(entry: SyncQueueEntry): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncEntry(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Settings Operations
  async setSetting(key: string, value: any): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSetting(key: string): Promise<any> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  // Cleanup and maintenance
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cache', 'syncQueue', 'settings'], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('cache').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('syncQueue').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('settings').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
  }

  async getCacheStats(): Promise<{
    cacheEntries: number;
    syncQueueEntries: number;
    totalSize: number;
  }> {
    const db = await this.ensureDB();
    
    const cacheCount = await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readonly');
      const request = transaction.objectStore('cache').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const syncCount = await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const request = transaction.objectStore('syncQueue').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return {
      cacheEntries: cacheCount,
      syncQueueEntries: syncCount,
      totalSize: cacheCount + syncCount
    };
  }
}

export const indexedDBService = new IndexedDBService();
