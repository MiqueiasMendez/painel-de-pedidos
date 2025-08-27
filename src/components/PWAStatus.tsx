import React, { useState, useEffect } from 'react';
import { useServiceWorker, useServiceWorkerEvents } from '../hooks/useServiceWorker';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { cacheUtils } from '../hooks/useSmartCache';

interface PWAStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const PWAStatus: React.FC<PWAStatusProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const serviceWorker = useServiceWorker();
  const offlineSync = useOfflineSync();
  const swEvents = useServiceWorkerEvents();
  
  const [cacheStats, setCacheStats] = useState({
    cacheEntries: 0,
    syncQueueEntries: 0,
    totalSize: 0
  });
  
  const [showDetailsPanel, setShowDetailsPanel] = useState(showDetails);
  useEffect(() => {
    loadCacheStats();
    // INTERVAL DESABILITADO - stats atualizadas apenas sob demanda
    // const interval = setInterval(loadCacheStats, 30000); // Atualizar a cada 30s
    // return () => clearInterval(interval);
  }, []);

  const loadCacheStats = async () => {
    try {
      const stats = await cacheUtils.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Erro ao carregar stats do cache:', error);
    }
  };

  const handleClearCache = async () => {
    try {
      await Promise.all([
        serviceWorker.clearCache(),
        cacheUtils.clearAllCache()
      ]);
      await loadCacheStats();
      alert('Cache limpo com sucesso!');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      alert('Erro ao limpar cache');
    }
  };

  const handleForcSync = async () => {
    try {
      await offlineSync.forceSyncNow();
      alert('Sincronização forçada com sucesso!');
    } catch (error) {
      console.error('Erro ao forçar sincronização:', error);
      alert('Erro ao forçar sincronização');
    }
  };

  const handleUpdateApp = async () => {
    try {
      await serviceWorker.updateServiceWorker();
    } catch (error) {
      console.error('Erro ao atualizar app:', error);
      alert('Erro ao atualizar aplicação');
    }
  };

  const getConnectionStatus = () => {
    // Verificar se estamos usando dados mockados (demo)
    const usingDemoData = window.location.search.includes('demo=true') || 
                         localStorage.getItem('usingDemoData') === 'true';
    
    if (usingDemoData) {
      return { status: 'demo', color: 'purple', text: 'Demonstração' };
    }
    
    if (!offlineSync.status.isOnline) {
      return { status: 'offline', color: 'red', text: 'Offline' };
    }
    
    if (swEvents.isApiUnavailable) {
      return { status: 'api-down', color: 'orange', text: 'API Indisponível' };
    }
    
    if (swEvents.isUsingCache) {
      return { status: 'cached', color: 'yellow', text: 'Usando Cache' };
    }
    
    return { status: 'online', color: 'green', text: 'Online' };
  };

  const connectionStatus = getConnectionStatus();

  const formatDate = (date?: Date) => {
    if (!date) return 'Nunca';
    return date.toLocaleTimeString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`pwa-status ${className}`}>
      {/* Status compacto sempre visível */}
      <div 
        className="pwa-status-compact"
        onClick={() => setShowDetailsPanel(!showDetailsPanel)}
        style={{
          cursor: 'pointer',
          padding: '8px 12px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px'
        }}
      >
        {/* Indicador de conexão */}
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: connectionStatus.color,
            flexShrink: 0
          }}
        />
        
        <span>{connectionStatus.text}</span>
        
        {/* Badges de status */}
        {serviceWorker.status.hasUpdate && (
          <span 
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '11px'
            }}
          >
            Atualização
          </span>
        )}
        
        {offlineSync.status.pendingSync > 0 && (
          <span 
            style={{
              backgroundColor: '#ffc107',
              color: 'black',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '11px'
            }}
          >
            {offlineSync.status.pendingSync} pendente(s)
          </span>
        )}
        
        {offlineSync.status.isSyncing && (
          <span 
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '11px'
            }}
          >
            Sincronizando...
          </span>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '12px' }}>
          {showDetailsPanel ? '▼' : '▶'}
        </span>
      </div>

      {/* Painel de detalhes */}
      {showDetailsPanel && (
        <div 
          className="pwa-status-details"
          style={{
            marginTop: '8px',
            padding: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '13px'
          }}
        >
          {/* Service Worker Status */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Service Worker
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <span>Suportado:</span>
              <span>{serviceWorker.status.isSupported ? '✅' : '❌'}</span>
              <span>Registrado:</span>
              <span>{serviceWorker.status.isRegistered ? '✅' : '❌'}</span>
              <span>Ativo:</span>
              <span>{serviceWorker.status.isActive ? '✅' : '❌'}</span>
              <span>Instalando:</span>
              <span>{serviceWorker.status.isInstalling ? '🔄' : '✅'}</span>
            </div>
          </div>

          {/* Connection Status */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Conectividade
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <span>Status:</span>
              <span>{connectionStatus.text}</span>
              <span>Última API fresh:</span>
              <span>{formatDate(swEvents.lastApiRefresh)}</span>
              <span>Último cache usado:</span>
              <span>{formatDate(swEvents.lastCacheUsed)}</span>
              <span>Última indisponibilidade:</span>
              <span>{formatDate(swEvents.lastApiUnavailable)}</span>
            </div>
          </div>

          {/* Sync Status */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Sincronização
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <span>Pendentes:</span>
              <span>{offlineSync.status.pendingSync}</span>
              <span>Última tentativa:</span>
              <span>{formatDate(offlineSync.status.lastSyncAttempt)}</span>
              <span>Último sucesso:</span>
              <span>{formatDate(offlineSync.status.lastSuccessfulSync)}</span>
              <span>Erros:</span>
              <span>{offlineSync.status.syncErrors.length}</span>
            </div>
          </div>

          {/* Cache Stats */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Cache
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <span>Entradas de cache:</span>
              <span>{cacheStats.cacheEntries}</span>
              <span>Fila de sync:</span>
              <span>{cacheStats.syncQueueEntries}</span>
              <span>Total:</span>
              <span>{cacheStats.totalSize}</span>
            </div>
          </div>

          {/* Errors */}
          {offlineSync.status.syncErrors.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#dc3545' }}>
                Erros de Sincronização
              </h4>
              <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                {offlineSync.status.syncErrors.map((error, index) => (
                  <div key={index} style={{ color: '#dc3545', fontSize: '12px' }}>
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {serviceWorker.status.hasUpdate && (
              <button
                onClick={handleUpdateApp}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Atualizar App
              </button>
            )}
            
            <button
              onClick={handleClearCache}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Limpar Cache
            </button>
            
            {offlineSync.status.pendingSync > 0 && (
              <button
                onClick={handleForcSync}
                disabled={offlineSync.status.isSyncing}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: offlineSync.status.isSyncing ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: offlineSync.status.isSyncing ? 'not-allowed' : 'pointer'
                }}
              >
                {offlineSync.status.isSyncing ? 'Sincronizando...' : 'Forçar Sync'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
