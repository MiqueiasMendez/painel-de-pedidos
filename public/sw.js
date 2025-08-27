// Service Worker para PWA - Painel de Pedidos
const CACHE_NAME = 'painel-pedidos-v1';
const API_CACHE_NAME = 'painel-pedidos-api-v1';
const STATIC_CACHE_NAME = 'painel-pedidos-static-v1';

// Recursos estáticos para cache
const STATIC_RESOURCES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// URLs da API para cache inteligente
const API_URLS = [
  'https://mercado-api-9sw5.onrender.com/api/list-orders',
  'https://mercado-api-9sw5.onrender.com/health'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache de recursos estáticos
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Cacheando recursos estáticos');
        return cache.addAll(STATIC_RESOURCES);
      }),
      // Cache de API (vazio inicialmente)
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('[SW] Inicializando cache da API');
        return cache;
      })
    ]).then(() => {
      console.log('[SW] Service Worker instalado com sucesso');
      return self.skipWaiting();
    })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Limpar caches antigos
          if (cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker ativado');
      return self.clients.claim();
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // DESATIVADO: Deixar o navegador lidar com requisições API diretamente
  // Estratégia para API: Network First com fallback para cache
  // A intercepção de requisições API está desativada para evitar conflitos
  if (false && url.origin === 'https://mercado-api-9sw5.onrender.com') {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Estratégia para recursos estáticos: Cache First
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      request.url.includes('/static/')) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
  
  // Estratégia para navegação: Network First com fallback
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // Outras requisições: Network First
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Manipular requisições da API
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    console.log('[SW] Tentando buscar da rede:', request.url);
    
    // Tentar buscar da rede primeiro (com timeout usando AbortController)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const networkResponse = await fetch(request.clone(), {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (networkResponse.ok) {
        console.log('[SW] Resposta da rede bem-sucedida');
        
        // Cachear a resposta se for bem-sucedida
        const responseClone = networkResponse.clone();
        await cache.put(request, responseClone);
        
        // Notificar que temos dados frescos
        notifyClients('api-data-fresh', {
          url: request.url,
          timestamp: Date.now()
        });
        
        return networkResponse;
      } else {
        throw new Error(`HTTP ${networkResponse.status}`);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.log('[SW] Falha na rede, tentando cache:', error.message);
    
    // Se a rede falhar, tentar o cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Dados encontrados no cache');
      
      // Notificar que estamos usando dados em cache
      notifyClients('api-data-cached', {
        url: request.url,
        timestamp: Date.now(),
        error: error.message
      });
      
      return cachedResponse;
    }
    
    // Se nem cache nem rede funcionarem
    console.log('[SW] Nem rede nem cache disponíveis');
    notifyClients('api-data-unavailable', {
      url: request.url,
      error: error.message
    });
    
    // Retornar dados mock formatados para compatibilidade com API
    return new Response(
      JSON.stringify({
        success: true,
        data: [
          {
            id: 'mock-1',
            customer_name: 'João Silva',
            customerPhone: '11999887766',
            address: 'Rua das Flores, 123',
            items: [
              {
                id: 'item-1',
                name: 'X-Tudo',
                quantity: 2,
                price: 25.90,
                option: 'Lanches',
                _id: 'item-1'
              },
              {
                id: 'item-2',
                name: 'Refrigerante 2L',
                quantity: 1,
                price: 12.00,
                option: 'Bebidas',
                _id: 'item-2'
              }
            ],
            total: 63.80,
            status: 'pending',
            paymentMethod: 'Cartão de Crédito',
            observations: 'Sem cebola, por favor',
            created_at: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _id: 'mock-1'
          },
          {
            id: 'mock-2',
            customer_name: 'Maria Oliveira',
            customerPhone: '11988776655',
            address: 'Av. Paulista, 1000, apto 50',
            items: [
              {
                id: 'item-3',
                name: 'Pizza Grande Calabresa',
                quantity: 1,
                price: 49.90,
                option: 'Pizzas',
                _id: 'item-3'
              }
            ],
            total: 49.90,
            status: 'confirmed',
            paymentMethod: 'Dinheiro',
            observations: 'Trazer troco para R$ 100',
            created_at: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _id: 'mock-2'
          }
        ],
        message: 'Dados mockados para funcionamento offline'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Manipular recursos estáticos
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  // Tentar cache primeiro
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Se não estiver em cache, buscar da rede
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cachear para próximas vezes
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Recurso estático não disponível:', request.url);
    throw error;
  }
}

// Manipular navegação
async function handleNavigationRequest(request) {
  try {
    // Tentar rede primeiro
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Fallback para página principal em cache
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match('/');
    return cachedResponse || new Response('Aplicação offline', { status: 200 });
  }
}

// Notificar clientes sobre eventos
function notifyClients(type, data) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type,
        data
      });
    });
  });
}

// Manipular mensagens dos clientes
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'GET_CACHE_STATUS':
      getCacheStatus().then((status) => {
        event.ports[0].postMessage(status);
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'FORCE_REFRESH':
      forceRefreshCache(data.url).then((result) => {
        event.ports[0].postMessage(result);
      });
      break;
  }
});

// Obter status do cache
async function getCacheStatus() {
  const apiCache = await caches.open(API_CACHE_NAME);
  const staticCache = await caches.open(STATIC_CACHE_NAME);
  
  const apiKeys = await apiCache.keys();
  const staticKeys = await staticCache.keys();
  
  return {
    apiCacheSize: apiKeys.length,
    staticCacheSize: staticKeys.length,
    totalCacheSize: apiKeys.length + staticKeys.length,
    lastUpdate: Date.now()
  };
}

// Limpar todos os caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('[SW] Todos os caches foram limpos');
}

// Forçar atualização do cache
async function forceRefreshCache(url) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    await cache.delete(url);
    
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response.clone());
      return { success: true };
    }
    return { success: false, error: 'Network error' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

console.log('[SW] Service Worker carregado');
