/**
 * @fileoverview Hook para gerenciar impressão de pedidos
 * @module hooks/usePrint
 */

import { useState, useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Order } from '../types';
import PrintService, { PrintTemplate } from '../services/print/PrintService';

// ==================== INTERFACE ====================
interface UsePrintReturn {
  printOrder: (order: Order, templateId?: string) => void;
  printMultipleOrders: (orders: Order[], templateId?: string) => void;
  showPrintPreview: (order: Order | Order[], templateId?: string) => void;
  isPrinting: boolean;
  printRef: React.RefObject<HTMLDivElement>;
  currentOrder: Order | null;
  templates: PrintTemplate[];
  currentTemplate: string;
  setCurrentTemplate: (templateId: string) => void;
  printableOrders: Order[];
}

/**
 * Hook para gerenciar impressão de pedidos
 */
export const usePrint = (): UsePrintReturn => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [printableOrders, setPrintableOrders] = useState<Order[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<string>('completo');
  const printRef = useRef<HTMLDivElement>(null);

  // Obtém todos os templates disponíveis
  const templates = PrintService.getAllTemplates();

  // Imprime um pedido específico
  const printOrder = useCallback((order: Order, templateId: string = 'completo') => {
    setCurrentOrder(order);
    setPrintableOrders([order]);
    setCurrentTemplate(templateId);
    
    // Prepara dados para impressão
    const printData = PrintService.preparePrintData(order, templateId);
    
    // Aqui poderia preparar melhor o conteúdo de impressão
    // ou abrir um modal de pré-visualização
    
    // Log da impressão
    PrintService.logPrint(order, templateId);
    
    // Aqui, em um app real, chamaríamos o método handlePrint
    // Mas isso geralmente é feito a partir do modal de pré-visualização
  }, []);

  // Imprime múltiplos pedidos
  const printMultipleOrders = useCallback((orders: Order[], templateId: string = 'completo') => {
    setCurrentOrder(null);
    setPrintableOrders(orders);
    setCurrentTemplate(templateId);
    
    // Em um cenário real, isso abriria a pré-visualização
    // com múltiplos pedidos
    
    // Log de cada impressão
    orders.forEach(order => {
      PrintService.logPrint(order, templateId);
    });
  }, []);

  // Abre o modal de pré-visualização
  const showPrintPreview = useCallback((orderOrOrders: Order | Order[], templateId: string = 'completo') => {
    if (Array.isArray(orderOrOrders)) {
      setCurrentOrder(null);
      setPrintableOrders(orderOrOrders);
    } else {
      setCurrentOrder(orderOrOrders);
      setPrintableOrders([orderOrOrders]);
    }
    setCurrentTemplate(templateId);
    
    // Aqui abriríamos o modal de pré-visualização
    // Normalmente usando um estado global ou um contexto de UI
  }, []);

  // Configura a função de impressão real (usando react-to-print)
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onBeforeGetContent: () => {
      setIsPrinting(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    },
  });

  return {
    printOrder,
    printMultipleOrders,
    showPrintPreview,
    isPrinting,
    printRef: printRef as React.RefObject<HTMLDivElement>,
    currentOrder,
    templates,
    currentTemplate,
    setCurrentTemplate,
    printableOrders
  };
};

export default usePrint;
