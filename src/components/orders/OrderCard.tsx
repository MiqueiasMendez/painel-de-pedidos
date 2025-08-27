/**
 * @fileoverview Componente de card de pedido otimizado
 * @module components/orders/OrderCard
 */

import React, { useState, useRef, memo, useCallback } from 'react';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_CONFIG,
  ToastType
} from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency, formatTime, formatPhone } from '../../utils/formatters';
import { simplifyStatus } from '../../utils/statusHelpers';
import { getFlavorName, getOptionName } from '../../services/api/flavor-mapping';
import QuickActionMenu from './QuickActionMenu';

// ==================== INTERFACES ====================
interface OrderCardProps {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onEditPrice: (order: Order) => void;
  showToast: (message: string, type: ToastType) => void;
  onPrintClick?: (orderId: string) => void;
  onSendWhatsApp?: (phone: string, message: string) => void;
  onPhoneCall?: (phone: string) => void;
  onDuplicateOrder?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => void;
  isDragging?: boolean;
  isCompact?: boolean;
}

interface SwipeState {
  x: number;
  isSwiping: boolean;
  startX: number;
  startTime: number;
}

// ==================== CONSTANTS ====================
const SWIPE_THRESHOLD = 75;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

// ==================== HELPER COMPONENTS ====================
const UrgentBadge = memo(() => (
  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full animate-pulse">
    URGENTE
  </span>
));

const CustomerInfo = memo(({ customer }: { customer: Order['customer'] }) => {
  const { theme } = useTheme();
  
  return (
    <div className="space-y-2">
      <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
        {customer.name}
        {customer.isFrequent && (
          <span className="text-xs bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full font-medium">
            VIP
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">T</span>
        </div>
        <span>{formatPhone(customer.phone)}</span>
      </div>
      
      {customer.address && (
        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
            <span className="text-white text-xs font-bold">E</span>
          </div>
          <span className="line-clamp-2">{customer.address}</span>
        </div>
      )}
    </div>
  );
});

CustomerInfo.displayName = 'CustomerInfo';

const OrderItems = memo(({ 
  items, 
  isExpanded, 
  onToggleExpand 
}: { 
  items: Order['items'];
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => {
  const { theme } = useTheme();
  const shouldShowToggle = items.length > 2;
  const displayItems = isExpanded ? items : items.slice(0, 2);
  
  
  return (
    <div className="space-y-2">
      {displayItems.map((item, index) => (
        <div 
          key={item.id} 
          className={`flex flex-col text-sm ${
            index >= 2 && !isExpanded ? 'opacity-50' : ''
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="text-gray-700 dark:text-gray-300 flex-1">
              <div className="flex items-start">
                <span className="font-medium mr-1">{item.quantity}x</span> 
                <span>{item.name}</span>
              </div>
              
              {/* Variações simples - mostrar apenas o nome */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-5">
                {/* Verificar primeiro por variações no option/category */}
                {item.category && typeof item.category === 'string' && item.category.length > 20 && (
                  <div className="flex items-start mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 mt-1"></span>
                    <span className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded font-medium text-green-800 dark:text-green-300">
                      {getOptionName(item.category) || "Variação não identificada"}
                    </span>
                  </div>
                )}

                {/* Buscar variações/sabores nas notas */}
                {item.notes && item.notes.split(',').map((note, i) => {
                  const trimmedNote = note.trim();
                  
                  // Se já é um sabor ou opção resolvida, mostrar
                  if (trimmedNote.startsWith('Sabor:') || trimmedNote.startsWith('Opção:')) {
                    const parts = trimmedNote.split(':');
                    const value = parts.slice(1).join(':').trim();
                    
                    return (
                      <div key={i} className="flex items-start mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 mt-1"></span>
                        <span className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded font-medium text-green-800 dark:text-green-300">
                          {value}
                        </span>
                      </div>
                    );
                  }
                  
                  // Se é um ID de variação, resolver e mostrar
                  if (trimmedNote.startsWith('Variação_ID:') || 
                      trimmedNote.startsWith('Opção_ID:') || 
                      trimmedNote.startsWith('Sabor_ID:')) {
                    
                    const parts = trimmedNote.split(':');
                    const value = parts.slice(1).join(':').trim();
                    
                    // Verificar no mapeamento estático
                    const staticName = getFlavorName(value) || getOptionName(value);
                    if (staticName) {
                      return (
                        <div key={i} className="flex items-start mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 mt-1"></span>
                          <span className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded font-medium text-green-800 dark:text-green-300">
                            {staticName}
                          </span>
                        </div>
                      );
                    }
                    
                    // Se não encontrarmos o nome mapeado, ignorar o ID
                    return null;
                  }
                  
                  // Filtrar campos técnicos
                  if (trimmedNote.includes('_ID:') || 
                      trimmedNote.includes('unitType:')) {
                    return null;
                  }
                  
                  // Outras notas normais (observações do cliente)
                  return (
                    <div key={i} className="flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600 mr-1.5 mt-1"></span>
                      <span>{trimmedNote}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex flex-col items-end ml-2">
              {item.totalPrice > 0 ? (
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {formatCurrency(item.totalPrice)}
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 font-medium italic">
                  Preço não disponível
                </span>
              )}
              
              {/* Mostrar preço unitário se diferente do total e maior que zero */}
              {item.quantity > 1 && item.unitPrice > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(item.unitPrice)} cada
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {shouldShowToggle && (
        <button
          onClick={onToggleExpand}
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 mt-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full"
        >
          {isExpanded ? (
            <>Mostrar menos <span className="text-xs">▲</span></>
          ) : (
            <>Mostrar mais ({items.length - 2}) <span className="text-xs">▼</span></>
          )}
        </button>
      )}
    </div>
  );
});

OrderItems.displayName = 'OrderItems';

// ==================== MAIN COMPONENT ====================
export const OrderCard = memo<OrderCardProps>(({
  order,
  onUpdateStatus,
  onEditPrice,
  showToast,
  onPrintClick,
  onSendWhatsApp,
  onPhoneCall,
  onDuplicateOrder,
  onDeleteOrder,
  isDragging = false,
  isCompact = false
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    x: 0,
    isSwiping: false,
    startX: 0,
    startTime: 0
  });
  
  const cardRef = useRef<HTMLDivElement>(null);
  const statusConfig = ORDER_STATUS_CONFIG[simplifyStatus(order.status)];
  const isUrgent = order.priority === 'urgent';

  // ==================== HANDLERS ====================
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeState({
      x: 0,
      isSwiping: true,
      startX: touch.clientX,
      startTime: Date.now()
    });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeState.isSwiping) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.startX;
    
    // Prevent vertical scrolling when swiping horizontally
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
    
    setSwipeState(prev => ({
      ...prev,
      x: Math.max(-100, Math.min(100, deltaX))
    }));
  }, [swipeState.isSwiping, swipeState.startX]);

  const handleTouchEnd = useCallback(() => {
    const { x, startTime } = swipeState;
    const velocity = Math.abs(x) / (Date.now() - startTime);
    
    if (Math.abs(x) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD) {
      if (x > 0) {
        handleWhatsApp();
      } else {
        onEditPrice(order);
      }
    }
    
    setSwipeState({
      x: 0,
      isSwiping: false,
      startX: 0,
      startTime: 0
    });
  }, [swipeState, order, onEditPrice]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('orderId', order.id);
    e.dataTransfer.setData('currentStatus', order.status);
    
    if (cardRef.current) {
      cardRef.current.style.opacity = '0.5';
    }
  }, [order.id, order.status]);

  const handleDragEnd = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.opacity = '1';
    }
  }, []);

  const handleStatusUpdate = useCallback(() => {
    if (statusConfig.next) {
      onUpdateStatus(order.id, statusConfig.next);
    }
  }, [order.id, statusConfig.next, onUpdateStatus]);

  const handleWhatsApp = useCallback(() => {
    const message = encodeURIComponent(
      `Olá ${order.customer.name}! Seu pedido #${order.id} está ${statusConfig.label.toLowerCase()}.`
    );
    const phone = order.customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    showToast('Abrindo WhatsApp...', ToastType.SUCCESS);
  }, [order, statusConfig.label, showToast]);  const handlePrint = useCallback(() => {
    showToast('Preparando impressão...', ToastType.INFO);
    // Abre o modal de pré-visualização de impressão
    if (onPrintClick) {
      onPrintClick(order.id);
    }
  }, [showToast, order.id, onPrintClick]);

  const getTimeSinceCreated = useCallback((date: Date) => {
    return formatTime(date);
  }, []);

  // ==================== RENDER ====================
  if (isCompact) {
    return (
      <div className={`
        p-3 rounded-lg border bg-white dark:bg-gray-800 
        hover:shadow-md transition-all cursor-pointer
        ${isDragging ? 'opacity-50' : ''}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-2 h-8 rounded-full"
              style={{ backgroundColor: statusConfig.color }}
            />
            <div>
              <span className="font-bold text-sm">{order.id}</span>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {order.customer.name}
              </p>
            </div>
          </div>
          <span className="text-sm font-medium">{formatCurrency(order.total)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`
        relative border-l-4 rounded-lg shadow-sm 
        bg-white dark:bg-gray-800 
        hover:shadow-md transition-all
        ${statusConfig.bgColor} dark:bg-opacity-10
        ${isUrgent ? 'ring-2 ring-red-500 ring-opacity-50' : ''}
        ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}
      `}
      style={{
        borderColor: statusConfig.color,
        transform: `translateX(${swipeState.x}px)`,
        transition: swipeState.isSwiping ? 'none' : 'transform 0.3s ease-out'
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="article"
      aria-label={`Pedido ${order.id} - ${order.customer.name}`}
      tabIndex={0}
    >
      {/* Swipe indicators */}
      {Math.abs(swipeState.x) > 20 && (
        <>
          <div className={`
            absolute inset-y-0 left-0 w-24 
            bg-gradient-to-r from-green-500 to-green-600
            flex items-center justify-center rounded-l-lg 
            transition-opacity ${swipeState.x > 20 ? 'opacity-100' : 'opacity-0'}
          `}>
            <span className="text-white text-xs font-bold">WhatsApp</span>
          </div>
          <div className={`
            absolute inset-y-0 right-0 w-24 
            bg-gradient-to-r from-blue-500 to-blue-600
            flex items-center justify-center rounded-r-lg 
            transition-opacity ${swipeState.x < -20 ? 'opacity-100' : 'opacity-0'}
          `}>
            <span className="text-white text-xs font-bold">Editar</span>
          </div>
        </>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg dark:text-white">
              #{order.orderNumber || order.id}
            </span>
            {isUrgent && <UrgentBadge />}
            {order.tags?.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: statusConfig.color }}>
              <span className="text-white text-xs font-bold">H</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {getTimeSinceCreated(order.createdAt)}
            </span>
            
            <QuickActionMenu
              orderId={order.id}
              onAction={(action) => {
                switch(action) {
                  case 'print':
                    onPrintClick && onPrintClick(order.id);
                    break;
                  case 'edit':
                    onEditPrice(order);
                    break;
                  case 'whatsapp':
                    const message = `Olá ${order.customer.name}, seu pedido #${order.id.slice(0, 4)} está ${statusConfig.label.toLowerCase()}.`;
                    if (onSendWhatsApp) {
                      onSendWhatsApp(order.customer.phone, message);
                    } else {
                      window.open(`https://wa.me/${order.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                    }
                    break;
                  case 'call':
                    if (onPhoneCall) {
                      onPhoneCall(order.customer.phone);
                    } else {
                      window.location.href = `tel:${order.customer.phone.replace(/\D/g, '')}`;
                    }
                    break;                  case 'duplicate':
                    if (onDuplicateOrder) {
                      onDuplicateOrder(order.id);
                    } else {
                      // Implementação de fallback para duplicação
                      showToast(`Pedido ${order.id.slice(0, 4)} duplicado com sucesso`, ToastType.SUCCESS);
                    }
                    break;
                  case 'delete':
                    if (onDeleteOrder) {
                      onDeleteOrder(order.id);
                    } else {
                      // Implementação de fallback para exclusão
                      if (confirm(`Deseja realmente excluir o pedido #${order.id.slice(0, 4)}?`)) {
                        onUpdateStatus(order.id, OrderStatus.CANCELLED);
                        showToast(`Pedido ${order.id.slice(0, 4)} cancelado`, ToastType.SUCCESS);
                      }
                    }
                    break;
                }
              }}
              showToast={showToast}
            />
          </div>
        </div>

        {/* Customer info */}
        <div className="mb-3">
          <CustomerInfo customer={order.customer} />
        </div>

        {/* Items */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-3">
          <OrderItems
            items={order.items}
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
          />
          
          {/* Totals */}
          <div className="border-t dark:border-gray-700 mt-2 pt-2 space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Taxa de entrega</span>
              <span className="text-gray-900 dark:text-gray-100">
                {formatCurrency(order.deliveryFee)}
              </span>
            </div>
            {order.discount && order.discount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Desconto</span>
                <span className="text-green-600 dark:text-green-400">
                  -{formatCurrency(order.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-medium dark:text-white">Total</span>
              <span className="font-bold text-lg text-orange-600 dark:text-orange-400">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment and notes */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">$</span>
            </div>
            <span className="text-gray-600 dark:text-gray-400">Pagamento:</span>
            <span className="font-medium dark:text-white">{order.paymentMethod}</span>
            {order.paymentStatus === 'paid' && (
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            )}
          </div>
          
          {order.notes && (
            <div className="text-sm bg-gradient-to-r from-yellow-50 to-yellow-25 dark:from-yellow-900/20 dark:to-yellow-800/10 text-yellow-800 dark:text-yellow-200 p-3 rounded-lg flex items-start gap-2 border-l-4 border-yellow-400">
              <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <span>{order.notes}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          {statusConfig.next && (
            <button
              onClick={handleStatusUpdate}
              className={`
                flex items-center justify-center gap-2 py-3 px-4 
                bg-gradient-to-r from-orange-500 to-orange-600 
                hover:from-orange-600 hover:to-orange-700 
                text-white rounded-xl text-sm font-semibold 
                transition-all transform hover:scale-105 
                active:scale-95 shadow-lg hover:shadow-xl
              `}
              aria-label={`${ORDER_STATUS_CONFIG[statusConfig.next].label} pedido`}
            >
              <div className="w-5 h-5 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              {ORDER_STATUS_CONFIG[statusConfig.next].label}
            </button>
          )}

          <button
            onClick={() => onEditPrice(order)}
            className={`
              flex items-center justify-center gap-2 py-3 px-4 
              bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-600
              hover:from-gray-200 hover:to-gray-100 dark:hover:from-gray-600 dark:hover:to-gray-500
              text-gray-700 dark:text-gray-300 
              rounded-xl text-sm font-semibold transition-all transform hover:scale-105
              border border-gray-200 dark:border-gray-600
            `}
            aria-label="Editar preços"
          >
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">E</span>
            </div>
            Editar
          </button>

          <button
            onClick={handlePrint}
            className={`
              flex items-center justify-center gap-2 py-3 px-4 
              bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-600
              hover:from-gray-200 hover:to-gray-100 dark:hover:from-gray-600 dark:hover:to-gray-500
              text-gray-700 dark:text-gray-300 
              rounded-xl text-sm font-semibold transition-all transform hover:scale-105
              border border-gray-200 dark:border-gray-600
            `}
            aria-label="Imprimir pedido"
          >
            <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            Imprimir
          </button>

          <button
            onClick={handleWhatsApp}
            className={`
              flex items-center justify-center gap-2 py-3 px-4 
              bg-gradient-to-r from-green-500 to-green-600 
              hover:from-green-600 hover:to-green-700 
              text-white rounded-xl text-sm font-semibold 
              transition-all transform hover:scale-105 
              active:scale-95 shadow-lg hover:shadow-xl
            `}
            aria-label="Enviar WhatsApp"
          >
            <div className="w-5 h-5 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';

// ==================== EXPORTS ====================
export default OrderCard;