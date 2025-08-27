/**
 * @fileoverview Hook otimizado usando gerenciador único de conexão
 * @module hooks/useApi
 */

import { useState, useEffect } from 'react';
import { connectionManager, ConnectionStatus } from '../services/api/connectionManager';

// ==================== INTERFACES ====================
interface ApiStatus {
  isOnline: boolean;
  isConnecting: boolean;
  lastCheck: Date | null;
  retryCount: number;
  error: string | null;
}

interface UseApiReturn {
  status: ApiStatus;
  checkConnection: () => Promise<boolean>;
  retryConnection: () => Promise<void>;
}

// ==================== HOOK ====================
export function useApi(): UseApiReturn {
  const [status, setStatus] = useState<ApiStatus>({
    isOnline: false,
    isConnecting: true,
    lastCheck: null,
    retryCount: 0,
    error: null
  });

  useEffect(() => {
    // Usar o gerenciador único - SEM intervals próprios
    const unsubscribe = connectionManager.subscribe((connectionStatus: ConnectionStatus) => {
      setStatus({
        isOnline: connectionStatus.isOnline,
        isConnecting: false, // Gerenciador já controla isso
        lastCheck: connectionStatus.lastCheck,
        retryCount: connectionStatus.retryCount,
        error: connectionStatus.error
      });
    });

    return unsubscribe;
  }, []);

  // Funções que delegam para o gerenciador único
  const checkConnection = async (): Promise<boolean> => {
    const result = await connectionManager.forceSync();
    return result.success;
  };

  const retryConnection = async (): Promise<void> => {
    await connectionManager.forceSync();
  };

  return {
    status,
    checkConnection,
    retryConnection
  };
}

// Hook para detectar status de rede
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default useApi;