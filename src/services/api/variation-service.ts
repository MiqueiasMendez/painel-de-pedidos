/**
 * @fileoverview Serviço para gerenciar variações de produtos
 * @module services/api/variation-service
 */

import { API_CONFIG } from '../../config/api.config';

// Interface para objetos de variação
interface Variation {
  id: string;
  name: string;
  price?: number;
}

// Cache de variações
const variationCache: Record<string, string> = {};

/**
 * Carrega o cache de variações do localStorage
 */
function loadCacheFromStorage(): void {
  try {
    const savedCache = localStorage.getItem('variationCache');
    if (savedCache) {
      Object.assign(variationCache, JSON.parse(savedCache));
      console.log('🔄 Cache de variações carregado do armazenamento local');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar cache de variações:', error);
  }
}

/**
 * Salva o cache de variações no localStorage
 */
function saveCacheToStorage(): void {
  try {
    localStorage.setItem('variationCache', JSON.stringify(variationCache));
  } catch (error) {
    console.error('❌ Erro ao salvar cache de variações:', error);
  }
}

/**
 * Busca o nome da variação pelo ID
 * @param variationId ID da variação
 * @returns Nome da variação ou string com valor default se não encontrado
 */
export async function fetchVariationNameById(variationId: string): Promise<string> {
  // Verificar se temos em cache
  if (variationCache[variationId]) {
    console.log(`✅ Variação ${variationId} encontrada em cache: ${variationCache[variationId]}`);
    return variationCache[variationId];
  }
  
  try {
    // Se não temos em cache, buscar da API
    const baseUrl = API_CONFIG.BASE_URL;
    const url = `${baseUrl}/variations/${variationId}`;
    
    console.log(`🔄 Buscando variação ${variationId} via API`);
    
    // Tentar o primeiro endpoint
    let response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Se falhar, tentar o endpoint alternativo
    if (!response.ok) {
      console.log(`⚠️ Endpoint principal falhou, tentando alternativo para variação ${variationId}`);
      response = await fetch(`${baseUrl}/products/variation/${variationId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Não foi possível buscar informações da variação: ${variationId}`);
      }
    }
    
    const data = await response.json();
    console.log(`🔍 Dados recebidos para variação ${variationId}:`, data);
    
    // Extrair o nome da variação de vários formatos possíveis
    let variationName: string;
    
    if (data.name) {
      variationName = data.name;
    } else if (data.flavor) {
      variationName = data.flavor;
    } else if (data.sabor) {
      variationName = data.sabor;
    } else if (data.data && data.data.name) {
      variationName = data.data.name;
    } else {
      variationName = `Variação ${variationId}`;
    }
    
    // Armazenar em cache
    variationCache[variationId] = variationName;
    saveCacheToStorage();
    
    console.log(`✅ Variação ${variationId} resolvida como: ${variationName}`);
    return variationName;
  } catch (error) {
    console.error(`❌ Erro ao buscar variação ${variationId}:`, error);
    return `Variação ${variationId}`;
  }
}

/**
 * Tenta extrair o ID de variação de um item de pedido
 * @param item Item do pedido
 * @returns ID da variação ou null se não encontrado
 */
export function extractVariationId(item: any): string | null {
  // Verificar os vários formatos possíveis de ID de variação
  if (item.variation && typeof item.variation === 'object' && item.variation.id) {
    return item.variation.id;
  } else if (item.variationId) {
    return item.variationId;
  } else if (item.variation_id) {
    return item.variation_id;
  } else if (typeof item.variation === 'string') {
    return item.variation;
  } else if (typeof item.option === 'string' && item.option.length > 20) {
    // Verificar se o campo option parece ser um ID de MongoDB
    return item.option;
  } else if (typeof item.flavor === 'string' && item.flavor.length > 20) {
    // Verificar se o campo flavor parece ser um ID de MongoDB
    return item.flavor;
  } else if (typeof item.sabor === 'string' && item.sabor.length > 20) {
    // Verificar se o campo sabor parece ser um ID de MongoDB
    return item.sabor;
  }
  
  return null;
}

/**
 * Inicializa o serviço de variações
 */
export function initVariationService(): void {
  loadCacheFromStorage();
  
  // Salvar cache quando a página for fechada
  window.addEventListener('beforeunload', saveCacheToStorage);
  
  console.log('✅ Serviço de variações inicializado');
}

/**
 * Pré-carrega variações comuns para melhorar a experiência
 */
export async function preloadCommonVariations(): Promise<void> {
  // Lista de variações frequentemente usadas
  // IDs encontrados nos pedidos
  const commonVariationIds = [
    '681e3f4b01d28118a2df8a43',
    '681e3d8501d28118a2df87cf',
    '682c7c494fc1c9f47c45849d',
    '682f76ad9139c6af0ae5d53e',
    '682f76ad9139c6af0ae5d53d',
    '682f76ad9139c6af0ae5d53f',
    '68239bf3ecca70531f25833d',
    '68239608ecca70531f257fa0',
    '682393faecca70531f257f29',
    '682393faecca70531f257f28',
    '68262843ecca70531f2b8cc5',
    '681de9f701d28118a2df08ed',
    '681df26d01d28118a2df0edf',
    '681dfdcf01d28118a2df20c2',
    '681de8f801d28118a2df086b',
    '682cfd254fc1c9f47c466fc0',
    '682e09e84fc1c9f47c46abcd'
  ];
  
  // Se a lista estiver vazia, não fazer nada
  if (commonVariationIds.length === 0) {
    return;
  }
  
  console.log(`🔄 Pré-carregando ${commonVariationIds.length} variações comuns...`);
  
  // Carregar variações em paralelo
  const fetchPromises = commonVariationIds.map(id => 
    fetchVariationNameById(id)
      .then(name => {
        console.log(`✅ Variação ${id} pré-carregada: ${name}`);
      })
      .catch(err => {
        console.error(`❌ Erro ao pré-carregar variação ${id}:`, err);
      })
  );
  
  // Aguardar todas as requisições terminarem
  await Promise.allSettled(fetchPromises);
  console.log("✅ Pré-carregamento de variações concluído");
}

// Inicializar o serviço automaticamente
if (typeof window !== 'undefined') {
  initVariationService();
  
  // Pré-carregar variações após um pequeno delay para não atrapalhar o carregamento inicial
  setTimeout(() => {
    preloadCommonVariations();
  }, 3000);
}

// Exportar o cache para testes
export { variationCache };