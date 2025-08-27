/**
 * @fileoverview Definições de tipos para o sistema de pedidos do Mercado Express
 * @module types
 */

// Re-export from api.ts
export * from './api';

// ==================== ENUMS ====================
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  OUT_FOR_DELIVERY = 'delivering',
  DELIVERED = 'completed',
  CANCELLED = 'cancelled'
}

export enum OrderPriority {
  NORMAL = 'normal',
  URGENT = 'urgent'
}

export enum PaymentMethod {
  CASH = 'Dinheiro',
  PIX = 'PIX',
  DEBIT_CARD = 'Cartão Débito',
  CREDIT_CARD = 'Cartão Crédito'
}

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer'
}

// ==================== INTERFACES ====================

/**
 * Interface para informações do cliente
 */
export interface Customer {
  id?: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  notes?: string;
  isFrequent?: boolean;
  orderCount?: number;
}

/**
 * Interface para itens do pedido
 */
export interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  imageUrl?: string;
  notes?: string;
  discount?: number;
  originalPrice?: number;
}

/**
 * Interface para histórico de alterações
 */
export interface PriceHistory {
  id: string;
  orderId: string;
  timestamp: Date;
  userId: string;
  userName: string;
  field: string;
  itemName?: string;
  oldValue: number;
  newValue: number;
  reason: string;
}

/**
 * Interface para o pedido
 */
export interface Order {
  id: string;
  orderNumber?: number;
  customer: Customer;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  total: number;
  status: OrderStatus;
  priority: OrderPriority;
  paymentMethod: PaymentMethod | string;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  notes?: string;
  deliveryNotes?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  assignedTo?: string;
  priceHistory?: PriceHistory[];
  tags?: string[];
  source?: 'app' | 'website' | 'whatsapp' | 'phone';
}

/**
 * Interface para estatísticas
 */
export interface Stats {
  totalOrders: number;
  totalRevenue: number;
  avgProcessingTime: number;
  avgOrderValue: number;
  ordersInProgress: number;
  ordersByStatus: Record<OrderStatus, number>;
  revenueByPaymentMethod: Record<string, number>;
  topProducts?: Array<{ name: string; quantity: number }>;
  period?: 'today' | 'week' | 'month';
}

/**
 * Interface para notificações toast
 */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Interface para configurações do usuário
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en-US' | 'es-ES';
  notifications: {
    sound: boolean;
    desktop: boolean;
    orderUpdates: boolean;
    dailySummary: boolean;
  };
  display: {
    compactMode: boolean;
    showOrderNumbers: boolean;
    autoRefreshInterval: number;
  };
}

/**
 * Interface para filtros de busca
 */
export interface SearchFilters {
  text?: string;
  status?: OrderStatus[];
  priority?: OrderPriority;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  minValue?: number;
  maxValue?: number;
  paymentMethod?: PaymentMethod | 'all';
  customer?: string;
  tags?: string[];
}

/**
 * Interface para modal de confirmação
 */
export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type: 'info' | 'warning' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Interface para item de drag and drop
 */
export interface DragItem {
  orderId: string;
  currentStatus: OrderStatus;
  index: number;
}

/**
 * Interface para WebSocket events
 */
export interface SocketEvent {
  type: 'order_created' | 'order_updated' | 'order_deleted' | 'status_changed';
  orderId: string;
  data: Partial<Order>;
  timestamp: Date;
  userId?: string;
}

// Re-export from api.ts
export * from './api';

// ==================== TYPE GUARDS ====================

/**
 * Type guard para verificar se é um OrderStatus válido
 */
export const isValidOrderStatus = (status: any): status is OrderStatus => {
  return Object.values(OrderStatus).includes(status);
};

/**
 * Type guard para verificar se é um PaymentMethod válido
 */
export const isValidPaymentMethod = (method: any): method is PaymentMethod => {
  return Object.values(PaymentMethod).includes(method);
};

// ==================== UTILITY TYPES ====================

/**
 * Tipo para campos que podem ser ordenados
 */
export type OrderableFields = 'createdAt' | 'total' | 'status' | 'priority';

/**
 * Tipo para direção de ordenação
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Tipo para configuração de ordenação
 */
export interface SortConfig {
  field: OrderableFields;
  direction: SortDirection;
}

/**
 * Tipo para ações do reducer de pedidos
 */
export type OrderAction =
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: { id: string; updates: Partial<Order> } }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'UPDATE_STATUS'; payload: { id: string; status: OrderStatus } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'BATCH_UPDATE_STATUS'; payload: { ids: string[]; status: OrderStatus } };

/**
 * Tipo para o estado do reducer de pedidos
 */
export interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

// ==================== CONSTANTS ====================

/**
 * Configurações de status dos pedidos
 */
export const ORDER_STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  next: OrderStatus | null;
  allowedTransitions: OrderStatus[];
}> = {
  [OrderStatus.PENDING]: {
    label: 'Pendente',
    color: '#f59e0b',
    bgColor: 'bg-yellow-50',
    icon: 'Clock',
    next: OrderStatus.CONFIRMED,
    allowedTransitions: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED]
  },
  [OrderStatus.CONFIRMED]: {
    label: 'Confirmado',
    color: '#ff6500',
    bgColor: 'bg-orange-50',
    icon: 'CheckCircle',
    next: OrderStatus.PREPARING,
    allowedTransitions: [OrderStatus.PREPARING, OrderStatus.CANCELLED]
  },
  [OrderStatus.PREPARING]: {
    label: 'Preparando',
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    icon: 'Package',
    next: OrderStatus.READY,
    allowedTransitions: [OrderStatus.READY, OrderStatus.CANCELLED]
  },
  [OrderStatus.READY]: {
    label: 'Pronto',
    color: '#10b981',
    bgColor: 'bg-green-50',
    icon: 'CheckCircle',
    next: OrderStatus.OUT_FOR_DELIVERY,
    allowedTransitions: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED]
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    label: 'Em Entrega',
    color: '#8b5cf6',
    bgColor: 'bg-purple-50',
    icon: 'Truck',
    next: OrderStatus.DELIVERED,
    allowedTransitions: [OrderStatus.DELIVERED]
  },
  [OrderStatus.DELIVERED]: {
    label: 'Entregue',
    color: '#6b7280',
    bgColor: 'bg-gray-50',
    icon: 'CheckCircle',
    next: null,
    allowedTransitions: []
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelado',
    color: '#ef4444',
    bgColor: 'bg-red-50',
    icon: 'XCircle',
    next: null,
    allowedTransitions: []
  }
};

/**
 * Validações de formulário
 */
export const VALIDATION_RULES = {
  MIN_PRICE: 0.01,
  MAX_PRICE: 9999.99,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 9999,
  MIN_REASON_LENGTH: 10,
  MAX_REASON_LENGTH: 500,
  PHONE_REGEX: /^\(\d{2}\) \d{4,5}-\d{4}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};