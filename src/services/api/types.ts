/**
 * @fileoverview Tipos específicos para integração com API
 * @module services/api/types
 */

// ==================== TIPOS DE RESPOSTA DA API ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== TIPOS DO BACKEND ====================

export interface BackendOrder {
  _id: string;
  customer_name: string;
  customerName?: string;
  customerPhone: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    reference: string;
    city?: string;
    state?: string;
    _id: string;
  } | string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    option?: string;
    unit_type?: string;
    weight?: number;
    price_per_kg?: number;
    _id: string;
  }>;
  total: number;
  status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
  paymentMethod: string;
  changeFor?: number;
  observations?: string;
  created_at: Date;
  updatedAt: Date;
  completed_at?: Date;
  statusMessages: Array<{
    status: string;
    message: string;
    timestamp: Date;
    _id: string;
  }>;
  statusChanges: Array<{
    from: string;
    to: string;
    by: string;
    timestamp: Date;
    _id: string;
  }>;
  priceChanges: Array<any>;
  source: string;
  whatsapp_message_id?: string;
  whatsapp_chat_id?: string;
  id: string;
}

export interface UpdateStatusResponse {
  success: boolean;
  oldStatus: string;
  newStatus: string;
  order: BackendOrder;
  message: string;
}

export interface BackendApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ==================== TIPOS DE CONEXÃO ====================

export interface ConnectionStatus {
  isOnline: boolean;
  lastCheck: Date | null;
  lastSuccessfulSync: Date | null;
  retryCount: number;
  error: string | null;
}

export interface SyncResult<T = any> {
  success: boolean;
  data?: T;
  cached?: boolean;
  error?: string;
}