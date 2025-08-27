/**
 * @fileoverview Adaptador de API completo em TypeScript
 * @module services/api/api-adapter-complete
 */

import { Order, OrderStatus, OrderItem } from '../../types';
import { API_CONFIG } from '../../config/api.config';
import { ApiResponse } from './types';
import { getFlavorName, getOptionName, isLikelyID } from './flavor-mapping';

// Função auxiliar para extrair o ID de variação de um item sem acionar chamadas externas
function extractVariationId(item: any): string | null {
  if (item.variation && typeof item.variation === 'object' && item.variation.id) {
    return item.variation.id;
  } else if (item.variationId) {
    return item.variationId;
  } else if (item.variation_id) {
    return item.variation_id;
  } else if (typeof item.variation === 'string') {
    return item.variation;
  } else if (typeof item.option === 'string' && item.option.length > 20) {
    return item.option;
  } else if (typeof item.flavor === 'string' && item.flavor.length > 20) {
    return item.flavor;
  } else if (typeof item.sabor === 'string' && item.sabor.length > 20) {
    return item.sabor;
  }
  return null;
}

// Opções para o adaptador de API
interface ApiAdapterOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

// Interface para pedido da API
interface ApiOrder {
  _id?: string;
  id?: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  customerEmail?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  address?: string | {
    street?: string;
    number?: string;
    neighborhood?: string;
    reference?: string;
    city?: string;
    state?: string;
  };
  items?: Array<{
    _id?: string;
    id?: string;
    name?: string;
    product?: string;
    quantity?: number | string;
    price?: number | string;
    option?: string;
    category?: string;
    unit_type?: string;
    // Campos para variações/sabores
    flavor?: string;
    sabor?: string;
    variation?: string;
    variacao?: string;
    variant?: string;
    tipo?: string;
    type?: string;
    size?: string;
    tamanho?: string;
    // Campos para observações
    notes?: string;
    note?: string;
    observation?: string;
    observations?: string;
    observacao?: string;
    obs?: string;
    comments?: string;
    [key: string]: any; // Para outros campos dinâmicos
  }>;
  total?: number;
  status?: string;
  paymentMethod?: string;
  payment_method?: string;
  created_at?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  updated_at?: Date | string;
  orderNumber?: number;
  number?: number;
  priority?: string;
  [key: string]: any; // Para outras propriedades dinâmicas
}

/**
 * Adaptador de API com tipagem TypeScript
 */
export class CompleteApiAdapter {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private debugMode: boolean;

  /**
   * Cria um novo adaptador de API
   */
  constructor(options: ApiAdapterOptions = {}) {
    this.baseUrl = options.baseUrl || API_CONFIG.BASE_URL;
    this.timeout = options.timeout || API_CONFIG.TIMEOUT;
    this.retries = options.retries || API_CONFIG.MAX_RETRIES;
    this.debugMode = options.debug || API_CONFIG.DEBUG;
  }

  /**
   * Realiza uma requisição para a API
   */
  async request<T = any>(endpoint: string, options: RequestInit & { 
    body?: any; 
    timeout?: number;
    retries?: number;
  } = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    const body = options.body ? options.body : undefined;
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
        ...(options.headers || {})
      },
      body,
      mode: 'cors',
      credentials: 'omit'
    };
    
    // Log da requisição em modo debug
    if (this.debugMode) {
      console.log(`📡 Requisição ${method} para ${url}`, options.body || {});
    }
    
    let lastError: Error | null = null;
    const actualRetries = options.retries || this.retries;
    
    // Tentar a requisição com retries
    for (let attempt = 0; attempt <= actualRetries; attempt++) {
      try {
        // Se não for a primeira tentativa, logar
        if (attempt > 0 && this.debugMode) {
          console.log(`🔄 Tentativa ${attempt}/${actualRetries} para ${url}`);
        }
        
        // Adicionar parâmetro para evitar cache
        const urlWithNocache = url.includes('?') 
          ? `${url}&_nocache=${Date.now()}` 
          : `${url}?_nocache=${Date.now()}`;
        
        // Adicionar timeout
        const controller = new AbortController();
        const actualTimeout = options.timeout || this.timeout;
        const timeoutId = setTimeout(() => controller.abort(), actualTimeout);
        
        const startTime = Date.now();
        
        // Fazer a requisição
        const response = await fetch(urlWithNocache, {
          ...requestOptions,
          signal: controller.signal
        });
        
        // Limpar timeout
        clearTimeout(timeoutId);
        
        const requestTime = Date.now() - startTime;
        
        if (this.debugMode) {
          console.log(`✅ Resposta em ${requestTime}ms: ${response.status}`);
        }
        
        // Se a resposta não for ok, tentar de outra forma
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Processar a resposta
        const contentType = response.headers.get('content-type') || '';
        let data: any;
        
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          // Tentar converter texto para JSON
          const text = await response.text();
          
          try {
            data = JSON.parse(text);
          } catch (e) {
            if (this.debugMode) {
              console.warn('⚠️ Resposta não é JSON válido:', text);
            }
            data = { text };
          }
        }
        
        // Adaptar para o formato padrão
        return this.adaptResponse(data) as ApiResponse<T>;
        
      } catch (error) {
        lastError = error as Error;
        
        if (this.debugMode) {
          console.error(`❌ Erro na requisição: ${lastError.message}`);
        }
        
        // Se for a última tentativa, propagar o erro
        if (attempt === actualRetries) {
          break;
        }
        
        // Aguardar antes da próxima tentativa (com backoff exponencial)
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error(`Falha na requisição para ${url}`);
  }
  
  /**
   * Adapta resposta para o formato padrão
   */
  private adaptResponse(response: any): ApiResponse<any> {
    // Log detalhado para debug
    console.log('🔍 Resposta da API sendo adaptada:', JSON.stringify(response).substring(0, 500) + '...');
    
    // Se já está no formato padrão
    if (response && response.success !== undefined) {
      console.log('✅ Resposta já está no formato padrão');
      return response;
    }
    
    // Se é um array
    if (Array.isArray(response)) {
      console.log(`🔄 Convertendo array de ${response.length} itens`);
      return {
        success: true,
        data: response.map(item => this.adaptOrder(item)),
        message: `${response.length} pedidos carregados`
      };
    }
    
    // Se é um objeto com array de pedidos
    if (response && typeof response === 'object') {
      // Verificar as propriedades comuns (expandindo para mais propriedades possíveis)
      for (const key of ['orders', 'data', 'results', 'items', 'pedidos', 'list', 'orderList']) {
        if (response[key] && Array.isArray(response[key])) {
          console.log(`🔑 Encontrado array na chave "${key}" com ${response[key].length} itens`);
          return {
            success: true,
            data: response[key].map((item: any) => this.adaptOrder(item)),
            message: `${response[key].length} pedidos carregados`
          };
        }
      }
      
      // Se é um único pedido
      if (response._id || response.id) {
        console.log('🔑 Encontrado único pedido com ID');
        return {
          success: true,
          data: this.adaptOrder(response),
          message: 'Pedido carregado'
        };
      }
      
      // Tentar extrair um array de qualquer propriedade do objeto
      for (const key in response) {
        if (response[key] && Array.isArray(response[key])) {
          console.log(`🔍 Encontrado array na propriedade "${key}" com ${response[key].length} itens`);
          return {
            success: true,
            data: response[key].map((item: any) => this.adaptOrder(item)),
            message: `${response[key].length} pedidos carregados via "${key}"`
          };
        }
      }
    }
    
    // Último recurso: criar um array vazio para evitar erros
    console.warn('⚠️ Não foi possível extrair array de dados da resposta da API');
    
    return {
      success: true,
      data: [],
      message: 'Nenhum pedido disponível'
    };
  }
  
  /**
   * Adapta um pedido para o formato do frontend
   */
  private adaptOrder(order: ApiOrder): Order {
    if (!order) {
      return this.createEmptyOrder();
    }
    
    // Log completo para debug
    console.log('🔍 Adaptando pedido raw completo:', JSON.stringify(order));
    
    // Obter ID
    const id = order._id || order.id || `unknown-${Date.now()}`;
    
    // Processar endereço
    let addressString = '';
    if (typeof order.address === 'string') {
      addressString = order.address;
    } else if (order.address && typeof order.address === 'object') {
      const addr = order.address;
      addressString = `${addr.street || ''}, ${addr.number || ''}, ${addr.neighborhood || ''}`;
      if (addr.reference) {
        addressString += ` - ${addr.reference}`;
      }
      if (addr.city && addr.state) {
        addressString += `, ${addr.city}/${addr.state}`;
      }
    }
    
    // Verificar se existe um objeto separado com sabores/variações no pedido
    let flavorsMap = new Map();
    let optionsMap = new Map();
    
    console.log('🔍 Estrutura completa do pedido:', Object.keys(order));
    
    // Função para encontrar e processar variações dentro de um objeto
    const processVariationsObject = (obj: any, prefix: string = '') => {
      // Verificar se é um objeto
      if (!obj || typeof obj !== 'object') return;
      
      // Se é um array, processar cada item
      if (Array.isArray(obj)) {
        for (const item of obj) {
          processVariationsObject(item, prefix);
        }
        return;
      }
      
      // É um objeto não-array, ver se tem ID e nome
      if (obj.id || obj._id) {
        const id = obj.id || obj._id;
        const name = obj.name || obj.nome || obj.title || obj.description || obj.label || obj.text;
        let price = 0;
        
        // Procurar preço em vários formatos possíveis
        for (const field of ['price', 'preco', 'valor', 'value', 'cost', 'custo']) {
          if (typeof obj[field] === 'number') {
            price = obj[field];
            break;
          } else if (typeof obj[field] === 'string' && obj[field].trim() !== '') {
            price = parseFloat(obj[field]);
            if (!isNaN(price)) break;
          }
        }
        
        // Verificar se parece ser uma variação de sabor/opção
        const isFlavor = obj.type === 'flavor' || 
                         obj.tipo === 'sabor' || 
                         obj.category === 'flavor' ||
                         (name && name.toLowerCase().includes('sabor'));
                         
        const isOption = obj.type === 'option' || 
                         obj.tipo === 'opcao' || 
                         obj.category === 'option' ||
                         obj.is_option === true;
        
        if (isFlavor && name) {
          flavorsMap.set(id, { name, price });
          console.log(`🍦 Mapeado sabor: ${id} => ${name} (${price})`);
        } else if (isOption && name) {
          optionsMap.set(id, { name, price });
          console.log(`🔧 Mapeada opção: ${id} => ${name} (${price})`);
        } else if (name) {
          // Se não sabemos o tipo, adicionar aos dois mapas para garantir
          flavorsMap.set(id, { name, price });
          optionsMap.set(id, { name, price });
          console.log(`🧩 Mapeado item genérico: ${id} => ${name} (${price})`);
        }
      }
      
      // Processar propriedades que possam conter outras variações
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          processVariationsObject(obj[key], newPrefix);
        }
      }
    };
    
    // Buscar possíveis listas de sabores/opções
    for (const key in order) {
      // Verificar se o nome da propriedade indica que pode conter variações
      if (['flavors', 'sabores', 'options', 'opcoes', 'variations', 'variacoes', 
           'attributes', 'attributes_data', 'product_attributes', 'extras', 
           'additionals', 'adicionais', 'variants', 'items_data', 'product_data'].includes(key)) {
        console.log(`🍦 Encontrada propriedade potencial de variações em "${key}"`);
        processVariationsObject(order[key], key);
      }
    }
    
    // Buscar em propriedades genéricas também
    processVariationsObject(order, '');
    
    // Processar itens com suporte para variações (sabores)
    const items: OrderItem[] = Array.isArray(order.items) ? order.items.map(item => {
      // Log de cada item para debug
      console.log('📦 Item raw:', JSON.stringify(item));
      
      // Log detalhado do item para debug
      console.log('🔍 Item bruto completo:', JSON.stringify(item));
      
      // Garantir valores numéricos válidos para quantidade e preço
      const quantity = typeof item.quantity === 'number' ? item.quantity : 
                     typeof item.quantity === 'string' ? parseFloat(item.quantity) : 1;
      
      // Procurar preço em todos os campos possíveis
      let price = 0;
      if (typeof item.price === 'number') {
        price = item.price;
      } else if (typeof item.price === 'string' && item.price.trim() !== '') {
        price = parseFloat(item.price);
      } else if (typeof item.unitPrice === 'number') {
        price = item.unitPrice;
      } else if (typeof item.unitPrice === 'string' && item.unitPrice.trim() !== '') {
        price = parseFloat(item.unitPrice);
      } else if (typeof item.unit_price === 'number') {
        price = item.unit_price;
      } else if (typeof item.unit_price === 'string' && item.unit_price.trim() !== '') {
        price = parseFloat(item.unit_price);
      } else if (typeof item.preco === 'number') {
        price = item.preco;
      } else if (typeof item.preco === 'string' && item.preco.trim() !== '') {
        price = parseFloat(item.preco);
      } else if (typeof item.valor === 'number') {
        price = item.valor;
      } else if (typeof item.valor === 'string' && item.valor.trim() !== '') {
        price = parseFloat(item.valor);
      }
      
      // Verificar se há um preço total
      let totalPrice = 0;
      if (typeof item.totalPrice === 'number') {
        totalPrice = item.totalPrice;
      } else if (typeof item.totalPrice === 'string' && item.totalPrice.trim() !== '') {
        totalPrice = parseFloat(item.totalPrice);
      } else if (typeof item.total_price === 'number') {
        totalPrice = item.total_price;
      } else if (typeof item.total_price === 'string' && item.total_price.trim() !== '') {
        totalPrice = parseFloat(item.total_price);
      } else if (typeof item.total === 'number') {
        totalPrice = item.total;
      } else if (typeof item.total === 'string' && item.total.trim() !== '') {
        totalPrice = parseFloat(item.total);
      }
      
      // Se temos totalPrice mas não temos price, calcular
      if (totalPrice > 0 && price === 0 && quantity > 0) {
        price = totalPrice / quantity;
      } else if (price > 0 && totalPrice === 0) {
        totalPrice = price * quantity;
      }
      
      // Garantir valores mínimos
      if (isNaN(price) || price < 0) price = 0;
      if (isNaN(totalPrice) || totalPrice < 0) totalPrice = 0;
      
      // Verificar se há variações/sabores no item
      let itemName = item.name || item.product || item.description || 'Item sem nome';
      let notes = '';
      
      // Identificar produto por nome
      console.log(`🔍 Processando item: ${itemName}`);
      
      // Verificar se o item tem variação e extrair seu ID
      let variationId = extractVariationId(item);
      
      // Verificar também se há variação no campo 'option'
      if (item.option) {
        // Dar prioridade ao campo option mesmo que já tenha encontrado variationId
        variationId = item.option;
        console.log(`🔍 Encontrada variação em campo option: ${variationId}`);
        
        // Verificar se temos o nome mapeado estaticamente
        const optionName = getOptionName(variationId);
        if (optionName) {
          console.log(`✅ Nome da opção encontrado no mapeamento estático: ${optionName}`);
        } else {
          console.log(`⚠️ Opção ${variationId} não encontrada no mapeamento estático`);
        }
      }
      
      if (variationId) {
        console.log(`🔍 Item possui variação com ID: ${variationId}`);
        
        // Verificar primeiro se temos o nome no mapeamento estático
        const staticName = getFlavorName(variationId) || getOptionName(variationId);
        
        if (staticName) {
          console.log(`✅ Variação ${variationId} encontrada no mapeamento estático: ${staticName}`);
          
          // Adicionar ao nome do item para exibição
          if (!itemName.includes(staticName)) {
            itemName = `${itemName} - ${staticName}`;
          }
          
          // Adicionar às notas de forma explícita
          if (notes) notes += ', ';
          notes += `Sabor: ${staticName}`;
        } else {
          // Não temos no mapeamento estático, adicionar ID para que a interface possa buscar
          if (notes) notes += ', ';
          notes += `Variação_ID: ${variationId}`;
          
          // Nome da variação não encontrado localmente; manter apenas o ID
        }
      } else {
        console.log(`🔍 Item não possui variação, mantendo nome original: ${itemName}`);
      }
      
      // Tentar encontrar sabores/opções diretamente relacionados com este item
      // Procurar em campos que podem conter objetos com mais informações
      for (const field of ['product', 'product_data', 'flavor', 'flavor_data', 'option', 'option_data', 'variation', 'variations_data']) {
        if (item[field] && typeof item[field] === 'object' && !Array.isArray(item[field])) {
          const relatedObj = item[field];
          console.log(`🧩 Encontrado objeto relacionado em ${field}:`, relatedObj);
          
          // Verificar se tem nome melhor
          const betterName = relatedObj.name || relatedObj.nome || relatedObj.title || relatedObj.description;
          if (betterName && typeof betterName === 'string' && betterName.trim() !== '') {
            console.log(`📝 Usando nome melhor do objeto relacionado: ${betterName}`);
            itemName = betterName;
          }
          
          // Processar propriedades do objeto
          processVariationsObject(relatedObj, field);
        }
      }
      
      // Campos possíveis onde podem estar as variações
      const variationFields = ['option', 'flavor', 'sabor', 'variation', 'variacao', 'tipo', 'type', 'unit_type'];
      
      // Buscar variações em todos os campos possíveis
      for (const field of variationFields) {
        // Tratar tanto string quanto objetos
        if (item[field]) {
          // Se for objeto, tentar extrair nome direto
          if (typeof item[field] === 'object' && !Array.isArray(item[field])) {
            const obj = item[field];
            const objName = obj.name || obj.nome || obj.title || obj.description || obj.label;
            
            if (objName && typeof objName === 'string' && objName.trim() !== '') {
              console.log(`🔍 Campo ${field} é objeto com nome: ${objName}`);
              
              if (notes) notes += ', ';
              notes += `${field === 'unit_type' ? 'Tipo' : field === 'flavor' || field === 'sabor' ? 'Sabor' : 'Opção'}: ${objName}`;
              
              // Se é sabor, adicionar ao nome do item
              if (field === 'flavor' || field === 'sabor') {
                itemName = `${itemName} - ${objName}`;
              }
              
              // Ver se tem preço no objeto
              const objPrice = obj.price || obj.preco || obj.valor || obj.value;
              if (typeof objPrice === 'number' && objPrice > 0 && price === 0) {
                price = objPrice;
                totalPrice = price * quantity;
                console.log(`💰 Usando preço do objeto ${field}: ${price}`);
              }
              continue;
            }
          }
          
          // Tratar como string (valor direto ou ID)
          if (typeof item[field] === 'string' && item[field].trim() !== '') {
            const value = item[field].trim();
            
            // Verificar se o valor parece ser um ID usando a função compartilhada
            const isValueID = isLikelyID(value);
            
            if (isValueID) {
              // Tentar encontrar o nome correspondente ao ID nos mapas
              let foundName: string | undefined = undefined;
              let foundPrice = 0;
              
              // Primeiro verificar no mapeamento estático
              const mappedFlavorName = getFlavorName(value);
              const mappedOptionName = getOptionName(value);
              
              if (mappedFlavorName) {
                foundName = mappedFlavorName;
                console.log(`🎯 Encontrado sabor no mapeamento estático para ID ${value}: ${foundName}`);
              } else if (mappedOptionName) {
                foundName = mappedOptionName;
                console.log(`🎯 Encontrado opção no mapeamento estático para ID ${value}: ${foundName}`);
              }
              // Se não encontrou no mapeamento estático, buscar nos mapas dinâmicos
              else if (flavorsMap.has(value)) {
                const flavor = flavorsMap.get(value);
                if (flavor && flavor.name) {
                  foundName = flavor.name;
                  foundPrice = flavor.price || 0;
                  console.log(`🎯 Encontrado sabor para ID ${value}: ${foundName}`);
                }
              } else if (optionsMap.has(value)) {
                const option = optionsMap.get(value);
                if (option && option.name) {
                  foundName = option.name;
                  foundPrice = option.price || 0;
                  console.log(`🎯 Encontrado opção para ID ${value}: ${foundName}`);
                }
              }
              
              // Se encontrou o nome correspondente
              if (foundName) {
                if (notes) notes += ', ';
                
                // Determinar o tipo correto
                let label = 'Opção';
                if (field === 'unit_type') label = 'Tipo';
                else if (field === 'flavor' || field === 'sabor' || 
                        (typeof foundName === 'string' && 
                         (foundName.toLowerCase().includes('sabor') || 
                          foundName.toLowerCase().includes('aroma')))) {
                  label = 'Sabor';
                }
                
                notes += `${label}: ${foundName}`;
                
                // Se é sabor, adicionar ao nome do item
                if (label === 'Sabor') {
                  itemName = `${itemName} - ${foundName}`;
                }
                
                // Se tem preço e o item ainda não tem, usar este
                if (foundPrice > 0 && price === 0) {
                  price = foundPrice;
                  totalPrice = price * quantity;
                  console.log(`💰 Usando preço do mapeamento: ${price}`);
                }
              } else {
                // Não encontrou correspondência - mostrar o ID real de forma identificável
                if (notes) notes += ', ';
                notes += `${field === 'unit_type' ? 'Tipo_ID' : field === 'flavor' || field === 'sabor' ? 'Sabor_ID' : 'Opção_ID'}: ${value}`;
                console.log(`ℹ️ Mantendo ID original (precisa ser mapeado no futuro): ${value}`);
              }
            } else {
              // Se não parece um ID, adicionar o valor normalmente
              if (notes) notes += ', ';
              notes += `${field === 'unit_type' ? 'Tipo' : field === 'flavor' || field === 'sabor' ? 'Sabor' : 'Opção'}: ${value}`;
            }
          }
        }
      }
      
      // Verificar campos de observação
      const noteFields = ['notes', 'observation', 'observacao', 'obs', 'comments'];
      for (const field of noteFields) {
        if (item[field] && typeof item[field] === 'string' && item[field].trim() !== '') {
          if (notes) notes += ', ';
          notes += item[field];
        }
      }
      
      // Se tivermos um campo específico de sabor, adicionar ao nome
      if (item.flavor || item.sabor) {
        itemName = `${itemName} - ${item.flavor || item.sabor}`;
      }
      
      // Verificar se há campos adicionais que possam conter informações de variação
      for (const key in item) {
        // Pular campos já processados ou padrão
        if (['_id', 'id', 'name', 'product', 'quantity', 'price', 'total', 'category'].includes(key)) continue;
        if (variationFields.includes(key) || noteFields.includes(key)) continue;
        
        // Se for um campo de texto com valor, adicionar às notas
        if (typeof item[key] === 'string' && item[key].trim() !== '') {
          if (notes) notes += ', ';
          notes += `${key}: ${item[key]}`;
        }
      }
      
      // Tentar encontrar sabores ou variações em objetos relacionados
      // Muitas APIs relacionam IDs a objetos como item.options = { id: "123", nome: "Morango" }
      for (const key in item) {
        // Procurar campos que possam ser objetos de variação/sabor
        if (
          item[key] && 
          typeof item[key] === 'object' && 
          !Array.isArray(item[key]) &&
          ['option', 'options', 'flavor', 'flavor_obj', 'flavor_data', 'sabor', 'sabor_obj', 'variation', 'variacao'].includes(key)
        ) {
          const obj = item[key];
          console.log(`🔍 Encontrado objeto potencial de variação em ${key}:`, obj);
          
          // Procurar nome/descrição no objeto
          for (const prop of ['name', 'nome', 'title', 'titulo', 'description', 'descricao', 'label', 'valor', 'value']) {
            if (obj[prop] && typeof obj[prop] === 'string' && obj[prop].trim() !== '') {
              console.log(`✅ Encontrado nome de variação: ${obj[prop]}`);
              
              // Adicionar o nome ao item
              const label = key.includes('flavor') || key.includes('sabor') ? 'Sabor' : 
                           key.includes('option') ? 'Opção' : 'Variação';
              
              if (notes) notes += ', ';
              notes += `${label}: ${obj[prop]}`;
              
              // Se for sabor, adicionar ao nome do item
              if (key.includes('flavor') || key.includes('sabor')) {
                itemName = `${itemName} - ${obj[prop]}`;
              }
              break;
            }
          }
          
          // Procurar preço no objeto
          if (price === 0) {
            for (const prop of ['price', 'preco', 'valor', 'value', 'cost', 'custo']) {
              if (typeof obj[prop] === 'number') {
                price = obj[prop];
                totalPrice = price * quantity;
                console.log(`💰 Encontrado preço em objeto de variação: ${price}`);
                break;
              } else if (typeof obj[prop] === 'string' && obj[prop].trim() !== '') {
                const parsedPrice = parseFloat(obj[prop]);
                if (!isNaN(parsedPrice)) {
                  price = parsedPrice;
                  totalPrice = price * quantity;
                  console.log(`💰 Encontrado preço em objeto de variação (string): ${price}`);
                  break;
                }
              }
            }
          }
        }
      }
      
      // Não estimamos preços - vamos mostrar apenas o que temos de fato
      console.log(`💰 Preço encontrado para o item: ${price > 0 ? price : 'Nenhum'}`);
      
      // Se não temos preço, deixar como 0 para transparência
      if (price === 0 || totalPrice === 0) {
        console.log('⚠️ Item sem preço definido, mantendo como zero para transparência');
      }
      
      return {
        id: item._id || item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
        name: itemName,
        quantity: quantity,
        unitPrice: price,
        totalPrice: totalPrice || (quantity * price),
        category: item.option || item.category || 'Outros',
        notes: notes || undefined
      };
    }) : [];
    
    // Calcular subtotal
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Verificar status
    let status = OrderStatus.PENDING;
    if (order.status) {
      // Mapear status
      const statusMap: Record<string, OrderStatus> = {
        'pending': OrderStatus.PENDING,
        'confirmed': OrderStatus.CONFIRMED,
        'preparing': OrderStatus.PREPARING,
        'ready': OrderStatus.READY,
        'delivering': OrderStatus.OUT_FOR_DELIVERY,
        'completed': OrderStatus.DELIVERED,
        'delivered': OrderStatus.DELIVERED,
        'cancelled': OrderStatus.CANCELLED
      };
      
      const normalizedStatus = order.status.toLowerCase().trim();
      status = statusMap[normalizedStatus] || OrderStatus.PENDING;
    }
    
    const result = {
      id,
      orderNumber: order.orderNumber || order.number,
      customer: {
        id: (order.customer as any)?.id || id,
        name: order.customer_name || order.customerName || order.customer?.name || 'Cliente',
        phone: order.customerPhone || order.customer_phone || order.customer?.phone || '',
        address: addressString,
        email: order.customerEmail || order.customer?.email,
        isFrequent: false
      },
      items,
      subtotal,
      deliveryFee: order.deliveryFee || order.delivery_fee || 0,
      discount: order.discount || 0,
      total: order.total || subtotal,
      status,
      priority: (order.priority || 'normal') as any,
      paymentMethod: order.paymentMethod || order.payment_method || 'Dinheiro',
      paymentStatus: 'pending' as const,
      notes: order.observations || order.notes || order.observation,
      createdAt: new Date(order.created_at || order.createdAt || Date.now()),
      updatedAt: new Date(order.updatedAt || order.updated_at || Date.now())
    };
    
    // Log do resultado processado
    console.log('✅ Pedido processado:', JSON.stringify({
      id: result.id,
      items: result.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        notes: i.notes
      }))
    }));
    
    return result;
  }
  
  /**
   * Cria um pedido vazio para casos de erro
   */
  private createEmptyOrder(): Order {
    return {
      id: `empty-${Date.now()}`,
      orderNumber: undefined,
      customer: {
        id: `empty-${Date.now()}`,
        name: 'Erro de dados',
        phone: '',
        address: '',
        email: undefined,
        isFrequent: false
      },
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      discount: 0,
      total: 0,
      status: OrderStatus.PENDING,
      priority: 'normal' as any,
      paymentMethod: 'Erro',
      paymentStatus: 'pending' as const,
      notes: 'Erro ao processar dados do pedido',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  // =============== MÉTODOS DA API ===============
  
  /**
   * Obtém todos os pedidos
   */
  async getOrders(): Promise<ApiResponse<Order[]>> {
    console.log('📱 Obtendo pedidos via adaptador completo...');
    
    // Lista de endpoints possíveis para tentar
    const endpoints = [
      { url: '/orders', method: 'GET' },
      { url: '/list-orders', method: 'POST' },
      { url: '/orders', method: 'POST' },
      { url: '/pedidos', method: 'GET' },
      { url: '/api/orders', method: 'GET' },
      { url: '/api/list-orders', method: 'POST' }
    ];
    
    let lastError;
    
    // Tentar cada endpoint até encontrar um que funcione
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Tentando endpoint: ${endpoint.method} ${endpoint.url}`);
        
        let response;
        if (endpoint.method === 'GET') {
          response = await this.request<any>(endpoint.url);
        } else {
          response = await this.request<any>(endpoint.url, {
            method: endpoint.method,
            body: JSON.stringify({})
          });
        }
        
        // Verificar se a resposta contém dados válidos
        if (response && response.success) {
          if (Array.isArray(response.data)) {
            console.log(`✅ Endpoint ${endpoint.url} retornou ${response.data.length} pedidos`);
            return response;
          } else if (response.data !== null && response.data !== undefined) {
            console.log(`⚠️ Endpoint ${endpoint.url} retornou dados, mas não é um array:`, typeof response.data);
            
            // Tentar extrair array de response.data se for um objeto
            if (typeof response.data === 'object' && !Array.isArray(response.data)) {
              // Procurar por qualquer propriedade que seja um array
              for (const key in response.data) {
                if (Array.isArray(response.data[key])) {
                  console.log(`🔍 Encontrado array na propriedade data.${key}`);
                  return {
                    success: true,
                    data: response.data[key].map((item: any) => this.adaptOrder(item)),
                    message: `${response.data[key].length} pedidos encontrados`
                  };
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`❌ Erro ao tentar endpoint ${endpoint.url}:`, error);
        lastError = error;
        // Continuar para o próximo endpoint
      }
    }
    
    // Se chegou aqui, nenhum endpoint funcionou
    console.error('❌ Todos os endpoints falharam ao tentar obter pedidos');
    
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: lastError instanceof Error ? lastError.message : 'Falha ao obter pedidos de todos os endpoints'
      },
      data: [] // Retornar array vazio para evitar erros no frontend
    };
  }
  
  /**
   * Obtém um pedido específico
   */
  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    // Tentar o novo endpoint padronizado
    try {
      return await this.request<Order>(`/orders/${orderId}`);
    } catch (error) {
      // Fallback para endpoint legado
      return await this.request<Order>('/get-order', { 
        method: 'POST', 
        body: JSON.stringify({ id: orderId }) 
      });
    }
  }
  
  /**
   * Atualiza o status de um pedido
   */
  async updateOrderStatus(
    orderId: string, 
    status: OrderStatus | string,
    message?: string
  ): Promise<ApiResponse<Order>> {
    // Mapear status do frontend para backend
    const backendStatus = typeof status === 'string' ? status : this.mapStatusToBackend(status);
    
    // Tentar o novo endpoint padronizado
    try {
      return await this.request<Order>(`/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ 
          status: backendStatus, 
          message 
        })
      });
    } catch (error) {
      // Fallback para endpoint legado
      return await this.request<Order>('/update-order-status', {
        method: 'POST',
        body: JSON.stringify({ 
          id: orderId, 
          status: backendStatus, 
          clientMessage: message 
        })
      });
    }
  }
  
  /**
   * Mapeia status do frontend para o backend
   */
  private mapStatusToBackend(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'pending',
      [OrderStatus.CONFIRMED]: 'pending', // No backend não tem confirmed
      [OrderStatus.PREPARING]: 'preparing',
      [OrderStatus.READY]: 'preparing', // No backend não tem ready
      [OrderStatus.OUT_FOR_DELIVERY]: 'delivering',
      [OrderStatus.DELIVERED]: 'completed',
      [OrderStatus.CANCELLED]: 'cancelled'
    };
    
    return statusMap[status] || 'pending';
  }
  
  /**
   * Atualiza os itens de um pedido
   */
  async updateOrderItems(
    orderId: string, 
    items: OrderItem[]
  ): Promise<ApiResponse<Order>> {
    // Adaptar itens para o formato do backend
    const backendItems = items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.unitPrice,
      option: item.category
    }));
    
    // Calcular o novo total
    const total = items.reduce((acc, item) => acc + item.totalPrice, 0);
    
    // Tentar o novo endpoint padronizado
    try {
      return await this.request<Order>(`/orders/${orderId}/items`, {
        method: 'POST',
        body: JSON.stringify({ items: backendItems, total })
      });
    } catch (error) {
      // Fallback para endpoint legado
      return await this.request<Order>('/update-order', {
        method: 'POST',
        body: JSON.stringify({ 
          id: orderId, 
          items: backendItems,
          total
        })
      });
    }
  }
  
  /**
   * Verifica a saúde da API
   */
  async checkHealth(): Promise<{ success: boolean; details?: any; error?: string }> {
    // Tentar múltiplos endpoints para verificar saúde
    const endpoints = [
      '/health',
      '/status',
      '/ping'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await this.request(endpoint, { 
          timeout: 5000,
          retries: 1
        });
        return { 
          success: true, 
          details: { endpoint, response }
        };
      } catch (error) {
        // Continuar tentando outros endpoints
      }
    }
    
    // Se chegou aqui, nenhum endpoint funcionou
    // Tentar acessar a raiz da API como último recurso
    try {
      await this.request('', { timeout: 5000, retries: 0 });
      return { success: true, details: 'API respondendo via raiz' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    }
  }
}