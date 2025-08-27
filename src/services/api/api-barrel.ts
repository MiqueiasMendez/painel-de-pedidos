/**
 * Arquivo de barril (barrel file) para evitar ciclos de dependência
 * Este arquivo centraliza as exportações sem criar ciclos
 */

// Re-exporta todos os tipos necessários
import { Order, OrderStatus, ApiResponse } from '../../types';
export type { Order, OrderStatus, ApiResponse };

// Exporta a função de verificação de saúde da API
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch('https://mercado-api-9sw5.onrender.com/api/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar saúde da API:', error);
    return false;
  }
}

// Implementações simplificadas dos serviços
export const ordersService = {
  async fetchOrders(): Promise<ApiResponse<Order[]>> {
    return {
      success: true,
      data: [],
      message: 'Versão simplificada para testes'
    };
  },
  
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<ApiResponse<void>> {
    return {
      success: true,
      message: 'Status atualizado com sucesso'
    };
  },
  
  async updateOrderItems(): Promise<ApiResponse<void>> {
    return {
      success: true,
      message: 'Itens atualizados com sucesso'
    };
  },
  
  async batchUpdateStatus(): Promise<ApiResponse<void>> {
    return {
      success: true,
      message: 'Status atualizado em lote com sucesso'
    };
  },
  
  async duplicateOrder(): Promise<ApiResponse<Order>> {
    return {
      success: true,
      data: {} as Order,
      message: 'Pedido duplicado com sucesso'
    };
  },
  
  async deleteOrder(): Promise<ApiResponse<string>> {
    return {
      success: true,
      message: 'Pedido excluído com sucesso'
    };
  }
};

// Serviços simplificados
export const customersService = {
  async fetchCustomers(): Promise<ApiResponse<any[]>> {
    return { 
      success: true, 
      data: [],
      message: 'Versão simplificada para testes' 
    };
  }
};

export const productsService = {
  async fetchProducts(): Promise<ApiResponse<any[]>> {
    return { 
      success: true, 
      data: [],
      message: 'Versão simplificada para testes' 
    };
  }
};
