/**
 * @fileoverview Modal de pré-visualização de impressão
 * @module components/print/PrintPreviewModal
 */

import React, { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  X,
  Printer,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus,
  Download,
  FileText,
  Copy,
  Settings,
  AlertTriangle,
  Check,
  RefreshCw,
  Package
} from 'lucide-react';
import { Order, ORDER_STATUS_CONFIG } from '../../types';
import { simplifyStatus } from '../../utils/statusHelpers';
import { formatCurrency, formatDate, formatTime, formatPhone } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';

// ==================== INTERFACES ====================
interface PrintPreviewModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  templateId?: string;
  multipleOrders?: Order[];
}

/**
 * Modal para pré-visualização antes da impressão com várias opções
 */
const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  order,
  isOpen,
  onClose,
  templateId = 'completo',
  multipleOrders = []
}) => {
  const { theme } = useTheme();
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [selectedTemplate, setSelectedTemplate] = useState(templateId);
  const [printableOrders, setPrintableOrders] = useState<Order[]>([]);
  const [margins, setMargins] = useState({
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  });
  const [options, setOptions] = useState({
    showHeader: true,
    showFooter: true,
    showLogo: true,
    showPrices: true,
    showCustomerDetails: true
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Preparar os pedidos para impressão
  useEffect(() => {
    if (order) {
      setPrintableOrders([order]);
    } else if (multipleOrders.length > 0) {
      setPrintableOrders(multipleOrders);
    }
  }, [order, multipleOrders]);

  // Escape fecha o modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Função para realizar a impressão
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Pedido ${printableOrders[0]?.orderNumber || printableOrders[0]?.id.slice(0, 6)}`,
    onBeforeGetContent: () => {
      setIsPrinting(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    },
    pageStyle: `
      @page {
        size: auto;
        margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
      }
    `
  });

  // Controladores de zoom
  const zoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const zoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  // Altera as margens
  const handleMarginChange = (type: keyof typeof margins, value: number) => {
    setMargins(prev => ({
      ...prev,
      [type]: Math.max(0, Math.min(50, value))
    }));
  };

  // Altera as opções de impressão
  const toggleOption = (option: keyof typeof options) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Se o modal não estiver aberto, não renderiza nada
  if (!isOpen) return null;

  // Templates disponíveis
  const templates = [
    { id: 'completo', name: 'Completo (com preços)' },
    { id: 'cozinha', name: 'Cozinha (sem preços)' },
    { id: 'entrega', name: 'Entrega (resumido)' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay de fundo */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl w-full">
          {/* Header do modal */}
          <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Printer className="w-5 h-5 text-purple-500 mr-2" />
              Pré-visualização de Impressão
            </h3>
            <div className="flex items-center space-x-2">
              <select
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-1 px-3 pr-8 rounded leading-tight focus:outline-none focus:ring-1 focus:ring-purple-500"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                onClick={onClose}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Corpo do modal */}
          <div className="px-6 py-4 flex flex-col md:flex-row h-[70vh]">
            {/* Painel de configurações (condicional) */}
            {showSettings && (
              <div className="w-full md:w-64 pr-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Margens (mm)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400">Superior</label>
                      <div className="flex items-center">
                        <button 
                          className="p-1 bg-gray-100 dark:bg-gray-700 rounded-l"
                          onClick={() => handleMarginChange('top', margins.top - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={margins.top}
                          onChange={(e) => handleMarginChange('top', parseInt(e.target.value))}
                          className="w-12 py-1 px-2 text-center border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                        />
                        <button 
                          className="p-1 bg-gray-100 dark:bg-gray-700 rounded-r"
                          onClick={() => handleMarginChange('top', margins.top + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400">Direita</label>
                      <div className="flex items-center">
                        <button 
                          className="p-1 bg-gray-100 dark:bg-gray-700 rounded-l"
                          onClick={() => handleMarginChange('right', margins.right - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={margins.right}
                          onChange={(e) => handleMarginChange('right', parseInt(e.target.value))}
                          className="w-12 py-1 px-2 text-center border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                        />
                        <button 
                          className="p-1 bg-gray-100 dark:bg-gray-700 rounded-r"
                          onClick={() => handleMarginChange('right', margins.right + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400">Inferior</label>
                      <div className="flex items-center">
                        <button 
                          className="p-1 bg-gray-100 dark:bg-gray-700 rounded-l"
                          onClick={() => handleMarginChange('bottom', margins.bottom - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={margins.bottom}
                          onChange={(e) => handleMarginChange('bottom', parseInt(e.target.value))}
                          className="w-12 py-1 px-2 text-center border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                        />
                        <button 
                          className="p-1 bg-gray-100 dark:bg-gray-700 rounded-r"
                          onClick={() => handleMarginChange('bottom', margins.bottom + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400">Esquerda</label>
                      <div className="flex items-center">
                        <button 
                          className="p-1 bg-gray-100 dark:bg-gray-700 rounded-l"
                          onClick={() => handleMarginChange('left', margins.left - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={margins.left}
                          onChange={(e) => handleMarginChange('left', parseInt(e.target.value))}
                          className="w-12 py-1 px-2 text-center border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                        />
                        <button 
                          className="p-1 bg-gray-100 dark:bg-gray-700 rounded-r"
                          onClick={() => handleMarginChange('left', margins.left + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Opções</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={options.showHeader}
                        onChange={() => toggleOption('showHeader')}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Exibir cabeçalho</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={options.showFooter}
                        onChange={() => toggleOption('showFooter')}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Exibir rodapé</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={options.showLogo}
                        onChange={() => toggleOption('showLogo')}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Exibir logo</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={options.showPrices}
                        onChange={() => toggleOption('showPrices')}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Exibir preços</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={options.showCustomerDetails}
                        onChange={() => toggleOption('showCustomerDetails')}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Detalhes do cliente</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Dicas</h4>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
                    <p className="flex items-start">
                      <AlertTriangle className="w-3 h-3 text-yellow-500 mr-1 mt-0.5 flex-shrink-0" />
                      Ajuste as margens conforme a impressora utilizada.
                    </p>
                    <p className="flex items-start">
                      <Check className="w-3 h-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                      Para visualizar melhor, use o zoom.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Área de visualização */}
            <div className={`flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 rounded ${showSettings ? 'md:ml-6' : ''}`}>
              <div className="flex justify-center p-4">
                <div className="bg-white shadow-md rounded-md p-4" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
                  <div ref={printRef} className="print-content w-[210mm]">
                    {/* Header do documento (visível apenas na pré-visualização) */}
                    {options.showHeader && (
                      <div className="mb-4 border-b pb-3 flex items-center justify-between print-header">
                        {options.showLogo && (
                          <div className="flex items-center">
                            <div className="bg-orange-500 text-white p-2 rounded-md mr-2">
                              <Package className="w-8 h-8" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-orange-500">Mercado Express</h2>
                              <p className="text-sm text-gray-500">Sistema de Pedidos</p>
                            </div>
                          </div>
                        )}
                        <div className="text-right">
                          <h3 className="font-bold text-gray-700">
                            {selectedTemplate === 'completo' ? 'COMPROVANTE DE PEDIDO' : 
                             selectedTemplate === 'cozinha' ? 'PEDIDO PARA PREPARO' : 
                             'NOTA DE ENTREGA'}
                          </h3>
                          <p className="text-sm text-gray-500">Impresso em {formatDate(new Date())} às {formatTime(new Date())}</p>
                        </div>
                      </div>
                    )}

                    {/* Conteúdo do pedido */}
                    {printableOrders.map((orderItem, index) => (
                      <div key={orderItem.id} className={`${index > 0 ? 'mt-8 pt-8 border-t' : ''}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h2 className="text-lg font-bold">
                              Pedido #{orderItem.orderNumber || orderItem.id.slice(0, 6)}
                            </h2>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <span className="mr-3">{formatDate(orderItem.createdAt)}</span>
                              <span className="mr-3">{formatTime(orderItem.createdAt)}</span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                                style={{
                                  backgroundColor: `${ORDER_STATUS_CONFIG[simplifyStatus(orderItem.status)].bgColor}`,
                                  color: ORDER_STATUS_CONFIG[simplifyStatus(orderItem.status)].color
                                }}>
                                {ORDER_STATUS_CONFIG[simplifyStatus(orderItem.status)].label}
                              </span>
                            </div>
                          </div>
                          {options.showPrices && (
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Valor Total</p>
                              <p className="text-xl font-bold text-orange-500">{formatCurrency(orderItem.total)}</p>
                            </div>
                          )}
                        </div>

                        {/* Informações do cliente */}
                        {options.showCustomerDetails && (
                          <div className="mb-4 bg-gray-50 p-3 rounded-md">
                            <h3 className="text-sm font-medium text-gray-600 mb-1">Informações do Cliente</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="font-semibold">{orderItem.customer.name}</p>
                                <p>{formatPhone(orderItem.customer.phone)}</p>
                              </div>
                              {orderItem.customer.address && (
                                <div className="col-span-2 mt-1">
                                  <p className="text-gray-600">{orderItem.customer.address}</p>
                                </div>
                              )}
                              {orderItem.deliveryNotes && (
                                <div className="col-span-2 mt-1">
                                  <p className="text-gray-500 text-xs italic">Obs: {orderItem.deliveryNotes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Lista de itens */}
                        <div className="mb-4">
                          <h3 className="text-sm font-medium text-gray-600 mb-2">Itens do Pedido</h3>
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th scope="col" className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Item
                                </th>
                                <th scope="col" className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Qtd
                                </th>
                                {options.showPrices && (
                                  <>
                                    <th scope="col" className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Preço Unit.
                                    </th>
                                    <th scope="col" className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Total
                                    </th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {orderItem.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-3 text-sm">
                                    <div className="font-medium text-gray-900">{item.name}</div>
                                    {item.notes && <div className="text-xs text-gray-500 mt-1">Obs: {item.notes}</div>}
                                  </td>
                                  <td className="py-3 text-sm text-right text-gray-900 font-medium">
                                    {item.quantity}
                                  </td>
                                  {options.showPrices && (
                                    <>
                                      <td className="py-3 text-sm text-right text-gray-900">
                                        {formatCurrency(item.unitPrice)}
                                      </td>
                                      <td className="py-3 text-sm text-right text-gray-900 font-medium">
                                        {formatCurrency(item.totalPrice)}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Resumo do pedido (apenas se mostrar preços) */}
                        {options.showPrices && (
                          <div className="mb-4 border-t pt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Subtotal:</span>
                              <span className="text-gray-900">{formatCurrency(orderItem.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Taxa de entrega:</span>
                              <span className="text-gray-900">{formatCurrency(orderItem.deliveryFee)}</span>
                            </div>
                            {orderItem.discount && orderItem.discount > 0 && (
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Desconto:</span>
                                <span className="text-red-500">-{formatCurrency(orderItem.discount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-medium text-base mt-2 pt-2 border-t">
                              <span>Total:</span>
                              <span className="text-orange-500">{formatCurrency(orderItem.total)}</span>
                            </div>
                          </div>
                        )}

                        {/* Informações de pagamento */}
                        {options.showPrices && (
                          <div className="mb-4 text-sm">
                            <p><span className="text-gray-600">Forma de pagamento:</span> <span className="font-medium">{orderItem.paymentMethod}</span></p>
                            {orderItem.notes && (
                              <p className="mt-1 text-gray-500 text-xs italic">Observações: {orderItem.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Rodapé do documento */}
                    {options.showFooter && (
                      <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                        <p>Mercado Express - Sistema de Pedidos</p>
                        <p className="mt-1">Contato: (11) 99999-9999 | contato@mercadoexpress.com</p>
                        <p className="mt-3">Obrigado pela preferência!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer do modal com controles */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex flex-wrap items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <button
                  className="p-1.5 rounded-l-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                  onClick={zoomOut}
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="px-2 py-1 bg-white dark:bg-gray-800 border-y border-gray-300 dark:border-gray-700 w-16 text-center">
                  {zoom}%
                </div>
                <button
                  className="p-1.5 rounded-r-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                  onClick={zoomIn}
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <FileText className="w-3.5 h-3.5 mr-1" />
                {printableOrders.length} {printableOrders.length === 1 ? 'pedido' : 'pedidos'}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                className="py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 flex items-center"
                onClick={handlePrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
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

export default PrintPreviewModal;
