/**
 * @fileoverview Adaptador de API completo em JavaScript (para compatibilidade com testes)
 * @module services/api/api-adapter-complete
 */

// Configuração padrão da API (para compatibilidade com ambiente JavaScript)
const DEFAULT_CONFIG = {
  BASE_URL: 'https://mercado-api-9sw5.onrender.com/api',
  TIMEOUT: 15000,
  MAX_RETRIES: 3,
  DEBUG: false
};

/**
 * Adaptador de API completo em JavaScript
 * Esta é uma versão simplificada para testes em ambiente JavaScript
 */
class CompleteApiAdapter {
  /**
   * Cria um novo adaptador de API
   */
  constructor(options = {}) {
    if (typeof options === 'string') {
      // Para compatibilidade com código legado
      this.baseUrl = options;
      this.timeout = DEFAULT_CONFIG.TIMEOUT;
      this.retries = DEFAULT_CONFIG.MAX_RETRIES;
      this.debugMode = DEFAULT_CONFIG.DEBUG;
    } else {
      this.baseUrl = options.baseUrl || DEFAULT_CONFIG.BASE_URL;
      this.timeout = options.timeout || DEFAULT_CONFIG.TIMEOUT;
      this.retries = options.retries || DEFAULT_CONFIG.MAX_RETRIES;
      this.debugMode = options.debug !== undefined ? options.debug : DEFAULT_CONFIG.DEBUG;
    }
  }

  /**
   * Realiza uma requisição para a API
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
        ...(options.headers || {})
      },
      mode: 'cors',
      credentials: 'omit'
    };
    
    // Adicionar body se necessário
    if (options.body) {
      requestOptions.body = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }
    
    // Log da requisição em modo debug
    if (this.debugMode) {
      console.log(`📡 Requisição ${method} para ${url}`, options.body || {});
    }
    
    let lastError = null;
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
        let data;
        
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
        return this.adaptResponse(data);
        
      } catch (error) {
        lastError = error;
        
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
  adaptResponse(response) {
    // Se já está no formato padrão
    if (response && response.success !== undefined) {
      return response;
    }
    
    // Se é um array
    if (Array.isArray(response)) {
      return {
        success: true,
        data: response.map(item => this.adaptOrder(item)),
        message: `${response.length} pedidos carregados`
      };
    }
    
    // Se é um objeto com array de pedidos
    if (response && typeof response === 'object') {
      // Verificar as propriedades comuns
      for (const key of ['orders', 'data', 'results', 'items']) {
        if (response[key] && Array.isArray(response[key])) {
          return {
            success: true,
            data: response[key].map(item => this.adaptOrder(item)),
            message: `${response[key].length} pedidos carregados`
          };
        }
      }
      
      // Se é um único pedido
      if (response._id || response.id) {
        return {
          success: true,
          data: this.adaptOrder(response),
          message: 'Pedido carregado'
        };
      }
    }
    
    // Não conseguiu adaptar, retornar como está
    return {
      success: true,
      data: response,
      message: 'Dados recebidos'
    };
  }
  
  /**
   * Adapta um pedido para o formato do frontend
   */
  adaptOrder(order) {
    if (!order) {
      return this.createEmptyOrder();
    }
    
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
    
    // Processar itens
    const items = Array.isArray(order.items) ? order.items.map(item => ({
      id: item._id || item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
      name: item.name || item.product || 'Item sem nome',
      quantity: typeof item.quantity === 'number' ? item.quantity : 
                typeof item.quantity === 'string' ? parseFloat(item.quantity) : 1,
      unitPrice: typeof item.price === 'number' ? item.price : 
                 typeof item.price === 'string' ? parseFloat(item.price) : 0,
      totalPrice: (typeof item.quantity === 'number' ? item.quantity : 
                  typeof item.quantity === 'string' ? parseFloat(item.quantity) : 1) * 
                 (typeof item.price === 'number' ? item.price : 
                  typeof item.price === 'string' ? parseFloat(item.price) : 0),
      category: item.option || item.category || 'Outros',
      notes: item.unit_type ? `Tipo: ${item.unit_type}` : undefined
    })) : [];
    
    // Calcular subtotal
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Verificar status
    let status = 'pending';
    if (order.status) {
      // Mapear status
      const statusMap = {
        'pending': 'pending',
        'confirmed': 'confirmed',
        'preparing': 'preparing',
        'ready': 'ready',
        'delivering': 'out_for_delivery',
        'completed': 'delivered',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
      };
      
      const normalizedStatus = order.status.toLowerCase().trim();
      status = statusMap[normalizedStatus] || 'pending';
    }
    
    return {
      id,
      orderNumber: order.orderNumber || order.number,
      customer: {
        id: order.customer?.id || id,
        name: order.customer_name || order.customerName || order.customer?.name || 'Cliente',
        phone: order.customerPhone || order.customer_phone || order.customer?.phone || '',
        address: addressString,
        email: order.customerEmail || order.customer?.email,
        isFrequent: false
      },
      items,
      subtotal,
      deliveryFee: 0,
      discount: 0,
      total: order.total || subtotal,
      status,
      priority: order.priority || 'normal',
      paymentMethod: order.paymentMethod || order.payment_method || 'Dinheiro',
      paymentStatus: 'pending',
      notes: order.observations || order.notes,
      createdAt: new Date(order.created_at || order.createdAt || Date.now()),
      updatedAt: new Date(order.updatedAt || order.updated_at || Date.now())
    };
  }
  
  /**
   * Cria um pedido vazio para casos de erro
   */
  createEmptyOrder() {
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
      status: 'pending',
      priority: 'normal',
      paymentMethod: 'Erro',
      paymentStatus: 'pending',
      notes: 'Erro ao processar dados do pedido',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  // =============== MÉTODOS DA API ===============
  
  /**
   * Obtém todos os pedidos
   */
  async getOrders() {
    // Tentar o novo endpoint padronizado
    try {
      const response = await this.request('/orders');
      return response;
    } catch (error) {
      // Fallback para endpoints legados
      try {
        const response = await this.request('/list-orders', { 
          method: 'POST', 
          body: {} 
        });
        return response;
      } catch (error2) {
        // Último fallback
        return await this.request('/orders', { 
          method: 'POST', 
          body: {} 
        });
      }
    }
  }
  
  /**
   * Obtém um pedido específico
   */
  async getOrder(orderId) {
    // Tentar o novo endpoint padronizado
    try {
      return await this.request(`/orders/${orderId}`);
    } catch (error) {
      // Fallback para endpoint legado
      return await this.request('/get-order', { 
        method: 'POST', 
        body: { id: orderId } 
      });
    }
  }
  
  /**
   * Atualiza o status de um pedido
   */
  async updateOrderStatus(orderId, status, message) {
    // Mapear status do frontend para backend
    const backendStatus = typeof status === 'string' ? status : this.mapStatusToBackend(status);
    
    // Tentar o novo endpoint padronizado
    try {
      return await this.request(`/orders/${orderId}/status`, {
        method: 'POST',
        body: { 
          status: backendStatus, 
          message 
        }
      });
    } catch (error) {
      // Fallback para endpoint legado
      return await this.request('/update-order-status', {
        method: 'POST',
        body: { 
          id: orderId, 
          status: backendStatus, 
          clientMessage: message 
        }
      });
    }
  }
  
  /**
   * Mapeia status do frontend para o backend
   */
  mapStatusToBackend(status) {
    const statusMap = {
      'pending': 'pending',
      'confirmed': 'pending', // No backend não tem confirmed
      'preparing': 'preparing',
      'ready': 'preparing', // No backend não tem ready
      'out_for_delivery': 'delivering',
      'delivered': 'completed',
      'cancelled': 'cancelled'
    };
    
    return statusMap[status] || 'pending';
  }
  
  /**
   * Atualiza os itens de um pedido
   */
  async updateOrderItems(orderId, items) {
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
      return await this.request(`/orders/${orderId}/items`, {
        method: 'POST',
        body: { items: backendItems, total }
      });
    } catch (error) {
      // Fallback para endpoint legado
      return await this.request('/update-order', {
        method: 'POST',
        body: { 
          id: orderId, 
          items: backendItems,
          total
        }
      });
    }
  }
  
  /**
   * Verifica a saúde da API
   */
  async checkHealth() {
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

// Manter o nome ApiAdapter para compatibilidade legada
const ApiAdapter = CompleteApiAdapter;

// Exportar
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CompleteApiAdapter, ApiAdapter };
}