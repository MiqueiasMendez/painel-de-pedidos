/**
 * @fileoverview Modal profissional para edição de preços
 * @module components/modals/EditPriceModal
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Save,
  RotateCcw,
  AlertCircle,
  DollarSign,
  Percent,
  Calculator,
  History,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  TrendingDown,
  Check,
  FileText,
  Calendar,
  User,
  RefreshCw
} from 'lucide-react';
import { Order, OrderItem, ToastType, PriceHistory } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';

// ==================== INTERFACES ====================
interface EditPriceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, items: OrderItem[], reason: string) => Promise<void>;
  showToast: (message: string, type: ToastType) => void;
}

interface EditableItem extends OrderItem {
  originalPrice: number;
  originalQuantity: number;
  hasChanges: boolean;
  error?: string;
}

interface PriceCalculation {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  difference: number;
  percentChange: number;
}

interface BulkAction {
  type: 'percentage' | 'fixed';
  value: number;
  action: 'increase' | 'decrease' | 'set';
}

// ==================== CONSTANTS ====================
const PRESET_DISCOUNTS = [5, 10, 15, 20, 25, 30];
const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;
const PRICE_LIMITS = {
  min: 0.01,
  max: 9999.99
};

// ==================== HELPER COMPONENTS ====================
const PriceInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  error?: string;
  min?: number;
  max?: number;
  className?: string;
}> = ({ value, onChange, onBlur, error, min = PRICE_LIMITS.min, max = PRICE_LIMITS.max, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value.toFixed(2));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayValue(value.toFixed(2));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
    }
  };

  const handleBlur = () => {
    const numValue = parseFloat(displayValue);
    if (isNaN(numValue) || numValue < min) {
      setDisplayValue(min.toFixed(2));
      onChange(min);
    } else if (numValue > max) {
      setDisplayValue(max.toFixed(2));
      onChange(max);
    } else {
      setDisplayValue(numValue.toFixed(2));
      onChange(numValue);
    }
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          R$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full pl-10 pr-3 py-2 border rounded-lg text-right font-mono
            ${error 
              ? 'border-red-500 focus:ring-red-500/20' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-orange-500/20'
            }
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 transition-all
            ${className}
          `}
        />
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

const QuantityInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}> = ({ value, onChange, min = 1, max = 9999, className = '' }) => {
  const handleDecrease = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrease = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className={`flex items-center ${className}`}>
      <button
        onClick={handleDecrease}
        disabled={value <= min}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded disabled:opacity-50 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const newValue = parseInt(e.target.value) || min;
          onChange(Math.max(min, Math.min(max, newValue)));
        }}
        className="w-16 mx-1 px-2 py-1 text-center border rounded
          border-gray-300 dark:border-gray-600 
          bg-white dark:bg-gray-700 
          text-gray-900 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-orange-500/20"
      />
      
      <button
        onClick={handleIncrease}
        disabled={value >= max}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded disabled:opacity-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

const PriceHistoryItem: React.FC<{ history: PriceHistory }> = ({ history }) => {
  const isIncrease = history.newValue > history.oldValue;
  const difference = history.newValue - history.oldValue;
  const percentChange = ((difference / history.oldValue) * 100).toFixed(1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {history.itemName || 'Alteração de preço'}
            </p>
            {isIncrease ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 line-through">
              {formatCurrency(history.oldValue)}
            </span>
            <span>→</span>
            <span className={`font-medium ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(history.newValue)}
            </span>
            <span className={`text-xs ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
              ({isIncrease ? '+' : ''}{percentChange}%)
            </span>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span className="font-medium">Motivo:</span> {history.reason}
          </p>
        </div>
        
        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDateTime(history.timestamp)}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <User className="w-3 h-3" />
            {history.userName}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
export const EditPriceModal: React.FC<EditPriceModalProps> = ({
  order,
  isOpen,
  onClose,
  onSave,
  showToast
}) => {
  const { theme } = useTheme();
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  
  // State
  const [editedItems, setEditedItems] = useState<EditableItem[]>([]);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction>({
    type: 'percentage',
    value: 10,
    action: 'decrease'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [calculation, setCalculation] = useState<PriceCalculation>({
    subtotal: 0,
    deliveryFee: 0,
    discount: 0,
    total: 0,
    difference: 0,
    percentChange: 0
  });

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (order && isOpen) {
      // Initialize editable items
      const items: EditableItem[] = order.items.map(item => ({
        ...item,
        originalPrice: item.unitPrice,
        originalQuantity: item.quantity,
        hasChanges: false
      }));
      setEditedItems(items);
      setReason('');
      setErrors({});
      setShowHistory(false);
      setShowBulkActions(false);
      
      // Calculate initial totals
      updateCalculation(items);
    }
  }, [order, isOpen]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // ==================== HANDLERS ====================
  const updateCalculation = useCallback((items: EditableItem[]) => {
    if (!order) return;
    
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = subtotal + order.deliveryFee - (order.discount || 0);
    const difference = total - order.total;
    const percentChange = order.total > 0 ? (difference / order.total) * 100 : 0;
    
    setCalculation({
      subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount || 0,
      total,
      difference,
      percentChange
    });
  }, [order]);

  const validatePrice = (price: number): string | null => {
    if (price < PRICE_LIMITS.min) return `Preço mínimo: ${formatCurrency(PRICE_LIMITS.min)}`;
    if (price > PRICE_LIMITS.max) return `Preço máximo: ${formatCurrency(PRICE_LIMITS.max)}`;
    return null;
  };

  const handlePriceChange = (itemId: string, newPrice: number) => {
    setEditedItems(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          const totalPrice = newPrice * item.quantity;
          const hasChanges = newPrice !== item.originalPrice || item.quantity !== item.originalQuantity;
          const error = validatePrice(newPrice);
          
          return {
            ...item,
            unitPrice: newPrice,
            totalPrice,
            hasChanges,
            error: error || undefined
          };
        }
        return item;
      });
      
      updateCalculation(updated);
      return updated;
    });
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setEditedItems(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          const totalPrice = item.unitPrice * newQuantity;
          const hasChanges = item.unitPrice !== item.originalPrice || newQuantity !== item.originalQuantity;
          
          return {
            ...item,
            quantity: newQuantity,
            totalPrice,
            hasChanges
          };
        }
        return item;
      });
      
      updateCalculation(updated);
      return updated;
    });
  };

  const applyBulkAction = () => {
    setEditedItems(prev => {
      const updated = prev.map(item => {
        let newPrice = item.unitPrice;
        
        if (bulkAction.type === 'percentage') {
          const multiplier = bulkAction.value / 100;
          if (bulkAction.action === 'increase') {
            newPrice = item.unitPrice * (1 + multiplier);
          } else if (bulkAction.action === 'decrease') {
            newPrice = item.unitPrice * (1 - multiplier);
          }
        } else if (bulkAction.type === 'fixed') {
          if (bulkAction.action === 'increase') {
            newPrice = item.unitPrice + bulkAction.value;
          } else if (bulkAction.action === 'decrease') {
            newPrice = item.unitPrice - bulkAction.value;
          } else if (bulkAction.action === 'set') {
            newPrice = bulkAction.value;
          }
        }
        
        // Ensure price is within limits
        newPrice = Math.max(PRICE_LIMITS.min, Math.min(PRICE_LIMITS.max, newPrice));
        
        const totalPrice = newPrice * item.quantity;
        const hasChanges = newPrice !== item.originalPrice || item.quantity !== item.originalQuantity;
        const error = validatePrice(newPrice);
        
        return {
          ...item,
          unitPrice: newPrice,
          totalPrice,
          hasChanges,
          error: error || undefined
        };
      });
      
      updateCalculation(updated);
      showToast('Ação em massa aplicada!', ToastType.SUCCESS);
      return updated;
    });
  };

  const resetChanges = () => {
    if (!order) return;
    
    const resetItems: EditableItem[] = order.items.map(item => ({
      ...item,
      originalPrice: item.unitPrice,
      originalQuantity: item.quantity,
      hasChanges: false,
      error: undefined
    }));
    
    setEditedItems(resetItems);
    setReason('');
    setErrors({});
    updateCalculation(resetItems);
    showToast('Alterações resetadas', ToastType.INFO);
  };

  const handleSave = async () => {
    if (!order) return;
    
    // Validate all items
    const itemErrors = editedItems.filter(item => item.error);
    if (itemErrors.length > 0) {
      showToast('Corrija os erros antes de salvar', ToastType.ERROR);
      return;
    }
    
    // Check if there are changes
    const hasChanges = editedItems.some(item => item.hasChanges);
    if (!hasChanges) {
      showToast('Nenhuma alteração foi feita', ToastType.WARNING);
      return;
    }
    
    // Validate reason
    if (!reason.trim()) {
      setErrors({ reason: 'Motivo é obrigatório' });
      reasonInputRef.current?.focus();
      return;
    }
    
    if (reason.trim().length < MIN_REASON_LENGTH) {
      setErrors({ reason: `Mínimo ${MIN_REASON_LENGTH} caracteres` });
      reasonInputRef.current?.focus();
      return;
    }
    
    // Save changes
    setIsSaving(true);
    try {
      // Convert EditableItem[] back to OrderItem[]
      const itemsToSave: OrderItem[] = editedItems.map(({ 
        originalPrice, 
        originalQuantity, 
        hasChanges, 
        error, 
        ...item 
      }) => item);
      
      await onSave(order.id, itemsToSave, reason);
      showToast('Preços atualizados com sucesso! 🎉', ToastType.SUCCESS);
      onClose();
    } catch (error) {
      showToast('Erro ao salvar alterações', ToastType.ERROR);
      console.error('Error saving prices:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !order) return null;

  const hasChanges = editedItems.some(item => item.hasChanges);
  const hasErrors = editedItems.some(item => item.error);

  // Mock price history
  const mockHistory: PriceHistory[] = [
    {
      id: '1',
      orderId: order.id,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      userId: 'user1',
      userName: 'João Silva',
      field: 'unitPrice',
      itemName: 'Frango Inteiro',
      oldValue: 22.90,
      newValue: 18.90,
      reason: 'Promoção de fim de semana aplicada'
    },
    {
      id: '2',
      orderId: order.id,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      userId: 'user2',
      userName: 'Maria Santos',
      field: 'deliveryFee',
      oldValue: 7.00,
      newValue: 5.00,
      reason: 'Cliente frequente - desconto na entrega'
    }
  ];

  // ==================== RENDER ====================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Editar Preços do Pedido
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Pedido #{order.orderNumber || order.id} • {order.customer.name}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Status Indicator */}
          {hasChanges && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Você tem alterações não salvas
              </span>
            </div>
          )}
          
          {/* Bulk Actions */}
          <div className="mb-6">
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              <Calculator className="w-4 h-4" />
              Ações em Massa
              {showBulkActions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showBulkActions && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tipo
                    </label>
                    <select
                      value={bulkAction.type}
                      onChange={(e) => setBulkAction({ ...bulkAction, type: e.target.value as any })}
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                        border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    >
                      <option value="percentage">Porcentagem</option>
                      <option value="fixed">Valor Fixo</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ação
                    </label>
                    <select
                      value={bulkAction.action}
                      onChange={(e) => setBulkAction({ ...bulkAction, action: e.target.value as any })}
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                        border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    >
                      <option value="increase">Aumentar</option>
                      <option value="decrease">Diminuir</option>
                      {bulkAction.type === 'fixed' && <option value="set">Definir</option>}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Valor
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="number"
                        value={bulkAction.value}
                        onChange={(e) => setBulkAction({ ...bulkAction, value: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 pr-8 border rounded-lg bg-white dark:bg-gray-700 
                          border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        {bulkAction.type === 'percentage' ? '%' : 'R$'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={applyBulkAction}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg 
                      font-medium transition-colors"
                  >
                    Aplicar
                  </button>
                  
                  {/* Preset Discounts */}
                  {bulkAction.type === 'percentage' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Descontos rápidos:</span>
                      {PRESET_DISCOUNTS.map(discount => (
                        <button
                          key={discount}
                          onClick={() => {
                            setBulkAction({ type: 'percentage', value: discount, action: 'decrease' });
                            applyBulkAction();
                          }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 
                            dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          -{discount}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Items List */}
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Itens do Pedido
            </h3>
            
            {editedItems.map((item) => (
              <div
                key={item.id}
                className={`bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border transition-all ${
                  item.hasChanges 
                    ? 'border-orange-300 dark:border-orange-700' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  
                  {/* Product Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </h4>
                        {item.category && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.category}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <Info className="w-3 h-3 inline mr-1" />
                            {item.notes}
                          </p>
                        )}
                      </div>
                      
                      {item.hasChanges && (
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 
                          dark:text-orange-400 text-xs font-medium rounded-full">
                          Modificado
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Quantity */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                          Quantidade
                        </label>
                        <QuantityInput
                          value={item.quantity}
                          onChange={(value) => handleQuantityChange(item.id, value)}
                        />
                        {item.quantity !== item.originalQuantity && (
                          <p className="text-xs text-gray-500 mt-1">
                            Original: {item.originalQuantity}
                          </p>
                        )}
                      </div>
                      
                      {/* Unit Price */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                          Preço Unitário
                        </label>
                        <PriceInput
                          value={item.unitPrice}
                          onChange={(value) => handlePriceChange(item.id, value)}
                          error={item.error}
                        />
                        {item.unitPrice !== item.originalPrice && !item.error && (
                          <p className="text-xs text-gray-500 mt-1">
                            Original: {formatCurrency(item.originalPrice)}
                          </p>
                        )}
                      </div>
                      
                      {/* Total */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                          Total
                        </label>
                        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono font-medium text-right">
                          {formatCurrency(item.totalPrice)}
                        </div>
                        {item.hasChanges && (
                          <p className="text-xs text-gray-500 mt-1">
                            Original: {formatCurrency(item.originalPrice * item.originalQuantity)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Totals Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Resumo de Valores
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium">{formatCurrency(calculation.subtotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Taxa de Entrega:</span>
                <span className="font-medium">{formatCurrency(calculation.deliveryFee)}</span>
              </div>
              
              {calculation.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Desconto:</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(calculation.discount)}
                  </span>
                </div>
              )}
              
              <div className="border-t dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold">Total:</span>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatCurrency(calculation.total)}</div>
                    {calculation.difference !== 0 && (
                      <div className={`text-xs ${
                        calculation.difference > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {calculation.difference > 0 ? '+' : ''}{formatCurrency(Math.abs(calculation.difference))}
                        {' '}({calculation.percentChange > 0 ? '+' : ''}{calculation.percentChange.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reason for Change */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motivo da Alteração <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                ref={reasonInputRef}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errors.reason) {
                    setErrors({});
                  }
                }}
                placeholder="Descreva o motivo da alteração de preços (mínimo 10 caracteres)..."
                rows={3}
                maxLength={MAX_REASON_LENGTH}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg resize-none
                  ${errors.reason 
                    ? 'border-red-500 focus:ring-red-500/20' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-orange-500/20'
                  }
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 transition-all
                `}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              {errors.reason ? (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.reason}
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Este motivo será registrado no histórico do pedido
                </p>
              )}
              <span className="text-xs text-gray-500">
                {reason.length}/{MAX_REASON_LENGTH}
              </span>
            </div>
          </div>
          
          {/* Price History */}
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 mb-3"
            >
              <History className="w-4 h-4" />
              Histórico de Alterações
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showHistory && (
              <div className="space-y-3 animate-fade-in">
                {mockHistory.length > 0 ? (
                  mockHistory.map(history => (
                    <PriceHistoryItem key={history.id} history={history} />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Nenhuma alteração anterior registrada
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t dark:border-gray-700">
          <div className="flex items-center justify-between">
            <button
              onClick={resetChanges}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 
                hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium 
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              Resetar
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                  dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              
              <button
                onClick={handleSave}
                disabled={!hasChanges || hasErrors || isSaving}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                  ${hasChanges && !hasErrors
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPriceModal;