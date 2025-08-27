/**
 * @fileoverview Dados mockados para quando a API estiver offline
 * @module mocks/ordersMock
 */

import { Order, OrderStatus, OrderPriority, PaymentMethod, ApiResponse } from '../types';

// ==================== MOCK DATA ====================

/**
 * Função para gerar pedidos mockados
 */
export function generateMockOrders(): Order[] {
  return [
    {
      id: "mock-1",
      orderNumber: 1001,
      customer: {
        id: "customer-1",
        name: "João Silva",
        phone: "11999887766",
        address: "Rua das Flores, 123",
        isFrequent: true,
        orderCount: 5
      },
      items: [
        {
          id: "item-1",
          name: "X-Tudo",
          quantity: 2,
          unitPrice: 25.90,
          totalPrice: 51.80,
          category: "Lanches"
        },
        {
          id: "item-2",
          name: "Refrigerante 2L",
          quantity: 1,
          unitPrice: 12.00,
          totalPrice: 12.00,
          category: "Bebidas"
        }
      ],
      subtotal: 63.80,
      deliveryFee: 8.00,      discount: 0,
      total: 71.80,
      status: OrderStatus.PENDING,
      priority: OrderPriority.NORMAL,
      paymentMethod: "Cartão de Crédito",
      paymentStatus: "pending",
      notes: "Sem cebola, por favor",
      createdAt: new Date(Date.now() - 60 * 60000), // 1 hora atrás
      updatedAt: new Date(Date.now() - 55 * 60000)
    },
    {
      id: "mock-2",
      orderNumber: 1002,
      customer: {
        id: "customer-2",
        name: "Maria Oliveira",
        phone: "11988776655",
        address: "Av. Paulista, 1000, apto 50",
        isFrequent: false
      },
      items: [
        {
          id: "item-3",
          name: "Pizza Grande Calabresa",
          quantity: 1,
          unitPrice: 49.90,
          totalPrice: 49.90,
          category: "Pizzas"
        }
      ],
      subtotal: 49.90,
      deliveryFee: 5.00,
      discount: 5.00,
      total: 49.90,
      status: OrderStatus.CONFIRMED,
      priority: OrderPriority.URGENT,
      paymentMethod: "Dinheiro",
      paymentStatus: "paid",
      notes: "Trazer troco para R$ 100",
      createdAt: new Date(Date.now() - 45 * 60000), // 45 min atrás
      updatedAt: new Date(Date.now() - 40 * 60000)
    },
    {
      id: "mock-3",
      orderNumber: 1003,
      customer: {
        id: "customer-3",
        name: "Carlos Pereira",
        phone: "11977665544",
        address: "Rua Augusta, 500",
        isFrequent: true,
        orderCount: 8
      },
      items: [
        {
          id: "item-4",
          name: "Combo Família",
          quantity: 1,
          unitPrice: 89.90,
          totalPrice: 89.90,
          category: "Combos"
        },
        {
          id: "item-5",
          name: "Batata Frita Grande",
          quantity: 2,
          unitPrice: 18.90,
          totalPrice: 37.80,
          category: "Acompanhamentos"
        }
      ],
      subtotal: 127.70,
      deliveryFee: 0.00, // Frete grátis
      discount: 10.00,      total: 117.70,
      status: OrderStatus.PREPARING,
      priority: OrderPriority.NORMAL,
      paymentMethod: "Pix",
      paymentStatus: "paid",
      createdAt: new Date(Date.now() - 30 * 60000), // 30 min atrás
      updatedAt: new Date(Date.now() - 20 * 60000)
    },
    {
      id: "mock-4",
      orderNumber: 1004,
      customer: {
        id: "customer-4",
        name: "Ana Souza",
        phone: "11966554433",
        address: "Rua Vergueiro, 1500, Bloco B, apto 102",
      },
      items: [
        {
          id: "item-6",
          name: "Salada Caesar",
          quantity: 1,
          unitPrice: 32.90,
          totalPrice: 32.90,
          category: "Saladas"
        },
        {
          id: "item-7",
          name: "Suco Natural",
          quantity: 1,
          unitPrice: 9.90,
          totalPrice: 9.90,
          category: "Bebidas"
        }
      ],
      subtotal: 42.80,
      deliveryFee: 7.00,
      discount: 0,      total: 49.80,
      status: OrderStatus.READY,
      priority: OrderPriority.NORMAL,
      paymentMethod: "Cartão de Débito",
      paymentStatus: "paid",
      notes: "Sem croutons na salada",
      createdAt: new Date(Date.now() - 25 * 60000), // 25 min atrás
      updatedAt: new Date(Date.now() - 10 * 60000)
    }
  ];
}

/**
 * Dados mockados de pedidos
 */
export const mockOrders = generateMockOrders();

/**
 * Função para criar uma resposta mockada da API
 * @param data Dados para incluir na resposta
 * @param success Status de sucesso da resposta
 * @param message Mensagem opcional
 */
export function createMockResponse<T>(data: T, success: boolean = true, message?: string): ApiResponse<T> {
  return {
    success,
    data,
    message: message || (success ? 'Operação realizada com sucesso' : 'Erro ao processar a requisição')
  };
}

export default mockOrders;
