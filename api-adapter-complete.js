/**
 * API Adapter - Adaptador para padronização de comunicação com a API
 * 
 * Este adaptador fornece uma interface padronizada para comunicação com a API,
 * independente das inconsistências do backend.
 */

class ApiAdapter {
  constructor(baseUrl = 'https://mercado-api-9sw5.onrender.com/api') {
    this.baseUrl = baseUrl;
    this.endpoints = {
      // Endpoints RESTful padronizados
      getOrders: '/orders',
      getOrder: (id) => `/orders/${id}`,
      updateOrderStatus: (id) => `/orders/${id}/status`,
      health: '/health',

      // Endpoints legados para compatibilidade
      legacyListOrders: '/list-orders',
      legacyGetOrder: '/get-order',
      legacyUpdateStatus: '/update-order-status',
      placeOrder: '/place-order',
      getOrderStatus: '/get-order-status'
    };
  }

  /**
   * Realiza uma requisição à API
   * @param {string} endpoint - O endpoint a ser acessado
   * @param {string} method - O método HTTP (GET, POST, etc)
   * @param {object} data - Os dados a serem enviados (para POST, PUT)
   * @returns {Promise<object>} - A resposta da API já normalizada
   */
  async request(endpoint, method = 'GET', data = null) {
    try {
      const url = this.baseUrl + endpoint;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Normalizar a resposta para o formato padronizado
      return this._normalizeResponse(result);
    } catch (error) {
      console.error('Erro na requisição à API:', error);
      throw error;
    }
  }

  /**
   * Normaliza a resposta para o formato padronizado
   * @param {object} response - A resposta da API
   * @returns {object} - A resposta normalizada
   */
  _normalizeResponse(response) {
    // Se já estiver no formato padronizado, retornar
    if (response && response.hasOwnProperty('success') && response.hasOwnProperty('data')) {
      return response;
    }

    // Se for um array direto, envolver em um objeto padronizado
    if (Array.isArray(response)) {
      return {
        success: true,
        data: response,
        message: 'Operação realizada com sucesso'
      };
    }

    // Se for um objeto com dados em uma propriedade, normalizar
    if (response && typeof response === 'object') {
      // Verificar propriedades comuns que contêm dados
      for (const prop of ['data', 'orders', 'results', 'items']) {
        if (response[prop] && (Array.isArray(response[prop]) || typeof response[prop] === 'object')) {
          return {
            success: true,
            data: response[prop],
            message: response.message || 'Operação realizada com sucesso'
          };
        }
      }

      // Se não tiver uma propriedade específica, considerar o objeto todo como dados
      return {
        success: true,
        data: response,
        message: 'Operação realizada com sucesso'
      };
    }

    // Caso não seja possível normalizar
    return {
      success: false,
      data: null,
      message: 'Formato de resposta não reconhecido'
    };
  }

  /**
   * Normaliza um objeto de pedido para o formato padronizado
   * @param {object} order - O pedido a ser normalizado
   * @returns {object} - O pedido normalizado
   */
  _normalizeOrderObject(order) {
    if (!order) return null;

    // Converter para objeto plano se for um documento Mongoose
    const orderData = order.toObject ? order.toObject() : { ...order };

    return {
      id: orderData._id || orderData.id,
      customer: {
        name: orderData.customerName || orderData.customer_name || '',
        phone: orderData.customerPhone || orderData.customer?.phone || '',
        address: orderData.address || {}
      },
      items: (orderData.items || []).map(item => ({
        id: item._id || item.id || '',
        name: item.name || '',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.price) || 0,
        totalPrice: (Number(item.price) || 0) * (Number(item.quantity) || 1),
        category: item.category || '',
        // Preservar informações específicas do item
        weight: item.weight,
        pricePerKg: item.price_per_kg,
        unitType: item.unit_type,
        option: item.option,
        variations: item.variations
      })),
      total: Number(orderData.total) || 0,
      status: orderData.status || 'pending',
      paymentMethod: orderData.paymentMethod || 'dinheiro',
      changeFor: orderData.changeFor,
      observations: orderData.observations || '',
      createdAt: orderData.created_at || orderData.createdAt || new Date(),
      updatedAt: orderData.updated_at || orderData.updatedAt,
      completedAt: orderData.completed_at || orderData.completedAt,
      source: orderData.source || 'web',
      statusChanges: orderData.statusChanges || [],
      statusMessages: orderData.statusMessages || []
    };
  }

  // API MÉTODOS PADRONIZADOS

  /**
   * Lista todos os pedidos
   * @param {object} options - Opções de filtragem, paginação, etc.
   * @returns {Promise<object>} - A lista de pedidos
   */
  async getOrders(options = {}) {
    try {
      // Converter opções para parâmetros de query string
      const queryParams = [];
      
      if (options.page) queryParams.push(`page=${options.page}`);
      if (options.limit) queryParams.push(`limit=${options.limit}`);
      if (options.status) queryParams.push(`status=${options.status}`);
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      
      // Tentar primeiro o endpoint RESTful padronizado
      try {
        const response = await this.request(`${this.endpoints.getOrders}${queryString}`, 'GET');
        
        // Garantir que os pedidos individuais também estão normalizados
        if (response.data && response.data.orders && Array.isArray(response.data.orders)) {
          response.data.orders = response.data.orders.map(order => this._normalizeOrderObject(order));
        }
        
        return response;
      } catch (restError) {
        console.warn('Falha ao usar endpoint RESTful, tentando endpoint legado:', restError);
        
        // Fallback para o endpoint legado
        const legacyResponse = await this.request(this.endpoints.legacyListOrders, 'POST', options);
        
        // Garantir formato consistente mesmo usando o endpoint legado
        if (Array.isArray(legacyResponse.data)) {
          return {
            success: true,
            data: {
              orders: legacyResponse.data.map(order => this._normalizeOrderObject(order)),
              pagination: {
                total: legacyResponse.data.length,
                page: 1,
                limit: legacyResponse.data.length,
                pages: 1
              }
            },
            message: 'Pedidos listados com sucesso (via endpoint legado)'
          };
        }
        
        return legacyResponse;
      }
    } catch (error) {
      console.error('Erro ao listar pedidos:', error);
      throw error;
    }
  }

  /**
   * Obtém um pedido específico
   * @param {string} id - ID do pedido
   * @returns {Promise<object>} - O pedido
   */
  async getOrder(id) {
    try {
      if (!id) {
        throw new Error('ID do pedido é obrigatório');
      }
      
      // Tentar primeiro o endpoint RESTful padronizado
      try {
        const response = await this.request(this.endpoints.getOrder(id), 'GET');
        return response;
      } catch (restError) {
        console.warn('Falha ao usar endpoint RESTful, tentando endpoint legado:', restError);
        
        // Fallback para o endpoint legado
        const legacyResponse = await this.request(this.endpoints.legacyGetOrder, 'POST', { id });
        
        // Garantir que o pedido está normalizado
        if (legacyResponse.data) {
          legacyResponse.data = this._normalizeOrderObject(legacyResponse.data);
        }
        
        return legacyResponse;
      }
    } catch (error) {
      console.error('Erro ao obter pedido:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status de um pedido
   * @param {string} id - ID do pedido
   * @param {string} status - Novo status
   * @param {string} clientMessage - Mensagem opcional para o cliente
   * @returns {Promise<object>} - O pedido atualizado
   */
  async updateOrderStatus(id, status, clientMessage = '') {
    try {
      if (!id) {
        throw new Error('ID do pedido é obrigatório');
      }
      
      if (!status) {
        throw new Error('Status é obrigatório');
      }
      
      const data = {
        status,
        clientMessage
      };
      
      // Tentar primeiro o endpoint RESTful padronizado
      try {
        const response = await this.request(this.endpoints.updateOrderStatus(id), 'POST', data);
        return response;
      } catch (restError) {
        console.warn('Falha ao usar endpoint RESTful, tentando endpoint legado:', restError);
        
        // Fallback para o endpoint legado
        const legacyResponse = await this.request(this.endpoints.legacyUpdateStatus, 'POST', {
          id,
          status,
          clientMessage
        });
        
        // Garantir que o pedido está normalizado
        if (legacyResponse.data) {
          legacyResponse.data = this._normalizeOrderObject(legacyResponse.data);
        }
        
        return legacyResponse;
      }
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      throw error;
    }
  }

  /**
   * Verifica a saúde da API
   * @returns {Promise<object>} - Status da API
   */
  async checkHealth() {
    try {
      return await this.request(this.endpoints.health, 'GET');
    } catch (error) {
      console.error('Erro ao verificar saúde da API:', error);
      return {
        success: false,
        data: null,
        message: 'API indisponível'
      };
    }
  }

  /**
   * Cria um novo pedido
   * @param {object} orderData - Dados do pedido
   * @returns {Promise<object>} - O pedido criado
   */
  async createOrder(orderData) {
    try {
      const response = await this.request(this.endpoints.placeOrder, 'POST', orderData);
      return response;
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      throw error;
    }
  }

  /**
   * Obtém o status de um pedido (método legado)
   * @param {string} orderId - ID do pedido
   * @returns {Promise<object>} - Status do pedido
   */
  async getOrderStatus(orderId) {
    try {
      const response = await this.request(this.endpoints.getOrderStatus, 'POST', { order_id: orderId });
      return response;
    } catch (error) {
      console.error('Erro ao obter status do pedido:', error);
      throw error;
    }
  }
}

// REACT HOOK PARA USAR A API
// Use este hook em seus componentes React para interagir com a API

/**
 * Hook React para usar a API de pedidos
 * @returns {object} - Métodos e estado para interação com a API
 */
function useOrdersApi() {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const api = React.useMemo(() => new ApiAdapter(), []);

  // Carregar todos os pedidos
  const loadOrders = React.useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.getOrders(options);
      if (result.success && result.data && result.data.orders) {
        setOrders(result.data.orders);
      } else {
        setError(result.message || 'Erro ao carregar pedidos');
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro inesperado';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Atualizar status de um pedido
  const updateOrderStatus = React.useCallback(async (orderId, status, message = '') => {
    setLoading(true);
    
    try {
      const result = await api.updateOrderStatus(orderId, status, message);
      if (result.success && result.data) {
        // Atualizar o pedido na lista
        setOrders(prevOrders => 
          prevOrders.map(order => order.id === orderId ? result.data : order)
        );
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro inesperado';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Buscar um pedido específico
  const getOrder = React.useCallback(async (orderId) => {
    setLoading(true);
    
    try {
      const result = await api.getOrder(orderId);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar pedido';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Carregar pedidos ao montar o componente
  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return {
    orders,
    loading,
    error,
    loadOrders,
    getOrder,
    updateOrderStatus,
    api
  };
}

// EXEMPLO DE USO EM COMPONENTE REACT

/*
function OrdersPanel() {
  const { 
    orders, 
    loading, 
    error, 
    updateOrderStatus, 
    loadOrders 
  } = useOrdersApi();

  const handleStatusChange = async (orderId, newStatus) => {
    const result = await updateOrderStatus(
      orderId, 
      newStatus, 
      'Atualizado pelo painel de pedidos'
    );
    
    if (result.success) {
      // Status atualizado com sucesso
      console.log('Status atualizado!');
    } else {
      // Erro ao atualizar status
      console.error(result.message);
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h1>Painel de Pedidos</h1>
      
      <button onClick={() => loadOrders()}>
        Atualizar Lista
      </button>
      
      <div className="orders-list">
        {orders.map(order => (
          <div key={order.id} className="order-card">
            <h3>Pedido #{order.id.slice(-6)}</h3>
            <p>Cliente: {order.customer.name}</p>
            <p>Status: {order.status}</p>
            <p>Total: R$ {order.total.toFixed(2)}</p>
            
            <div className="actions">
              <button onClick={() => handleStatusChange(order.id, 'preparing')}>
                Em Preparação
              </button>
              <button onClick={() => handleStatusChange(order.id, 'delivering')}>
                Saiu para Entrega
              </button>
              <button onClick={() => handleStatusChange(order.id, 'completed')}>
                Finalizado
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
*/

// Exportar para uso em diferentes ambientes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApiAdapter, useOrdersApi };
} else if (typeof window !== 'undefined') {
  window.ApiAdapter = ApiAdapter;
  window.useOrdersApi = useOrdersApi;
}