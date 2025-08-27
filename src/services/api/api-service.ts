/**
 * @fileoverview Serviços da API
 */

import { Order, OrderStatus, ApiResponse, ApiError } from '../../types';
import { ApiAdapter } from './apiAdapter';

// Serviço de pedidos
export const ordersService = {
  async fetchOrders(): Promise<ApiResponse<Order[]>> {
    try {
      const result = await ApiAdapter.getOrders();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao buscar pedidos da API',
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      };
    }
  },

  // Alias para fetchOrders para compatibilidade
  async getAllOrders(): Promise<ApiResponse<Order[]>> {
    return this.fetchOrders();
  },
  
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<ApiResponse<void>> {
    try {
      const result = await ApiAdapter.updateOrderStatus(orderId, status);
      return {
        success: result.success,
        message: result.message,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao atualizar status do pedido',
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      };
    }
  },

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<ApiResponse<void>> {
    return {
      success: false,
      message: 'Atualização geral de pedidos não é suportada pela API',
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Esta funcionalidade não está disponível no backend atual.'
      }
    };
  },

  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Order>> {
    return {
      success: false,
      message: 'Criação de pedidos não é suportada pela API',
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Esta funcionalidade não está disponível no backend atual.'
      }
    };
  },
  
  async updateOrderItems(): Promise<ApiResponse<void>> {
    return {
      success: false,
      message: 'Atualização de itens não é suportada pela API',
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Esta funcionalidade não está disponível no backend atual.'
      }
    };
  },
  
  async batchUpdateStatus(): Promise<ApiResponse<void>> {
    return {
      success: false,
      message: 'Atualização em lote não é suportada pela API',
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Atualize os pedidos um por vez.'
      }
    };
  },
  
  async duplicateOrder(): Promise<ApiResponse<Order>> {
    return {
      success: false,
      message: 'Duplicação de pedidos não é suportada pela API',
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Esta funcionalidade não está disponível no backend atual.'
      }
    };
  },
    async deleteOrder(orderId?: string): Promise<ApiResponse<string>> {
    return {
      success: false,
      message: 'Exclusão de pedidos não é suportada pela API',
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Esta funcionalidade não está disponível no backend atual.'
      }
    };
  }
};

// Serviço de clientes
export const customersService = {
  async fetchCustomers(): Promise<ApiResponse<any[]>> {
    return {
      success: true,
      data: [],
      message: 'Versão simplificada para testes'
    };
  }
};

// Serviço de produtos
export const productsService = {
  async fetchProducts(): Promise<ApiResponse<any[]>> {
    return {
      success: true,
      data: [],
      message: 'Versão simplificada para testes'
    };
  }
};
