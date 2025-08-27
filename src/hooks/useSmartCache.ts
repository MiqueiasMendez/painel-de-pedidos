import { useState, useEffect, useCallback } from 'react';
import { indexedDBService, CacheEntry } from '../services/cache/indexedDBService';

export interface SmartCacheConfig {
  ttl?: number; // Time to live em milliseconds
  staleWhileRevalidate?: boolean; // Retornar cache stale enquanto busca dados frescos
  maxAge?: number; // Idade máxima antes de considerar stale
  forceNetwork?: boolean; // Forçar busca da rede
}

export interface SmartCacheStatus {
  isLoading: boolean;
  isFromCache: boolean;
  isStale: boolean;
  lastFetch?: Date;
  error?: string;
  cacheSize: number;
}

export interface SmartCacheHook<T> {
  data: T | null;
  status: SmartCacheStatus;
  refetch: () => Promise<void>;
  clearCache: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

export function useSmartCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: SmartCacheConfig = {}
): SmartCacheHook<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<SmartCacheStatus>({
    isLoading: false,
    isFromCache: false,
    isStale: false,
    cacheSize: 0
  });

  const {
    ttl = 5 * 60 * 1000, // 5 minutos por padrão
    staleWhileRevalidate = true,
    maxAge = 30 * 60 * 1000, // 30 minutos por padrão
    forceNetwork = false
  } = config;

  useEffect(() => {
    initializeCache();
  }, [key]);

  const initializeCache = async () => {
    try {
      await indexedDBService.init();
      await updateCacheStats();
      
      if (!forceNetwork) {
        await loadFromCache();
      } else {
        await fetchFreshData();
      }
    } catch (error) {
      console.error('Erro ao inicializar cache:', error);
      setStatus(prev => ({
        ...prev,
        error: `Erro de inicialização: ${error}`
      }));
    }
  };

  const updateCacheStats = async () => {
    try {
      const stats = await indexedDBService.getCacheStats();
      setStatus(prev => ({
        ...prev,
        cacheSize: stats.cacheEntries
      }));
    } catch (error) {
      console.error('Erro ao atualizar stats do cache:', error);
    }
  };

  const loadFromCache = async () => {
    try {
      const cacheEntry = await indexedDBService.getCache(key);
      
      if (cacheEntry) {
        const age = Date.now() - cacheEntry.timestamp;
        const isStale = age > ttl;
        const isTooOld = age > maxAge;

        if (!isTooOld) {
          setData(cacheEntry.data);
          setStatus(prev => ({
            ...prev,
            isFromCache: true,
            isStale,
            lastFetch: new Date(cacheEntry.timestamp)
          }));

          // Se stale e staleWhileRevalidate ativo, buscar dados frescos em background
          if (isStale && staleWhileRevalidate && navigator.onLine) {
            fetchFreshDataInBackground();
          }
          return;
        }
      }

      // Se não tem cache válido, buscar dados frescos
      await fetchFreshData();
    } catch (error) {
      console.error('Erro ao carregar do cache:', error);
      await fetchFreshData();
    }
  };

  const fetchFreshData = async () => {
    setStatus(prev => ({
      ...prev,
      isLoading: true,
      error: undefined
    }));

    try {
      const freshData = await fetcher();
      
      // Salvar no cache
      await indexedDBService.setCache(
        key,
        key, // URL pode ser o mesmo que a key
        freshData,
        ttl
      );

      setData(freshData);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        isFromCache: false,
        isStale: false,
        lastFetch: new Date(),
        error: undefined
      }));

      await updateCacheStats();
    } catch (error) {
      console.error('Erro ao buscar dados frescos:', error);
      
      // Se falhou e não temos dados, tentar cache mesmo se stale
      if (!data) {
        await loadStaleFromCache();
      }

      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: `Erro de rede: ${error}`
      }));
    }
  };

  const fetchFreshDataInBackground = async () => {
    try {
      const freshData = await fetcher();
      
      // Salvar no cache
      await indexedDBService.setCache(
        key,
        key,
        freshData,
        ttl
      );

      // Atualizar dados se ainda são relevantes
      setData(freshData);
      setStatus(prev => ({
        ...prev,
        isFromCache: false,
        isStale: false,
        lastFetch: new Date()
      }));

      await updateCacheStats();
    } catch (error) {
      console.error('Erro ao buscar dados em background:', error);
      // Não alterar status em caso de erro em background
    }
  };

  const loadStaleFromCache = async () => {
    try {
      const cacheEntry = await indexedDBService.getCache(key);
      
      if (cacheEntry) {
        setData(cacheEntry.data);
        setStatus(prev => ({
          ...prev,
          isFromCache: true,
          isStale: true,
          lastFetch: new Date(cacheEntry.timestamp)
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar cache stale:', error);
    }
  };

  const refetch = useCallback(async () => {
    await fetchFreshData();
  }, [key, fetcher]);

  const clearCache = useCallback(async () => {
    try {
      await indexedDBService.deleteCache(key);
      setData(null);
      setStatus(prev => ({
        ...prev,
        isFromCache: false,
        isStale: false,
        lastFetch: undefined
      }));
      await updateCacheStats();
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      setStatus(prev => ({
        ...prev,
        error: `Erro ao limpar cache: ${error}`
      }));
    }
  }, [key]);

  const forceRefresh = useCallback(async () => {
    await clearCache();
    await fetchFreshData();
  }, [clearCache, fetchFreshData]);

  return {
    data,
    status,
    refetch,
    clearCache,
    forceRefresh
  };
}

// Utilitários para gerenciamento global do cache
export const cacheUtils = {
  async clearAllCache(): Promise<void> {
    try {
      await indexedDBService.clearAllData();
    } catch (error) {
      console.error('Erro ao limpar todo o cache:', error);
      throw error;
    }
  },

  async cleanupExpiredCache(): Promise<number> {
    try {
      return await indexedDBService.clearExpiredCache();
    } catch (error) {
      console.error('Erro ao limpar cache expirado:', error);
      return 0;
    }
  },

  async getCacheStats() {
    try {
      return await indexedDBService.getCacheStats();
    } catch (error) {
      console.error('Erro ao obter stats do cache:', error);
      return {
        cacheEntries: 0,
        syncQueueEntries: 0,
        totalSize: 0
      };
    }
  },

  async preloadCache(key: string, data: any, ttl?: number): Promise<void> {
    try {
      await indexedDBService.setCache(key, key, data, ttl);
    } catch (error) {
      console.error('Erro ao precarregar cache:', error);
      throw error;
    }
  }
};
