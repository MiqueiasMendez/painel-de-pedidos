/**
 * @fileoverview Botão de impressão reutilizável
 * @module components/print/PrintButton
 */

import React, { useState } from 'react';
import { Printer, ChevronDown } from 'lucide-react';
import { usePrint } from '../../hooks/usePrint';
import { Order } from '../../types';

// ==================== INTERFACES ====================
interface PrintButtonProps {
  order: Order;
  variant?: 'icon' | 'text' | 'full';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDropdown?: boolean;
}

/**
 * Botão de impressão com opções de escolha de template
 */
const PrintButton: React.FC<PrintButtonProps> = ({
  order,
  variant = 'full',
  size = 'md',
  className = '',
  showDropdown = true
}) => {
  const { printOrder, templates } = usePrint();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Classes do botão com base no tamanho
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  // Cores do botão principal
  const buttonClasses = `
    inline-flex items-center rounded-md 
    text-white bg-purple-600 hover:bg-purple-700 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
    transition-colors ${sizeClasses[size]} ${className}
  `;

  // Gerencia o clique no botão de impressão principal
  const handlePrintClick = () => {
    if (showDropdown) {
      setDropdownOpen(prev => !prev);
    } else {
      // Se não tem dropdown, imprime com o template padrão
      printOrder(order, 'completo');
    }
  };

  // Imprime com o template selecionado
  const handleTemplateClick = (templateId: string) => {
    printOrder(order, templateId);
    setDropdownOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={buttonClasses}
        onClick={handlePrintClick}
      >
        <Printer className={`${variant !== 'text' ? 'h-4 w-4' : 'hidden'} ${variant === 'full' ? 'mr-2' : ''}`} />
        {variant !== 'icon' && (
          <span>Imprimir</span>
        )}
        {showDropdown && (
          <ChevronDown className="ml-1 h-4 w-4" />
        )}
      </button>

      {/* Dropdown com opções de template */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1 divide-y divide-gray-100 dark:divide-gray-700">
            {templates.map(template => (
              <button
                key={template.id}
                className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleTemplateClick(template.id)}
              >
                <Printer className="mr-3 h-4 w-4 text-purple-500" />
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintButton;
