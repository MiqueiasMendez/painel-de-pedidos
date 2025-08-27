/**
 * @fileoverview Adaptador para compatibilidade entre frontend e backend
 * @module services/api/adapter
 */

import { Order, OrderStatus, OrderItem, OrderPriority } from '../../types';
import { BackendOrder, ApiResponse } from './types';

/**
 * Adaptador para converter dados do backend para o formato esperado pelo frontend
 */
export class ApiAdapter {
  /**
   * Extrai o nome do item, incluindo variações importantes no próprio nome
   * @param rawItem Item bruto da API
   * @returns Nome formatado com variações importantes
   */
  static extractItemName(rawItem: any): string {
    let baseName = rawItem.name || rawItem.product || rawItem.description || 'Item sem nome';
    
    // Verificar se há sabor para incluir no nome principal
    if (rawItem.flavor || rawItem.sabor) {
      return `${baseName} - ${rawItem.flavor || rawItem.sabor}`;
    }
    
    // Verificar tamanho/variante importante
    if (rawItem.size || rawItem.tamanho) {
      return `${baseName} (${rawItem.size || rawItem.tamanho})`;
    }
    
    return baseName;
  }
  
  /**
   * Extrai as notas e observações do item, incluindo variações como sabores, opções, etc.
   * @param rawItem Item bruto da API
   * @returns String formatada com todas as notas e variações
   */
  static extractItemNotes(rawItem: any): string | undefined {
    let notes = '';
    
    // Lista de campos que podem conter variações
    const variationFields = [
      { field: 'option', label: 'Opção' },
      { field: 'flavor', label: 'Sabor' },
      { field: 'sabor', label: 'Sabor' },
      { field: 'variation', label: 'Variação' },
      { field: 'variacao', label: 'Variação' },
      { field: 'variant', label: 'Variante' },
      { field: 'tipo', label: 'Tipo' },
      { field: 'type', label: 'Tipo' },
      { field: 'unit_type', label: 'Tipo' },
      { field: 'size', label: 'Tamanho' },
      { field: 'tamanho', label: 'Tamanho' }
    ];
    
    // Lista de campos que podem conter observações
    const noteFields = [
      'notes', 'note', 'observation', 'observations', 'observacao', 'obs', 'comments'
    ];
    
    // Extrair variações
    for (const { field, label } of variationFields) {
      // Pular sabor se já estiver no nome
      if ((field === 'flavor' || field === 'sabor') && (rawItem.flavor || rawItem.sabor)) {
        continue;
      }
      
      // Pular tamanho se já estiver no nome
      if ((field === 'size' || field === 'tamanho') && (rawItem.size || rawItem.tamanho)) {
        continue;
      }
      
      if (rawItem[field] && typeof rawItem[field] === 'string' && rawItem[field].trim() !== '') {
        if (notes) notes += ', ';
        notes += `${label}: ${rawItem[field]}`;
      }
    }
    
    // Extrair observações
    for (const field of noteFields) {
      if (rawItem[field] && typeof rawItem[field] === 'string' && rawItem[field].trim() !== '') {
        if (notes) notes += ', ';
        notes += rawItem[field];
      }
    }
    
    // Verificar outros campos que possam conter informações relevantes
    for (const key in rawItem) {
      // Pular campos já processados ou que são padrão
      if ([
        '_id', 'id', 'name', 'product', 'description', 'quantity', 
        'price', 'total', 'category', 'image', 'sku'
      ].includes(key)) continue;
      
      // Pular campos já verificados
      const allFieldsToSkip = [...variationFields.map(v => v.field), ...noteFields];
      if (allFieldsToSkip.includes(key)) continue;
      
      // Se for um campo de texto com valor, adicionar às notas
      if (typeof rawItem[key] === 'string' && rawItem[key].trim() !== '') {
        // Se o nome do campo parecer importante, incluir o nome do campo
        if (!['a', 'o', 'e', 'de', 'do', 'da', 'para'].includes(key.toLowerCase())) {
          if (notes) notes += ', ';
          notes += `${key}: ${rawItem[key]}`;
        }
      }
    }
    
    return notes || undefined;
  }
  /**
   * Converte status do backend para frontend
   */
  static mapBackendToFrontendStatus(backendStatus: string): OrderStatus {
    // Normalizar status para lowercase para evitar problemas de case
    const normalizedStatus = (backendStatus || '').toLowerCase().trim();
    
    const statusMap: Record<string, OrderStatus> = {
      'pending': OrderStatus.PENDING,
      'novo': OrderStatus.PENDING,
      'new': OrderStatus.PENDING,
      'pendente': OrderStatus.PENDING,
      
      'confirmed': OrderStatus.CONFIRMED,
      'confirmado': OrderStatus.CONFIRMED,
      
      'preparing': OrderStatus.PREPARING,
      'preparando': OrderStatus.PREPARING,
      'em preparo': OrderStatus.PREPARING,
      'in progress': OrderStatus.PREPARING,
      'em andamento': OrderStatus.PREPARING,
      
      'ready': OrderStatus.READY,
      'pronto': OrderStatus.READY,
      
      'delivering': OrderStatus.OUT_FOR_DELIVERY,
      'out for delivery': OrderStatus.OUT_FOR_DELIVERY,
      'em entrega': OrderStatus.OUT_FOR_DELIVERY,
      'enviado': OrderStatus.OUT_FOR_DELIVERY,
      
      'completed': OrderStatus.DELIVERED,
      'delivered': OrderStatus.DELIVERED,
      'entregue': OrderStatus.DELIVERED,
      'concluído': OrderStatus.DELIVERED,
      'concluido': OrderStatus.DELIVERED,
      
      'cancelled': OrderStatus.CANCELLED,
      'canceled': OrderStatus.CANCELLED,
      'cancelado': OrderStatus.CANCELLED
    };
    
    return statusMap[normalizedStatus] || OrderStatus.PENDING;
  }

  /**
   * Converte status do frontend para backend
   */
  static mapFrontendToBackendStatus(frontendStatus: OrderStatus): string {
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

  /**
   * Converte pedido do backend para formato do frontend
   */
  static adaptOrder(backendOrder: any): Order {
    // Garantir que temos um objeto válido
    if (!backendOrder || typeof backendOrder !== 'object') {
      console.warn('⚠️ Dados de pedido inválidos:', backendOrder);
      
      // Criar um objeto mínimo para não quebrar o app
      return {
        id: `error-${Date.now()}`,
        orderNumber: undefined,
        customer: {
          id: `error-${Date.now()}`,
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
        priority: 'normal' as OrderPriority,
        paymentMethod: 'Erro',
        paymentStatus: 'pending' as const,
        notes: 'Erro ao processar dados do pedido',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    // Verificar ID
    const id = backendOrder._id || backendOrder.id || `unknown-${Date.now()}`;
    
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

    // Processar itens - garantir que é array e que todos os campos existem
    let items: OrderItem[] = [];
    if (Array.isArray(backendOrder.items)) {
      items = backendOrder.items.map((rawItem: any) => {
        // Garantir que temos valores numéricos válidos
        const quantity = typeof rawItem.quantity === 'number' ? rawItem.quantity : 
                       typeof rawItem.quantity === 'string' ? parseFloat(rawItem.quantity) : 1;
        
        const price = typeof rawItem.price === 'number' ? rawItem.price : 
                    typeof rawItem.price === 'string' ? parseFloat(rawItem.price) : 0;
        
        return {
          id: rawItem.id || rawItem._id || `item-${Math.random().toString(36).substring(2, 9)}`,
          name: this.extractItemName(rawItem),
          quantity: quantity,
          unitPrice: price,
          totalPrice: quantity * price,
          category: rawItem.option || rawItem.category || 'Outros',
          notes: this.extractItemNotes(rawItem)
        };
      });
    }

    // Calcular subtotal (soma dos itens)
    const subtotal = items.reduce((total, item) => total + item.totalPrice, 0);

    // Verificar status
    let status = OrderStatus.PENDING;
    if (backendOrder.status) {
      status = this.mapBackendToFrontendStatus(backendOrder.status);
    }
    
    // Verificar datas
    const createdAt = backendOrder.created_at || backendOrder.createdAt || backendOrder.date || new Date();
    const updatedAt = backendOrder.updatedAt || backendOrder.updated_at || backendOrder.lastUpdate || new Date();
    
    // Verificar método de pagamento
    const paymentMethod = backendOrder.paymentMethod || 
                        backendOrder.payment_method ||
                        backendOrder.payment ||
                        'Dinheiro';
    
    // Verificar observações
    const notes = backendOrder.observations || 
                backendOrder.observation ||
                backendOrder.notes ||
                backendOrder.note ||
                undefined;
    
    // Verificar informações do cliente
    const customerName = backendOrder.customer_name || 
                       backendOrder.customerName || 
                       (backendOrder.customer && backendOrder.customer.name) ||
                       'Cliente';
    
    const customerPhone = backendOrder.customerPhone ||
                        backendOrder.customer_phone ||
                        (backendOrder.customer && backendOrder.customer.phone) ||
                        '';

    return {
      id,
      orderNumber: backendOrder.orderNumber || backendOrder.number || undefined,
      customer: {
        id: id, // Usamos o mesmo ID do pedido
        name: customerName,
        phone: customerPhone,
        address: addressString,
        email: backendOrder.customerEmail || 
            (backendOrder.customer && backendOrder.customer.email) || 
            undefined,
        isFrequent: false // Não existe no backend
      },
      items,
      subtotal,
      deliveryFee: backendOrder.deliveryFee || backendOrder.delivery_fee || 0,
      discount: backendOrder.discount || 0,
      total: backendOrder.total || backendOrder.totalPrice || subtotal,
      status,
      priority: (backendOrder.priority || 'normal') as OrderPriority,
      paymentMethod,
      paymentStatus: backendOrder.paymentStatus || backendOrder.payment_status || 'pending' as const,
      notes,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt)
    };
  }

  /**
   * Converte resposta do backend para formato padrão
   */
  static adaptApiResponse<T>(backendResponse: any): ApiResponse<T> {
    // Se for null ou undefined, erro
    if (backendResponse === null || backendResponse === undefined) {
      return {
        success: false,
        error: {
          code: 'NULL_RESPONSE',
          message: 'A resposta da API está vazia'
        }
      };
    }
    
    // Se já está no formato correto
    if (backendResponse.success !== undefined) {
      return backendResponse;
    }

    // Adaptação para diferentes formatos de resposta
    if (backendResponse.status === 'success' || backendResponse.status === 'ok') {
      return {
        success: true,
        data: backendResponse.data || backendResponse.orders || backendResponse.result || backendResponse.results,
        message: backendResponse.message
      };
    }

    if (backendResponse.status === 'error' || backendResponse.status === 'fail' || backendResponse.status === 'failed') {
      return {
        success: false,
        error: {
          code: backendResponse.code || 'API_ERROR',
          message: backendResponse.message || backendResponse.error || 'Erro na API'
        }
      };
    }

    if (backendResponse.error) {
      return {
        success: false,
        error: {
          code: backendResponse.error.code || backendResponse.code || 'API_ERROR',
          message: backendResponse.error.message || backendResponse.error || backendResponse.message || 'Erro na API'
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
    
    // Verificar se é um objeto com dados embutidos
    if (typeof backendResponse === 'object') {
      // Verificar se tem array de dados em alguma propriedade comum
      for (const key of ['data', 'orders', 'results', 'items', 'pedidos']) {
        if (backendResponse[key] && Array.isArray(backendResponse[key])) {
          return {
            success: true,
            data: backendResponse[key] as T
          };
        }
      }
    }

    // Formato padrão se não há indicadores de erro
    return {
      success: true,
      data: backendResponse
    };
  }
}