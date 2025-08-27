/**
 * @fileoverview Modal de confirmação reutilizável
 * @module components/modals/ConfirmationModal
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  HelpCircle,
  Trash2,
  Shield,
  RefreshCw
} from 'lucide-react';
import { ConfirmModalState } from '../../types';
import { useTheme } from '../../hooks/useTheme';

// ==================== INTERFACES ====================
interface ConfirmationModalProps extends ConfirmModalState {
  onClose: () => void;
  showLoadingState?: boolean;
  customIcon?: React.ElementType;
}

interface TypeConfig {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  buttonColor: string;
  borderColor: string;
}

// ==================== CONSTANTS ====================
const TYPE_CONFIGS: Record<ConfirmModalState['type'], TypeConfig> = {
  info: {
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    buttonColor: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    buttonColor: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    buttonColor: 'bg-red-500 hover:bg-red-600 focus:ring-red-500/20',
    borderColor: 'border-red-200 dark:border-red-800'
  }
};

// Predefined modal templates
export const MODAL_TEMPLATES = {
  deleteOrder: {
    title: 'Excluir Pedido',
    message: 'Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.',
    type: 'danger' as const,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    customIcon: Trash2
  },
  cancelOrder: {
    title: 'Cancelar Pedido',
    message: 'Deseja realmente cancelar este pedido? O cliente será notificado sobre o cancelamento.',
    type: 'warning' as const,
    confirmText: 'Sim, cancelar',
    cancelText: 'Não, manter'
  },
  confirmDelivery: {
    title: 'Confirmar Entrega',
    message: 'Confirma que o pedido foi entregue com sucesso?',
    type: 'info' as const,
    confirmText: 'Confirmar',
    cancelText: 'Voltar'
  },
  resetData: {
    title: 'Resetar Dados',
    message: 'Esta ação irá limpar todos os dados locais. Você tem certeza?',
    type: 'danger' as const,
    confirmText: 'Resetar Tudo',
    cancelText: 'Cancelar',
    customIcon: RefreshCw
  }
};

// ==================== HELPER COMPONENTS ====================
const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
);

const ModalIcon: React.FC<{ 
  type: ConfirmModalState['type']; 
  customIcon?: React.ElementType 
}> = ({ type, customIcon }) => {
  const config = TYPE_CONFIGS[type];
  const Icon = customIcon || config.icon;
  
  return (
    <div className={`p-3 rounded-full ${config.iconBg} animate-fade-in`}>
      <Icon className={`w-6 h-6 ${config.iconColor}`} />
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info',
  onConfirm,
  onCancel,
  onClose,
  showLoadingState = true,
  customIcon
}) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const config = TYPE_CONFIGS[type];

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // For danger actions, add a countdown
      if (type === 'danger' && confirmText.toLowerCase().includes('excluir')) {
        setCountdown(3);
      }
    } else {
      document.body.style.overflow = 'unset';
      setCountdown(null);
      setIsLoading(false);
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, type, confirmText]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter' && !isLoading && countdown === 0) {
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, countdown]);

  // ==================== HANDLERS ====================
  const handleConfirm = async () => {
    if (isLoading || (countdown !== null && countdown > 0)) return;
    
    setIsLoading(true);
    
    try {
      // Handle both sync and async onConfirm
      const result = onConfirm();
      if (result instanceof Promise) {
        await result;
      }
      
      // Small delay for better UX
      if (showLoadingState) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      onClose();
    } catch (error) {
      console.error('Error in confirmation action:', error);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    
    onCancel?.();
    onClose();
  };

  if (!isOpen) return null;

  const isCountingDown = countdown !== null && countdown > 0;

  // ==================== RENDER ====================
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className={`
        relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl 
        w-full max-w-md animate-slide-up
        ${type === 'danger' ? 'ring-2 ring-red-500/20' : ''}
      `}>
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 border-b ${config.borderColor}`}>
          <div className="flex items-start gap-4">
            <ModalIcon type={type} customIcon={customIcon} />
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              
              {/* Subtitle for danger actions */}
              {type === 'danger' && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Esta ação não pode ser desfeita
                </p>
              )}
            </div>
            
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg 
                transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 dark:text-gray-300">
            {message}
          </p>
          
          {/* Additional warning for danger actions */}
          {type === 'danger' && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg 
              border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <Shield className="w-4 h-4" />
                <span>Por segurança, confirme sua ação</span>
              </div>
            </div>
          )}
          
          {/* Countdown for danger actions */}
          {isCountingDown && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 
                bg-gray-100 dark:bg-gray-700 rounded-full">
                <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {countdown}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Aguarde para confirmar...
              </p>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl 
          flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 
              bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 
              border border-gray-300 dark:border-gray-600 rounded-lg font-medium 
              transition-all disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-gray-500/20"
          >
            {cancelText}
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isLoading || isCountingDown}
            className={`
              px-4 py-2 text-white rounded-lg font-medium transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2
              ${config.buttonColor}
              ${isLoading ? 'min-w-[100px]' : ''}
            `}
          >
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {confirmText}
                {isCountingDown && ` (${countdown})`}
              </>
            )}
          </button>
        </div>
        
        {/* Keyboard hints */}
        <div className="px-6 pb-3 text-xs text-gray-500 dark:text-gray-400 
          flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              Enter
            </kbd>
            para confirmar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              Esc
            </kbd>
            para cancelar
          </span>
        </div>
      </div>
    </div>
  );
};

// ==================== HOOK FOR EASY USAGE ====================
export const useConfirmationModal = () => {
  const [modalState, setModalState] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {}
  });

  const openModal = (config: Omit<ConfirmModalState, 'isOpen'>) => {
    setModalState({
      ...config,
      isOpen: true
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      type?: ConfirmModalState['type'];
      confirmText?: string;
      cancelText?: string;
      onCancel?: () => void;
    }
  ) => {
    openModal({
      title,
      message,
      onConfirm,
      type: options?.type || 'info',
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      onCancel: options?.onCancel
    });
  };

  return {
    modalState,
    openModal,
    closeModal,
    confirm
  };
};

export default ConfirmationModal;