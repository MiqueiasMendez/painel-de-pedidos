/**
 * @fileoverview Componente de status PWA otimizado
 * @module components/PWAStatus
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useApi } from '../hooks/useApi';

interface PWAStatusProps {
  className?: string;
}

export const PWAStatus: React.FC<PWAStatusProps> = ({ className = '' }) => {
  const { status } = useApi();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  useEffect(() => {
    if (status.isOnline && status.lastCheck) {
      setLastSync(status.lastCheck);
    }
  }, [status.isOnline, status.lastCheck]);

  // Se está conectando, mostra loading discreto
  if (status.isConnecting) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 ${className}`}>
        <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />
        <span className="text-gray-600 dark:text-gray-400">Conectando...</span>
      </div>
    );
  }

  // Se está online
  if (status.isOnline) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ${className}`}>
        <Wifi className="w-3 h-3" />
        <span>Online</span>
        {lastSync && (
          <span className="text-green-600 dark:text-green-500">
            • Sincronizado
          </span>
        )}
      </div>
    );
  }

  // Se está offline
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 ${className}`}>
      <WifiOff className="w-3 h-3" />
      <span>Offline</span>
      <span className="text-yellow-600 dark:text-yellow-500">
        • Usando cache local
      </span>
    </div>
  );
};

export default PWAStatus;