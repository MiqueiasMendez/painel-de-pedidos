import { useState, useEffect, useCallback, useRef } from 'react';
import { indexedDBService, SyncQueueEntry } from '../services/cache/indexedDBService';

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSync: number;
  lastSyncAttempt?: Date;
  lastSuccessfulSync?: Date;
  syncErrors: string[];
}

export interface OfflineSyncHook {
  status: OfflineSyncStatus;
  queueForSync: (method: string, url: string, data?: any) => Promise<string>;
  forceSyncNow: () => Promise<void>;
  clearSyncQueue: () => Promise<void>;
  retryFailedSync: (entryId: string) => Promise<void>;
}

export function useOfflineSync(): OfflineSyncHook {
  const [status, setStatus] = useState<OfflineSyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingSync: 0,
    syncErrors: []
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // Atualizar status de conexão
  useEffect(() => {
    const updateOnlineStatus = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine
      }));

      // Se voltou online, tentar sincronizar
      if (navigator.onLine && !isSyncingRef.current) {
        triggerSync();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Inicializar IndexedDB e contagem de pending sync
  useEffect(() => {
    initializeSync();
  }, []);
  // Configurar sync automático quando online
  useEffect(() => {
    if (status.isOnline && status.pendingSync > 0 && !isSyncingRef.current) {
      // Sync imediato quando volta online
      triggerSync();

      // SYNC PERIÓDICO DESABILITADO - gerenciador único controla isso
      // Configurar sync periódico
      // if (!syncIntervalRef.current) {
      //   syncIntervalRef.current = setInterval(() => {
      //     if (status.isOnline && status.pendingSync > 0 && !isSyncingRef.current) {
      //       triggerSync();
      //     }
      //   }, 30000); // Tentar sync a cada 30 segundos
      // }
    } else if (!status.isOnline || status.pendingSync === 0) {
      // Limpar interval quando offline ou sem pending syncs
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [status.isOnline, status.pendingSync, status.isSyncing]);

  const initializeSync = async () => {
    try {
      await indexedDBService.init();
      await updatePendingCount();
    } catch (error) {
      console.error('Erro ao inicializar sync offline:', error);
    }
  };

  const updatePendingCount = async () => {
    try {
      const queue = await indexedDBService.getSyncQueue();
      setStatus(prev => ({
        ...prev,
        pendingSync: queue.length
      }));
    } catch (error) {
      console.error('Erro ao atualizar contagem de pending sync:', error);
    }
  };

  const queueForSync = useCallback(async (
    method: string,
    url: string,
    data?: any
  ): Promise<string> => {
    try {
      const syncId = await indexedDBService.addToSyncQueue(method, url, data);
      await updatePendingCount();
      
      // Se online, tentar sync imediato
      if (status.isOnline && !isSyncingRef.current) {
        triggerSync();
      }
      
      return syncId;
    } catch (error) {
      console.error('Erro ao adicionar à fila de sync:', error);
      throw error;
    }
  }, [status.isOnline]);

  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current || !status.isOnline) {
      return;
    }

    isSyncingRef.current = true;
    setStatus(prev => ({
      ...prev,
      isSyncing: true,
      lastSyncAttempt: new Date(),
      syncErrors: []
    }));

    try {
      const queue = await indexedDBService.getSyncQueue();
      const errors: string[] = [];
      let successCount = 0;

      for (const entry of queue) {
        try {
          await processSyncEntry(entry);
          await indexedDBService.removeSyncEntry(entry.id);
          successCount++;
        } catch (error) {
          console.error(`Erro ao sincronizar entrada ${entry.id}:`, error);
          
          // Incrementar retry count
          entry.retryCount++;
          
          if (entry.retryCount >= entry.maxRetries) {
            // Remover da fila se excedeu max retries
            await indexedDBService.removeSyncEntry(entry.id);
            errors.push(`Falha permanente: ${entry.method} ${entry.url}`);
          } else {
            // Atualizar entry com novo retry count
            await indexedDBService.updateSyncEntry(entry);
            errors.push(`Tentativa ${entry.retryCount}/${entry.maxRetries}: ${entry.method} ${entry.url}`);
          }
        }
      }

      const finalStatus: Partial<OfflineSyncStatus> = {
        isSyncing: false,
        syncErrors: errors
      };

      if (successCount > 0) {
        finalStatus.lastSuccessfulSync = new Date();
      }

      setStatus(prev => ({
        ...prev,
        ...finalStatus
      }));

      await updatePendingCount();

    } catch (error) {
      console.error('Erro durante sincronização:', error);
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: [`Erro geral de sincronização: ${error}`]
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [status.isOnline]);

  const processSyncEntry = async (entry: SyncQueueEntry): Promise<void> => {
    const options: RequestInit = {
      method: entry.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (entry.data) {
      options.body = JSON.stringify(entry.data);
    }

    const response = await fetch(entry.url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Aqui você pode processar a resposta se necessário
    return response.json();
  };

  const forceSyncNow = useCallback(async (): Promise<void> => {
    await triggerSync();
  }, [triggerSync]);

  const clearSyncQueue = useCallback(async (): Promise<void> => {
    try {
      const queue = await indexedDBService.getSyncQueue();
      for (const entry of queue) {
        await indexedDBService.removeSyncEntry(entry.id);
      }
      await updatePendingCount();
      setStatus(prev => ({
        ...prev,
        syncErrors: []
      }));
    } catch (error) {
      console.error('Erro ao limpar fila de sync:', error);
      throw error;
    }
  }, []);

  const retryFailedSync = useCallback(async (entryId: string): Promise<void> => {
    try {
      const queue = await indexedDBService.getSyncQueue();
      const entry = queue.find(e => e.id === entryId);
      
      if (entry) {
        entry.retryCount = 0; // Reset retry count
        await indexedDBService.updateSyncEntry(entry);
        
        if (status.isOnline) {
          await triggerSync();
        }
      }
    } catch (error) {
      console.error('Erro ao retentar sync:', error);
      throw error;
    }
  }, [status.isOnline, triggerSync]);

  return {
    status,
    queueForSync,
    forceSyncNow,
    clearSyncQueue,
    retryFailedSync
  };
}
