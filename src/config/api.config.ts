// Configuração centralizada da API - OTIMIZADA PARA UMA CONEXÃO ÚNICA
export const API_CONFIG = {
  // URL da API
  BASE_URL: 'https://mercado-api-9sw5.onrender.com/api',
  
  // Timeouts
  TIMEOUT: 15000, // 15 segundos (API no Render demora pra acordar)
  
  // Intervals de sincronização - AUMENTADOS PARA EVITAR SPAM
  SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutos (não 30 segundos!)
  HEALTH_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutos (não 2 minutos!)
  
  // Retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 segundos
  
  // Cache - AUMENTADO PARA REDUZIR REQUISIÇÕES
  CACHE_DURATION: 15 * 60 * 1000, // 15 minutos (não 10)
  
  // Debug - TEMPORARIAMENTE LIGADO PARA DIAGNÓSTICO
  DEBUG: true // Ativado temporariamente para diagnosticar problema
};