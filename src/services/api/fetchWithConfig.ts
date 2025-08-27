/**
 * @fileoverview Funções de fetch com as configurações da API
 * @module services/api/fetchWithConfig
 */

import { API_CONFIG } from '../../config/api.config';

/**
 * Interface para opções de fetch
 */
interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: HeadersInit;
}

/**
 * Faz requisição HTTP com timeout e retry baseado nas configurações
 * @param url URL da requisição
 * @param options Opções do fetch
 * @returns Promise com a resposta
 */
export async function fetchWithConfig(url: string, options: FetchOptions = {}): Promise<Response> {
  // Valores padrão das opções
  const timeout = options.timeout || API_CONFIG.TIMEOUT;
  const maxRetries = options.retries || API_CONFIG.MAX_RETRIES;
  const retryDelay = options.retryDelay || API_CONFIG.RETRY_DELAY;
  
  // Configurar headers padrão
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Configurar AbortController para timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Configurar sinal
  const signal = options.signal || controller.signal;
  
  // Tentativas de requisição
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0 && API_CONFIG.DEBUG) {
        console.log(`🔄 Tentativa ${attempt} para ${url}`);
      }
      
      // Fazer requisição
      const response = await fetch(url, {
        ...options,
        headers,
        signal,
      });
      
      // Limpar timeout
      clearTimeout(timeoutId);
      
      // Verificar se a resposta é ok
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Se for a última tentativa, propagar o erro
      if (attempt === maxRetries) {
        if (API_CONFIG.DEBUG) {
          console.error(`❌ Todas as ${maxRetries} tentativas falharam para ${url}`);
        }
        break;
      }
      
      // Se for timeout ou aborto, não tentar novamente
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (API_CONFIG.DEBUG) {
          console.error(`⏱️ Timeout excedido (${timeout}ms) para ${url}`);
        }
        break;
      }
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // Limpar timeout se chegou aqui
  clearTimeout(timeoutId);
  
  // Propagar o último erro
  throw lastError || new Error(`Falha após ${maxRetries} tentativas`);
}

/**
 * Wrapper para POST com JSON
 * @param url URL da requisição
 * @param data Dados para enviar
 * @param options Opções adicionais
 * @returns Promise com a resposta
 */
export async function postJSON<T = any>(url: string, data: any, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithConfig(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });
  
  return await response.json();
}

/**
 * Wrapper para GET
 * @param url URL da requisição
 * @param options Opções adicionais
 * @returns Promise com a resposta
 */
export async function getJSON<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithConfig(url, {
    method: 'GET',
    ...options,
  });
  
  return await response.json();
}
