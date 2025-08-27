/**
 * @fileoverview Menu de ações rápidas para pedidos
 * @module components/orders/QuickActionMenu
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { Order, OrderStatus, ORDER_STATUS_CONFIG, ToastType } from '../../types';
import { useTheme } from '../../hooks/useTheme';

// ==================== INTERFACES ====================
interface QuickActionMenuProps {
  orderId: string;
  onAction?: (action: string) => void;
  showToast?: (message: string, type: ToastType) => void;
}

/**
 * Menu de ações rápidas que aparece ao clicar no botão de mais opções
 */
const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  orderId,
  onAction,
  showToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const actionIcons = {
    print: {
      icon: <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">P</span></div>,
      label: 'Imprimir pedido',
      separator: false
    },
    edit: {
      icon: <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">E</span></div>,
      label: 'Editar pedido',
      separator: false
    },
    whatsapp: {
      icon: <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">W</span></div>,
      label: 'Enviar WhatsApp',
      separator: false
    },
    call: {
      icon: <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">T</span></div>,
      label: 'Ligar para cliente',
      separator: true
    },
    duplicate: {
      icon: <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">D</span></div>,
      label: 'Duplicar pedido',
      separator: false
    },
    delete: {
      icon: <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">X</span></div>,
      label: 'Excluir pedido',
      separator: true
    }
  };

  const handleActionClick = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    
    if (onAction) {
      onAction(action);
    }
    
    if (showToast) {
      const messages: Record<string, { msg: string, type: ToastType }> = {
        print: { msg: 'Preparando impressão...', type: ToastType.INFO },
        edit: { msg: 'Editando pedido...', type: ToastType.INFO },
        whatsapp: { msg: 'Abrindo WhatsApp...', type: ToastType.INFO },
        call: { msg: 'Iniciando ligação...', type: ToastType.INFO },
        duplicate: { msg: 'Pedido duplicado com sucesso', type: ToastType.SUCCESS },
        delete: { msg: 'Pedido excluído com sucesso', type: ToastType.SUCCESS }
      };
      
      const { msg, type } = messages[action] || { msg: 'Ação executada', type: ToastType.INFO };
      showToast(msg, type);
    }
  };

  return (
    <div className='relative inline-block text-left' ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none'
        aria-label='Menu de ações'
      >
        <div className="w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">⋮</span>
        </div>
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-1 z-10 w-56 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'>
          <div className='py-1'>
            {/* Seção de ações */}
            <div className='px-1 py-1'>
              {Object.entries(actionIcons).map(([action, { icon, label, separator }], index) => (
                <React.Fragment key={action}>
                  <button
                    className='group flex items-center w-full px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md'
                    onClick={(e) => handleActionClick(action, e)}
                  >
                    <span className='mr-3'>{icon}</span>
                    {label}
                  </button>
                  {separator && index < Object.entries(actionIcons).length - 1 && (
                    <div className='my-1 border-t border-gray-100 dark:border-gray-700' />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActionMenu;
