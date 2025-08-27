import { useState, useEffect, useCallback } from 'react';

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isActive: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
  error?: string;
}

export interface ServiceWorkerMessage {
  type: string;
  data: any;
}

export interface ServiceWorkerHook {
  status: ServiceWorkerStatus;
  updateServiceWorker: () => Promise<void>;
  unregisterServiceWorker: () => Promise<void>;
  sendMessage: (type: string, data?: any) => Promise<any>;
  clearCache: () => Promise<void>;
  forceRefresh: (url: string) => Promise<any>;
  getCacheStatus: () => Promise<any>;
}

export function useServiceWorker(): ServiceWorkerHook {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isActive: false,
    hasUpdate: false,
    registration: null
  });

  const [messageHandlers] = useState<Map<string, (data: any) => void>>(new Map());

  useEffect(() => {
    if (!status.isSupported) {
      console.warn('Service Worker não é suportado neste navegador');
      return;
    }

    registerServiceWorker();
  }, [status.isSupported]);

  useEffect(() => {
    // Configurar listener para mensagens do Service Worker
    const handleMessage = (event: MessageEvent) => {
      // Verificar se o evento tem dados e está no formato esperado
      if (!event.data || typeof event.data !== 'object') {
        console.log('[SW] Mensagem recebida em formato inválido:', event);
        return;
      }
      
      try {
        const { type, data } = event.data as ServiceWorkerMessage;
        
        console.log('[SW] Mensagem recebida:', type, data);
        
        // Chamar handler específico se existir
        const handler = messageHandlers.get(type);
        if (handler) {
          handler(data);
        }
  
        // Handlers padrão
        switch (type) {
          case 'api-data-fresh':
            console.log('[SW] Dados frescos da API recebidos - ignorando em favor de chamadas fetch diretas');
            // Não disparamos mais o evento - usando fetch direto agora
            break;
  
          case 'api-data-cached':
            console.log('[SW] Dados do cache utilizados - ignorando em favor de chamadas fetch diretas');
            // Não disparamos mais o evento - usando fetch direto agora
            break;
  
          case 'api-data-unavailable':
            console.log('[SW] Mensagem de indisponibilidade da API recebida - ignorando (fetch cuida disso)');
            // Não disparamos mais o evento - usando fetch direto agora
            break;
            
          default:
            // Mensagens desconhecidas
            console.log('[SW] Mensagem de tipo desconhecido:', type);
        }
      } catch (error) {
        console.error('[SW] Erro ao processar mensagem do Service Worker:', error);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [messageHandlers]);

  const registerServiceWorker = async () => {
    try {
      setStatus(prev => ({ ...prev, isInstalling: true }));

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW] Service Worker registrado:', registration);

      // Configurar listeners para mudanças de estado
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          setStatus(prev => ({ ...prev, isInstalling: true }));

          newWorker.addEventListener('statechange', () => {
            switch (newWorker.state) {
              case 'installed':
                if (navigator.serviceWorker.controller) {
                  setStatus(prev => ({ 
                    ...prev, 
                    hasUpdate: true,
                    isWaiting: true,
                    isInstalling: false 
                  }));
                } else {
                  setStatus(prev => ({ 
                    ...prev, 
                    isActive: true,
                    isInstalling: false 
                  }));
                }
                break;

              case 'activated':
                setStatus(prev => ({ 
                  ...prev, 
                  isActive: true,
                  isWaiting: false,
                  hasUpdate: false 
                }));
                break;
            }
          });
        }
      });

      setStatus(prev => ({
        ...prev,
        isRegistered: true,
        isInstalling: false,
        registration,
        isActive: !!navigator.serviceWorker.controller
      }));

    } catch (error) {
      console.error('[SW] Erro ao registrar Service Worker:', error);
      setStatus(prev => ({
        ...prev,
        isInstalling: false,
        error: `Erro ao registrar: ${error}`
      }));
    }
  };

  const updateServiceWorker = useCallback(async () => {
    if (!status.registration) {
      throw new Error('Service Worker não registrado');
    }

    try {
      const waiting = status.registration.waiting;
      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      } else {
        await status.registration.update();
      }
    } catch (error) {
      console.error('[SW] Erro ao atualizar Service Worker:', error);
      throw error;
    }
  }, [status.registration]);
  const unregisterServiceWorker = useCallback(async () => {
    if (!status.registration) {
      throw new Error('Service Worker não registrado');
    }

    try {
      const result = await status.registration.unregister();
      if (result) {
        setStatus(prev => ({
          ...prev,
          isRegistered: false,
          isActive: false,
          registration: null
        }));
      }
      // Don't return the boolean result to match Promise<void>
    } catch (error) {
      console.error('[SW] Erro ao desregistrar Service Worker:', error);
      throw error;
    }
  }, [status.registration]);

  const sendMessage = useCallback(async (type: string, data?: any): Promise<any> => {
    if (!navigator.serviceWorker.controller) {
      throw new Error('Nenhum Service Worker ativo');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(
          { type, data },
          [messageChannel.port2]
        );
      } else {
        messageChannel.port1.postMessage({ error: 'Service Worker não está ativo' });
      }
    });
  }, []);

  const clearCache = useCallback(async () => {
    try {
      return await sendMessage('CLEAR_CACHE');
    } catch (error) {
      console.error('[SW] Erro ao limpar cache:', error);
      throw error;
    }
  }, [sendMessage]);

  const forceRefresh = useCallback(async (url: string) => {
    try {
      return await sendMessage('FORCE_REFRESH', { url });
    } catch (error) {
      console.error('[SW] Erro ao forçar refresh:', error);
      throw error;
    }
  }, [sendMessage]);

  const getCacheStatus = useCallback(async () => {
    try {
      return await sendMessage('GET_CACHE_STATUS');
    } catch (error) {
      console.error('[SW] Erro ao obter status do cache:', error);
      throw error;
    }
  }, [sendMessage]);

  return {
    status,
    updateServiceWorker,
    unregisterServiceWorker,
    sendMessage,
    clearCache,
    forceRefresh,
    getCacheStatus
  };
}

// Hook para escutar eventos específicos do Service Worker
export function useServiceWorkerEvents() {
  const [events, setEvents] = useState<{
    lastApiRefresh?: Date;
    lastCacheUsed?: Date;
    lastApiUnavailable?: Date;
    isUsingCache: boolean;
    isApiUnavailable: boolean;
  }>({
    isUsingCache: false,
    isApiUnavailable: false
  });

  useEffect(() => {
    const handleApiFresh = (event: CustomEvent) => {
      setEvents(prev => ({
        ...prev,
        lastApiRefresh: new Date(),
        isUsingCache: false,
        isApiUnavailable: false
      }));
    };

    const handleApiCached = (event: CustomEvent) => {
      setEvents(prev => ({
        ...prev,
        lastCacheUsed: new Date(),
        isUsingCache: true,
        isApiUnavailable: false
      }));
    };

    const handleApiUnavailable = (event: CustomEvent) => {
      setEvents(prev => ({
        ...prev,
        lastApiUnavailable: new Date(),
        isUsingCache: false,
        isApiUnavailable: true
      }));
    };

    window.addEventListener('sw-api-fresh', handleApiFresh as EventListener);
    window.addEventListener('sw-api-cached', handleApiCached as EventListener);
    window.addEventListener('sw-api-unavailable', handleApiUnavailable as EventListener);

    return () => {
      window.removeEventListener('sw-api-fresh', handleApiFresh as EventListener);
      window.removeEventListener('sw-api-cached', handleApiCached as EventListener);
      window.removeEventListener('sw-api-unavailable', handleApiUnavailable as EventListener);
    };
  }, []);

  return events;
}
