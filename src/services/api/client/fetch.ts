/**
 * @fileoverview Funções de fetch com as configurações da API
 * @module services/api/client/fetch
 */

import { API_CONFIG } from '../config';

/**
 * Interface para opções de fetch
 */
interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: HeadersInit;
  skipErrorLogging?: boolean;
}

/**
 * Determina se estamos em um ambiente de desenvolvimento
 */
const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';

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
  
  // Não logar erros de health check para não encher o console
  const shouldLogErrors = !options.skipErrorLogging;
  
  // Log detalhado para debug de requisição
  if (isDev || API_CONFIG.DEBUG) {
    try {
      console.log(`📡 Requisição para: ${url}`, { 
        method: options.method || 'GET',
        body: options.body ? JSON.parse(options.body as string) : undefined,
        timeout,
        maxRetries
      });
    } catch (e) {
      // Se não conseguir fazer parse do corpo, logar sem ele
      console.log(`📡 Requisição para: ${url}`, { 
        method: options.method || 'GET',
        timeout,
        maxRetries
      });
    }
  }
  
  // Desativamos o proxy CORS por estar causando problemas
  let processedUrl = url;
  
  // Usar proxy alternativo apenas se necessário
  if (false && isDev && url.includes('render.com') && !url.includes('localhost')) {
    // DESATIVADO: Estava causando problemas de CORS
    // processedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    // console.log(`🔀 Usando CORS proxy para URL de produção em ambiente de desenvolvimento: ${processedUrl}`);
  }
  
  // Configurar headers padrão - removendo headers problemáticos para CORS
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*', // Aceitar mais tipos
    // Removidos headers problemáticos:
    // 'Cache-Control': 'no-cache, no-store',
    // 'Pragma': 'no-cache',
    // 'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  };

  // Configurar AbortController para timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    if (shouldLogErrors) {
      console.warn(`⏱️ Timeout excedido (${timeout}ms) para ${url}`);
    }
  }, timeout);
  
  // Configurar sinal
  const signal = options.signal || controller.signal;
  
  // Tentativas de requisição
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0 && shouldLogErrors) {
        console.log(`🔄 Tentativa ${attempt}/${maxRetries} para ${url}`);
      }
      
      // Adicionar parâmetro para evitar cache
      const urlWithNocache = processedUrl.includes('?') 
        ? `${processedUrl}&_nocache=${Date.now()}` 
        : `${processedUrl}?_nocache=${Date.now()}`;
      
      // Limpar opções com propriedades incorretas
      const cleanOptions = { ...options };
      delete cleanOptions.timeout;
      delete cleanOptions.retries;
      delete cleanOptions.retryDelay;
      delete cleanOptions.skipErrorLogging;
      
      // Preparar opções de fetch com CORS adequado
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
        signal,
        credentials: 'omit', // Evitar envio de cookies
        mode: 'cors', // Explicitamente usar CORS
        redirect: 'follow', // Seguir redirecionamentos
        referrerPolicy: 'no-referrer', // Sem referrer para evitar problemas de CORS
        ...cleanOptions
      };
      
      // Fazer requisição
      const startTime = Date.now();
      const response = await fetch(urlWithNocache, fetchOptions);
      const requestTime = Date.now() - startTime;
      
      // Limpar timeout
      clearTimeout(timeoutId);
      
      if (isDev || API_CONFIG.DEBUG) {
        console.log(`✅ Resposta recebida em ${requestTime}ms: ${response.status} ${response.statusText}`);
      }
      
      // Se tiver erro de CORS, tentar com proxy alternativo
      if (response.status === 0 || (response.status === 403 && response.type === 'opaque')) {
        const corsProxies = [
          'https://api.allorigins.win/get?url=',
          'https://api.codetabs.com/v1/proxy/?quest='
        ];
        
        if (attempt < maxRetries) {
          const proxyUrl = `${corsProxies[attempt % corsProxies.length]}${encodeURIComponent(url)}`;
          console.log(`🔄 Tentando proxy CORS alternativo: ${proxyUrl}`);
          
          const proxyResponse = await fetch(proxyUrl);
          if (proxyResponse.ok) {
            return proxyResponse;
          }
        }
      }
      
      // Verificar se a resposta é ok
      if (!response.ok && response.status !== 304) { // 304 Not Modified ainda é ok
        if (shouldLogErrors) {
          console.warn(`⚠️ Resposta com erro: ${response.status} ${response.statusText}`);
        }
        
        // Para certos códigos, não tentar novamente
        if ([400, 401, 403, 404, 405, 422].includes(response.status)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Para outros (como 500, 502, 503), vamos tentar novamente
        if (attempt < maxRetries) {
          throw new Error(`HTTP ${response.status}: ${response.statusText} (tentando novamente)`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      // Logar apenas se solicitado
      if ((isDev || API_CONFIG.DEBUG) && !url.includes('health')) {
        // Clonar a resposta para poder inspecionar e ainda retornar
        const clonedResponse = response.clone();
        
        try {
          const contentType = clonedResponse.headers.get('content-type') || '';
          
          // Se for texto ou JSON, mostrar parte do conteúdo
          if (contentType.includes('text/') || contentType.includes('json')) {
            const responseBody = await clonedResponse.text();
            if (responseBody.length < 1000) { // Apenas logar se for pequena
              console.log(`📦 Resposta: ${responseBody.substring(0, 500)}${responseBody.length > 500 ? '...' : ''}`);
            } else {
              console.log(`📦 Resposta muito grande (${responseBody.length} bytes) para exibir no log.`);
            }
          } else {
            console.log(`📦 Resposta: formato ${contentType}`);
          }
        } catch (e) {
          // Ignorar erros de inspeção - não devem impedir o processamento normal
        }
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      if (shouldLogErrors) {
        console.error(`❌ Erro na requisição para ${url}:`, error);
      }
      
      // Se for a última tentativa, propagar o erro
      if (attempt === maxRetries) {
        if (shouldLogErrors) {
          console.error(`❌ Todas as ${maxRetries} tentativas falharam para ${url}`);
        }
        break;
      }
      
      // Se for timeout ou aborto, não tentar novamente para health check
      if (url.includes('health') && error instanceof DOMException && error.name === 'AbortError') {
        break;
      }
      
      // Aguardar antes da próxima tentativa com backoff exponencial
      const waitTime = retryDelay * Math.pow(1.5, attempt); // Backoff exponencial mais suave
      const cappedWaitTime = Math.min(waitTime, 30000); // Cap em 30 segundos
      
      if (shouldLogErrors) {
        console.log(`⏳ Aguardando ${Math.round(cappedWaitTime/1000)}s antes da próxima tentativa...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, cappedWaitTime));
    }
  }
  
  // Limpar timeout se chegou aqui
  clearTimeout(timeoutId);
  
  // Propagar o último erro
  throw lastError || new Error(`Falha após ${maxRetries} tentativas de requisição para ${url}`);
}

/**
 * Extrair dados JSON de uma resposta de forma robusta
 */
async function extractJSONData<T = any>(response: Response, url: string): Promise<T> {
  // Verificar se é uma resposta JSON pelo content-type
  const contentType = response.headers.get('content-type');
  
  // Obter o texto da resposta
  const text = await response.text();
  
  // Se o texto estiver vazio, não há o que fazer
  if (!text || text.trim() === '') {
    console.warn(`⚠️ Resposta vazia de ${url}`);
    throw new Error('A resposta está vazia');
  }
  
  try {
    // Tentar converter para JSON diretamente
    return JSON.parse(text) as T;
  } catch (jsonError) {
    console.warn(`⚠️ Erro ao analisar JSON de ${url}, tentando extrair JSON de HTML ou texto`);
    
    // Tentar extrair JSON de HTML (às vezes a API retorna HTML com JSON embutido)
    const jsonMatch = text.match(/({[\s\S]*})|(\[[\s\S]*\])/);
    if (jsonMatch && jsonMatch[0]) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch (extractError) {
        // Falhou ao extrair JSON de HTML
      }
    }
    
    // Se o content-type não é JSON e não conseguimos extrair, é um erro
    console.error(`Resposta não é JSON válido de ${url}:`, text.substring(0, 200));
    throw new Error(`Resposta não é JSON válido (${contentType}): ${text.substring(0, 100)}...`);
  }
}

/**
 * Wrapper para POST com JSON
 * @param url URL da requisição
 * @param data Dados para enviar
 * @param options Opções adicionais
 * @returns Promise com a resposta
 */
export async function postJSON<T = any>(url: string, data: any, options: FetchOptions = {}): Promise<T> {
  try {
    const response = await fetchWithConfig(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
    
    return await extractJSONData<T>(response, url);
  } catch (error) {
    console.error(`Erro ao processar postJSON para ${url}:`, error);
    throw error;
  }
}

/**
 * Wrapper para GET
 * @param url URL da requisição
 * @param options Opções adicionais
 * @returns Promise com a resposta
 */
export async function getJSON<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  try {
    const response = await fetchWithConfig(url, {
      method: 'GET',
      ...options,
    });
    
    return await extractJSONData<T>(response, url);
  } catch (error) {
    console.error(`Erro ao processar getJSON para ${url}:`, error);
    throw error;
  }
}