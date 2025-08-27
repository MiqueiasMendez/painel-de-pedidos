/**
 * @fileoverview Hook otimizado usando gerenciador único de conexão
 * @module hooks/useOrders
 */

import { useReducer, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Order,
  OrderStatus,
  OrderAction,
  OrdersState,
  OrderItem,
  SearchFilters
} from '../types';
import { connectionManager } from '../services/api/client/connection';
import { OrdersService } from '../services/api/services/orders';
import { SyncResult } from '../services/api/types';
import { localPersistence } from '../services/persistence/localPersistence';
import { mockOrders } from '../mocks/ordersMock';

// ==================== INITIAL STATE ====================
const initialState: OrdersState = {
  orders: [],
  loading: false,
  error: null,
  lastUpdate: null
};

// ==================== REDUCER ====================
function ordersReducer(state: OrdersState, action: OrderAction): OrdersState {
  switch (action.type) {
    case 'SET_ORDERS':
      return {
        ...state,
        orders: action.payload,
        lastUpdate: new Date(),
        error: null
      };

    case 'ADD_ORDER':
      return {
        ...state,
        orders: [action.payload, ...state.orders],
        lastUpdate: new Date()
      };

    case 'UPDATE_ORDER': {
      const { id, updates } = action.payload;
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === id
            ? { ...order, ...updates, updatedAt: new Date() }
            : order
        ),
        lastUpdate: new Date()
      };
    }

    case 'DELETE_ORDER':
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload),
        lastUpdate: new Date()
      };

    case 'UPDATE_STATUS': {
      const { id, status } = action.payload;
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === id
            ? { ...order, status, updatedAt: new Date() }
            : order
        ),
        lastUpdate: new Date()
      };
    }

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'BATCH_UPDATE_STATUS': {
      const { ids, status } = action.payload;
      const updatedAt = new Date();
      return {
        ...state,
        orders: state.orders.map(order =>
          ids.includes(order.id)
            ? { ...order, status, updatedAt }
            : order
        ),
        lastUpdate: updatedAt
      };
    }

    default:
      return state;
  }
}

// ==================== MAIN HOOK ====================
export function useOrders() {
  const [state, dispatch] = useReducer(ordersReducer, initialState);
  const [usingMockData, setUsingMockData] = useState(
    localStorage.getItem('usingDemoData') === 'true'
  );
  
  // ==================== INICIALIZAÇÃO ====================
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // 1. Carregar dados locais imediatamente
    const cachedOrders = localPersistence.loadOrders();
    if (cachedOrders.length > 0) {
      dispatch({ type: 'SET_ORDERS', payload: cachedOrders });
      console.log(`⚡ ${cachedOrders.length} pedidos carregados do cache`);
    }
    
    // 2. Configurar função de sincronização no gerenciador de conexões
    connectionManager.setSyncFunction(async () => {
      try {
        // Primeiro tenta com o adaptador completo (que provou ser mais confiável)
        try {
          // Importação dinâmica segura do módulo de API
          const apiModule = await import('../services/api');
          if (!apiModule.apiClient) {
            throw new Error("apiClient não encontrado no módulo de API");
          }
          
          console.log('🔄 Tentando obter pedidos via adaptador completo...');
          const result = await apiModule.apiClient.getOrders();
          
          if (result.success && Array.isArray(result.data)) {
            console.log(`✅ ${result.data.length} pedidos obtidos com sucesso via adaptador completo`);
            // Limpar flag de dados mockados
            localStorage.setItem('usingDemoData', 'false');
            setUsingMockData(false);
            return result.data;
          }
          
          throw new Error("Adaptador completo não retornou array de dados");
          
        } catch (adapterError) {
          console.warn('⚠️ Erro no adaptador completo, tentando OrdersService:', adapterError);
          
          // Se falhar, tenta com o serviço padrão
          try {
            console.log('🔄 Tentando obter pedidos via OrdersService...');
            const result = await OrdersService.fetchOrders();
            
            if (result.success && Array.isArray(result.data)) {
              console.log(`✅ ${result.data.length} pedidos obtidos com sucesso via OrdersService`);
              // Limpar flag de dados mockados
              localStorage.setItem('usingDemoData', 'false');
              setUsingMockData(false);
              return result.data;
            }
            
            throw new Error("OrdersService não retornou array de dados");
          } catch (standardError) {
            console.error('❌ Erro no OrdersService:', standardError);
            throw standardError;
          }
        }
      } catch (error) {
        console.log('⚠️ Usando dados mockados devido a erro na API:', error);
        // Definir flag de dados mockados
        localStorage.setItem('usingDemoData', 'true');
        setUsingMockData(true);
        
        // Garantir que mockOrders é um array
        if (!Array.isArray(mockOrders)) {
          console.error('❌ mockOrders não é um array! Criando array vazio.');
          return [];
        }
        
        return mockOrders;
      }
    });

    // 3. Subscrever ao gerenciador para receber dados frescos
    const unsubscribe = connectionManager.subscribeToData((result: SyncResult) => {
      if (result.success && result.data) {
        // Verificar explicitamente se os dados são um array
        if (Array.isArray(result.data)) {
          console.log(`📌 Recebidos ${result.data.length} pedidos do gerenciador de conexão`);
          
          // Verificar valores dos itens para diagnóstico
          const hasItemsWithoutPrice = result.data.some(order => 
            Array.isArray(order.items) && 
            order.items.some(item => !item.unitPrice || item.unitPrice <= 0)
          );
          
          if (hasItemsWithoutPrice) {
            console.warn('⚠️ Existem itens sem preço válido nos pedidos recebidos');
          }
          
          // Verificar se há itens com variações para diagnóstico
          const itemsWithVariations = result.data.flatMap(order => 
            Array.isArray(order.items) ? 
              order.items.filter(item => item.notes && 
                (item.notes.includes('Sabor:') || 
                 item.notes.includes('Opção:') || 
                 item.notes.includes('Tipo:'))) : 
              []
          );
          
          if (itemsWithVariations.length > 0) {
            console.log(`🔍 Encontrados ${itemsWithVariations.length} itens com variações/sabores`);
            // Mostrar exemplo de variações encontradas para debug
            console.log('📋 Exemplo de variações:', itemsWithVariations.slice(0, 2).map(item => ({
              nome: item.name,
              variacao: item.notes
            })));
          }
          
          dispatch({ type: 'SET_ORDERS', payload: result.data });
          localPersistence.saveOrders(result.data);
        } else {
          console.error('❌ Dados recebidos não são um array:', result.data);
          // Tentar recuperar se possível
          if (result.data && typeof result.data === 'object') {
            // Tentar encontrar array em alguma propriedade
            for (const key of ['data', 'orders', 'results', 'items', 'pedidos']) {
              if (result.data[key] && Array.isArray(result.data[key])) {
                console.log(`🔄 Extraindo dados da propriedade ${key}`);
                const extractedData = result.data[key];
                dispatch({ type: 'SET_ORDERS', payload: extractedData });
                localPersistence.saveOrders(extractedData);
                break;
              }
            }
          }
        }
      }
    });
    
    // 4. Iniciar a primeira sincronização
    connectionManager.forceSync().finally(() => {
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    return unsubscribe;
  }, []); // Roda apenas uma vez!

  // ==================== ACTIONS ====================

  // Refresh manual - usa o gerenciador único
  const refreshOrders = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const result = await connectionManager.forceSync();
      
      if (result.error) {
        dispatch({ type: 'SET_ERROR', payload: result.error });
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Erro ao atualizar pedidos' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Atualizar status do pedido
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
    try {
      // Atualização otimista
      const updatedOrders = state.orders.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus, updatedAt: new Date() }
          : order
      );

      dispatch({
        type: 'SET_ORDERS',
        payload: updatedOrders
      });

      // Persistir localmente
      localPersistence.saveOrders(updatedOrders);

      // Tentar comunicar ao backend (opcional)
      try {
        const response = await OrdersService.updateOrderStatus(orderId, newStatus);
        if (!response.success) {
          throw new Error(response.error?.message || 'Erro ao atualizar status com OrdersService');
        }
      } catch (err) {
        console.warn('Falha ao enviar status para API, mantendo versão local', err);
      }

      // Buscar novos pedidos quando possível
      connectionManager.forceSync();

      return true;
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Erro ao atualizar status'
      });
      return false;
    }
  }, [state.orders]);

  // Atualizar pedido completo
  const updateOrder = useCallback(async (orderId: string, updates: {items: OrderItem[]}): Promise<boolean> => {
    try {
      // Atualização otimista e persistência local
      const updatedOrders = state.orders.map(order =>
        order.id === orderId
          ? { ...order, ...updates, updatedAt: new Date() }
          : order
      );

      dispatch({
        type: 'SET_ORDERS',
        payload: updatedOrders
      });

      localPersistence.saveOrders(updatedOrders);

      // Tentativa opcional de enviar alterações para API
      try {
        const response = await OrdersService.updateOrderItems(orderId, updates.items);
        if (!response.success) {
          throw new Error(response.error?.message || 'Erro ao atualizar pedido com OrdersService');
        }
      } catch (err) {
        console.warn('Falha ao enviar atualização de itens, mantendo versão local', err);
      }

      // Buscar novos pedidos quando possível
      connectionManager.forceSync();

      return true;
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Erro ao atualizar pedido'
      });
      return false;
    }
  }, [state.orders, refreshOrders]);

  // Adicionar novo pedido (não implementado no backend)
  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    try {
      // Como não é suportado pela API, simulamos localmente
      const mockOrderId = `local-${Date.now()}`;
      const newOrder: Order = {
        ...orderData,
        id: mockOrderId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      dispatch({ type: 'ADD_ORDER', payload: newOrder });
      localPersistence.saveOrders([newOrder, ...state.orders]);
      
      return mockOrderId;
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Erro ao criar pedido' 
      });
      return null;
    }
  }, [state.orders]);

  // Deletar pedido (não implementado no backend)
  const deleteOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      // Como não é suportado pela API, simulamos localmente
      dispatch({ type: 'DELETE_ORDER', payload: orderId });
      localPersistence.saveOrders(state.orders.filter(o => o.id !== orderId));
      
      return true;
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Erro ao deletar pedido' 
      });
      return false;
    }
  }, [state.orders]);

  // Limpar erro
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);
  
  // ==================== COMPUTED VALUES ====================

  // Estatísticas dos pedidos
  const statistics = useMemo(() => {
    // Garantir que orders é sempre um array
    const orders = Array.isArray(state.orders) ? state.orders : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    return {
      totalOrders: todayOrders.length,
      totalRevenue: todayOrders.reduce((sum, order) => sum + order.total, 0),
      statusCount: Object.values(OrderStatus).reduce((acc, status) => {
        acc[status] = orders.filter(order => order.status === status).length;
        return acc;
      }, {} as Record<OrderStatus, number>),
      averageOrderValue: todayOrders.length > 0 
        ? todayOrders.reduce((sum, order) => sum + order.total, 0) / todayOrders.length 
        : 0
    };
  }, [state.orders]);

  // Filtros e busca
  const getFilteredOrders = useCallback((filters: SearchFilters) => {
    // Garantir que state.orders é um array válido
    let filtered = Array.isArray(state.orders) ? [...state.orders] : [];

    // Filtro por texto
    if (filters.text && filtered.length > 0) {
      const searchLower = filters.text.toLowerCase();
      filtered = filtered.filter(order =>
        order && order.customer && 
        ((order.customer.name && order.customer.name.toLowerCase().includes(searchLower)) ||
        (order.customer.phone && order.customer.phone.includes(filters.text!)) ||
        (order.id && order.id.toLowerCase().includes(searchLower)))
      );
    }

    // Filtro por status (array)
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      filtered = filtered.filter(order => order && order.status && filters.status!.includes(order.status));
    }

    // Filtro por prioridade
    if (filters.priority) {
      filtered = filtered.filter(order => order.priority === filters.priority);
    }

    // Filtro por método de pagamento
    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      filtered = filtered.filter(order => order.paymentMethod === filters.paymentMethod);
    }

    // Filtro por data
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => new Date(order.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => new Date(order.createdAt) <= toDate);
    }

    return filtered;
  }, [state.orders]);
  
  // Verificar se os dados são mockados (IDs começando com "mock-")
  const isMockData = useMemo(() => {
    if (state.orders.length > 0) {
      return state.orders[0].id.startsWith('mock-');
    }
    return usingMockData;
  }, [state.orders, usingMockData]);
  
  return {
    // Estado
    orders: state.orders,
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    statistics,
    usingMockData: isMockData, // Retornar valor calculado
    
    // Ações
    refreshOrders,
    updateOrderStatus,
    updateOrder,
    addOrder,
    deleteOrder,
    clearError,
    
    // Utilitários
    getFilteredOrders
  };
}

export default useOrders;