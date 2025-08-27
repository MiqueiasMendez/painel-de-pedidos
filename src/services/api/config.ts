/**
 * @fileoverview Configurações da API
 * @module services/api/config
 */

// Configuração centralizada da API
export const API_CONFIG = {
  // URL da API
  BASE_URL: 'https://mercado-api-9sw5.onrender.com/api',
  
  // Timeouts
  TIMEOUT: 15000, // 15 segundos (API no Render demora pra acordar)
  
  // Intervals de sincronização
  SYNC_INTERVAL: 60 * 1000, // 1 minuto
  HEALTH_CHECK_INTERVAL: 2 * 60 * 1000, // 2 minutos
  
  // Retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 segundos
  
  // Cache
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
  
  // Debug
  DEBUG: true
};