/**
 * @fileoverview Verificação de saúde da API
 * @module services/api/client/health
 */

import { API_CONFIG } from '../config';
import { fetchWithConfig } from './fetch';

/**
 * Interface para o resultado da verificação de saúde
 */
export interface HealthCheckResult {
  isHealthy: boolean;
  pingTime: number;
  error?: string;
}

/**
 * Verifica a saúde da API com timeout reduzido
 * @returns Promise com o resultado da verificação
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const startTime = Date.now();
    
    // Extrair a URL base para o health check
    const baseUrl = API_CONFIG.BASE_URL.split('/api')[0];
    
    // Tentar múltiplos endpoints para health check
    const endpoints = [
      `${baseUrl}/health`,
      `${baseUrl}/api/health`,
      `${baseUrl}/api/status`,
      `${baseUrl}/status`
    ];
    
    console.log(`🏥 Verificando saúde da API: tentando ${endpoints.length} endpoints`);
    
    // Tentar cada endpoint
    for (const endpoint of endpoints) {
      try {
        // Usar um timeout menor para health check
        const response = await fetchWithConfig(endpoint, {
          method: 'GET',
          timeout: 5000, // 5 segundos - mais curto que o normal
          retries: 1, // Apenas 1 retry para ser mais rápido
        });
        
        const pingTime = Date.now() - startTime;
        console.log(`🏥 Health check: API respondeu em ${pingTime}ms via ${endpoint}`);
        
        // Se encontrou um endpoint que funciona, retornar sucesso
        if (response.ok) {
          return true;
        }
      } catch (endpointError) {
        console.log(`⚠️ Endpoint ${endpoint} falhou`);
        // Continuar tentando próximo endpoint
      }
    }
    
    // Última tentativa: tentar acessar a raiz
    try {
      const response = await fetchWithConfig(baseUrl, {
        method: 'GET',
        timeout: 5000,
        retries: 1,
      });
      
      const pingTime = Date.now() - startTime;
      console.log(`🏥 Health check na raiz: API respondeu em ${pingTime}ms`);
      
      return response.ok;
    } catch (rootError) {
      console.warn('🏥 Health check: API não está respondendo em nenhum endpoint');
      return false;
    }
  } catch (error) {
    console.warn('🏥 Health check: API não está respondendo');
    return false;
  }
}

/**
 * Verifica a saúde da API com mais detalhes
 * @returns Promise com resultado detalhado
 */
export async function checkApiHealthDetailed(): Promise<HealthCheckResult> {
  try {
    const startTime = Date.now();
    
    // Extrair a URL base para o health check
    const baseUrl = API_CONFIG.BASE_URL.split('/api')[0];
    
    // Tentar múltiplos endpoints para health check
    const endpoints = [
      `${baseUrl}/health`,
      `${baseUrl}/api/health`,
      `${baseUrl}/api/status`,
      `${baseUrl}/status`
    ];
    
    // Tentar cada endpoint
    for (const endpoint of endpoints) {
      try {
        // Usar um timeout menor para health check
        const response = await fetchWithConfig(endpoint, {
          method: 'GET',
          timeout: 5000, // 5 segundos
          retries: 1, // Apenas 1 retry
        });
        
        const pingTime = Date.now() - startTime;
        
        if (response.ok) {
          return {
            isHealthy: true,
            pingTime
          };
        }
      } catch (endpointError) {
        // Continuar tentando próximo endpoint
      }
    }
    
    // Se nenhum endpoint funcionou
    return {
      isHealthy: false,
      pingTime: 0,
      error: 'Nenhum endpoint de health check está respondendo'
    };
  } catch (error) {
    return {
      isHealthy: false,
      pingTime: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}