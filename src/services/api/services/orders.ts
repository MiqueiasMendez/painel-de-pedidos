/**
 * @fileoverview Serviço de pedidos
 * @module services/api/services/orders
 */

import { Order, OrderStatus, OrderItem } from '../../../types';
import { postJSON, getJSON } from '../client/fetch';
import { API_CONFIG } from '../config';
import { ApiResponse, BackendOrder } from '../types';
import { ApiAdapter } from '../adapter';

/**
 * Serviço para operações com pedidos
 */
export class OrdersService {
  /**
   * Obtém todos os pedidos
   */
  static async fetchOrders(): Promise<ApiResponse<Order[]>> {
    try {
      // Tentar primeiro o endpoint RESTful
      try {
        const response = await getJSON<any>(`${API_CONFIG.BASE_URL}/orders`);
        
        // Adicionar logs detalhados para debug
        console.log('🔍 Resposta crua da API:', JSON.stringify(response).substring(0, 500) + '...');
        
        // Verificar e processar resposta em diferentes formatos
        let ordersData: any[] = [];
        
        if (Array.isArray(response)) {
          console.log(`📦 Resposta é um array direto com ${response.length} itens`);
          ordersData = response;
        } 
        else if (response && typeof response === 'object') {
          // Verificar várias propriedades possíveis que podem conter os dados
          for (const key of ['data', 'orders', 'results', 'pedidos', 'items']) {
            if (response[key] && Array.isArray(response[key])) {
              console.log(`📦 Dados encontrados na propriedade '${key}' com ${response[key].length} itens`);
              ordersData = response[key];
              break;
            }
          }
        }
        
        // Logar resultado antes de normalizar
        console.log(`⚙️ Processando ${ordersData.length} pedidos antes da normalização`);
        
        // Normalizar a resposta
        const adaptedOrders = ordersData.map(order => ApiAdapter.adaptOrder(order));
        console.log(`✅ ${adaptedOrders.length} pedidos normalizados com sucesso`);
        
        return {
          success: true,
          data: adaptedOrders,
          message: `${adaptedOrders.length} pedidos obtidos com sucesso`
        };
      } catch (restError) {
        console.warn('Falha ao usar endpoint RESTful para pedidos:', restError);
        
        // Tentar endpoint legado
        const response = await postJSON<any>(`${API_CONFIG.BASE_URL}/list-orders`, {});
        
        // Logs detalhados também para o endpoint legado
        console.log('🔍 Resposta crua da API (legado):', JSON.stringify(response).substring(0, 500) + '...');
        
        // Mesmo processo de extração de dados
        let ordersData: any[] = [];
        
        if (Array.isArray(response)) {
          console.log(`📦 Resposta legado é um array direto com ${response.length} itens`);
          ordersData = response;
        } 
        else if (response && typeof response === 'object') {
          for (const key of ['data', 'orders', 'results', 'pedidos', 'items']) {
            if (response[key] && Array.isArray(response[key])) {
              console.log(`📦 Dados legado encontrados na propriedade '${key}' com ${response[key].length} itens`);
              ordersData = response[key];
              break;
            }
          }
        }
        
        const adaptedOrders = ordersData.map(order => ApiAdapter.adaptOrder(order));
        console.log(`✅ ${adaptedOrders.length} pedidos normalizados com sucesso (via endpoint legado)`);
        
        return {
          success: true,
          data: adaptedOrders,
          message: `${adaptedOrders.length} pedidos obtidos com sucesso (via endpoint legado)`
        };
      }
    } catch (error) {
      console.error('Erro ao obter pedidos:', error);
      
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Erro ao obter pedidos'
        }
      };
    }
  }
  
  /**
   * Obtém um pedido específico
   */
  static async fetchOrder(orderId: string): Promise<ApiResponse<Order>> {
    try {
      // Tentar primeiro o endpoint RESTful
      try {
        const response = await getJSON<BackendOrder>(`${API_CONFIG.BASE_URL}/orders/${orderId}`);
        
        return {
          success: true,
          data: ApiAdapter.adaptOrder(response),
          message: 'Pedido obtido com sucesso'
        };
      } catch (restError) {
        console.warn('Falha ao usar endpoint RESTful para pedido:', restError);
        
        // Tentar endpoint legado
        const response = await postJSON<BackendOrder>(`${API_CONFIG.BASE_URL}/get-order`, { id: orderId });
        
        return {
          success: true,
          data: ApiAdapter.adaptOrder(response),
          message: 'Pedido obtido com sucesso (via endpoint legado)'
        };
      }
    } catch (error) {
      console.error('Erro ao obter pedido:', error);
      
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Erro ao obter pedido'
        }
      };
    }
  }
  
  /**
   * Atualiza o status de um pedido
   */
  static async updateOrderStatus(
    orderId: string, 
    status: OrderStatus
  ): Promise<ApiResponse<Order>> {
    try {
      // Mapear o status para o formato do backend
      const backendStatus = ApiAdapter.mapFrontendToBackendStatus(status);
      
      // Tentar primeiro o endpoint RESTful
      try {
        const response = await postJSON<BackendOrder>(
          `${API_CONFIG.BASE_URL}/orders/${orderId}/status`,
          { status: backendStatus }
        );
        
        return {
          success: true,
          data: ApiAdapter.adaptOrder(response),
          message: 'Status atualizado com sucesso'
        };
      } catch (restError) {
        console.warn('Falha ao usar endpoint RESTful para atualizar status:', restError);
        
        // Tentar endpoint legado
        const response = await postJSON<BackendOrder>(
          `${API_CONFIG.BASE_URL}/update-order-status`,
          { id: orderId, status: backendStatus }
        );
        
        return {
          success: true,
          data: ApiAdapter.adaptOrder(response),
          message: 'Status atualizado com sucesso (via endpoint legado)'
        };
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Erro ao atualizar status'
        }
      };
    }
  }
  
  /**
   * Atualiza os itens de um pedido
   */
  static async updateOrderItems(
    orderId: string,
    items: OrderItem[]
  ): Promise<ApiResponse<Order>> {
    try {
      // Adaptar itens para o formato do backend
      const backendItems = items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.unitPrice
      }));
      
      // Calcular o novo total
      const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      // Tentar endpoint para atualizar itens
      const response = await postJSON<BackendOrder>(
        `${API_CONFIG.BASE_URL}/update-order`,
        { id: orderId, items: backendItems, total }
      );
      
      return {
        success: true,
        data: ApiAdapter.adaptOrder(response),
        message: 'Itens atualizados com sucesso'
      };
    } catch (error) {
      console.error('Erro ao atualizar itens:', error);
      
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Erro ao atualizar itens'
        }
      };
    }
  }
}