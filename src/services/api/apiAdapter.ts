/**
 * @fileoverview Adaptador para compatibilidade entre frontend e backend real
 * @module services/api/apiAdapter
 */

import { Order, OrderStatus, OrderItem, OrderPriority, ApiResponse } from '../../types';
import { BackendOrder, UpdateStatusResponse, BackendApiResponse } from '../../types/api';
import { API_CONFIG } from '../../config/api.config';
import { postJSON } from './fetchWithConfig';

/**
 * Adaptador para converter dados do backend real para o formato esperado pelo frontend
 */
export class ApiAdapter {
  private static readonly API_BASE = API_CONFIG.BASE_URL;

  // ==================== MAPEAMENTO DE STATUS ====================
  
  /**
   * Converte status do backend para frontend
   */
  private static mapBackendToFrontendStatus(backendStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'pending': OrderStatus.PENDING,
      'preparing': OrderStatus.PREPARING,
      'delivering': OrderStatus.OUT_FOR_DELIVERY,
      'completed': OrderStatus.DELIVERED,
      'cancelled': OrderStatus.CANCELLED
    };
    
    return statusMap[backendStatus] || OrderStatus.PENDING;
  }

  /**
   * Converte status do frontend para backend
   */
  private static mapFrontendToBackendStatus(frontendStatus: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'pending',
      [OrderStatus.CONFIRMED]: 'pending', // Confirmed vira pending no backend
      [OrderStatus.PREPARING]: 'preparing',
      [OrderStatus.READY]: 'preparing', // Ready vira preparing no backend
      [OrderStatus.OUT_FOR_DELIVERY]: 'delivering',
      [OrderStatus.DELIVERED]: 'completed',
      [OrderStatus.CANCELLED]: 'cancelled'
    };
    
    return statusMap[frontendStatus] || 'pending';
  }

  // ==================== ADAPTAÇÃO DE DADOS ====================

  /**
   * Converte pedido do backend para formato do frontend
   */
  static adaptOrder(backendOrder: BackendOrder): Order {
    // Processar endereço
    let addressString = '';
    if (typeof backendOrder.address === 'string') {
      addressString = backendOrder.address;
    } else if (backendOrder.address) {
      const addr = backendOrder.address;
      addressString = `${addr.street || ''}, ${addr.number || ''}, ${addr.neighborhood || ''}`;
      if (addr.reference) {
        addressString += ` - ${addr.reference}`;
      }
      if (addr.city && addr.state) {
        addressString += `, ${addr.city}/${addr.state}`;
      }
    }

    // Processar itens
    const items: OrderItem[] = (backendOrder.items || []).map(item => ({
      id: item.id || item._id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.quantity * item.price,
      category: item.option || 'Outros',
      notes: item.unit_type ? `Tipo: ${item.unit_type}` : undefined
    }));

    // Calcular subtotal (soma dos itens)
    const subtotal = items.reduce((total, item) => total + item.totalPrice, 0);

    return {
      id: backendOrder._id || backendOrder.id,
      orderNumber: undefined, // Não existe no backend
      customer: {
        id: backendOrder._id,
        name: backendOrder.customer_name || backendOrder.customerName || 'Cliente',
        phone: backendOrder.customerPhone || '',
        address: addressString,
        email: undefined,
        isFrequent: false // Não existe no backend
      },
      items,
      subtotal,
      deliveryFee: 0, // Não existe separado no backend
      discount: 0, // Não existe no backend
      total: backendOrder.total || subtotal,
      status: this.mapBackendToFrontendStatus(backendOrder.status),
      priority: 'normal' as OrderPriority, // Não existe no backend
      paymentMethod: backendOrder.paymentMethod || 'Dinheiro',
      paymentStatus: 'pending' as const, // Não existe no backend
      notes: backendOrder.observations || undefined,
      createdAt: new Date(backendOrder.created_at),
      updatedAt: new Date(backendOrder.updatedAt)
    };
  }

  /**
   * Converte resposta do backend para formato padrão
   */
  static adaptApiResponse<T>(backendResponse: any): ApiResponse<T> {
    // Se já está no formato correto
    if (backendResponse.success !== undefined) {
      return backendResponse;
    }

    // Adaptação para diferentes formatos de resposta
    if (backendResponse.status === 'success') {
      return {
        success: true,
        data: backendResponse.data || backendResponse.orders || backendResponse.result,
        message: backendResponse.message
      };
    }

    if (backendResponse.error) {
      return {
        success: false,
        error: {
          code: backendResponse.error.code || 'API_ERROR',
          message: backendResponse.error.message || backendResponse.error || 'Erro na API'
        }
      };
    }

    // Se é um array direto (como a API retorna)
    if (Array.isArray(backendResponse)) {
      return {
        success: true,
        data: backendResponse as T
      };
    }

    // Formato padrão se não há indicadores de erro
    return {
      success: true,
      data: backendResponse
    };
  }

  // ==================== MÉTODOS DE API ====================
  /**
   * Lista todos os pedidos
   */
  static async getOrders(): Promise<ApiResponse<Order[]>> {
    try {
      const data = await postJSON(`${this.API_BASE}/list-orders`, {});
      
      // A API retorna array direto
      const orders = Array.isArray(data) 
        ? data.map(order => this.adaptOrder(order))
        : [];

      return {
        success: true,
        data: orders,
        message: `${orders.length} pedidos carregados com sucesso`
      };
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Erro ao buscar pedidos'
        }
      };
    }
  }
  /**
   * Busca um pedido específico
   */
  static async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const data = await postJSON(`${this.API_BASE}/get-order`, { id: orderId });
      
      return {
        success: true,
        data: this.adaptOrder(data),
        message: 'Pedido carregado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Erro ao buscar pedido'
        }
      };
    }
  }

  /**
   * Atualiza status do pedido
   */  static async updateOrderStatus(
    orderId: string, 
    status: OrderStatus,
    message?: string
  ): Promise<ApiResponse<Order>> {
    try {
      const backendStatus = this.mapFrontendToBackendStatus(status);
      
      const data = await postJSON<UpdateStatusResponse>(`${this.API_BASE}/update-order-status`, {
        id: orderId,
        status: backendStatus,
        clientMessage: message || undefined
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao atualizar status');
      }

      return {
        success: true,
        data: this.adaptOrder(data.order),
        message: `Status atualizado de "${data.oldStatus}" para "${data.newStatus}"`
      };
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
   * Atualiza total do pedido
   */
  static async updateOrderTotal(
    orderId: string, 
    total: number,
    reason?: string
  ): Promise<ApiResponse<Order>> {
    try {
      const data = await postJSON(`${this.API_BASE}/update-order-total`, {
        id: orderId,
        total,
        reason: reason || 'Atualizado pelo painel'
      });
      
      return {
        success: true,
        data: this.adaptOrder(data),
        message: 'Total atualizado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao atualizar total:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Erro ao atualizar total'
        }
      };
    }
  }

  // ==================== MÉTODOS NÃO SUPORTADOS ====================
  // Estes métodos retornam erro pois não existem na API

  static async createOrder(): Promise<ApiResponse<Order>> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Criação de pedidos não é suportada. Use a loja online.'
      }
    };
  }

  static async deleteOrder(): Promise<ApiResponse<void>> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Exclusão de pedidos não é suportada pela API.'
      }
    };
  }

  static async duplicateOrder(): Promise<ApiResponse<Order>> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Duplicação de pedidos não é suportada pela API.'
      }
    };
  }

  static async batchUpdateStatus(): Promise<ApiResponse<Order[]>> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Atualização em lote não é suportada. Atualize um por vez.'
      }
    };
  }
}
