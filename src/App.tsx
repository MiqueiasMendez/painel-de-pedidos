import React, { useState, useCallback, useMemo, useEffect } from 'react';

// Types and hooks
import {
  Order,
  OrderStatus,
  ToastType,
  Toast,
  ConfirmModalState,
  OrderItem
} from './types';
import { useOrders } from './hooks/useOrders';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { formatCurrency } from './utils/formatters';

// Components
import OrderCard from './components/orders/OrderCard';
import DraggableOrderBoard from './components/orders/DraggableOrderBoard';
import StatisticsPanel from './components/stats/StatisticsPanel';
import EditPriceModal from './components/modals/EditPriceModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import HelpModal from './components/modals/HelpModal';
import PrintPreviewModal from './components/print/PrintPreviewModal';
import { PWAStatus } from './components/PWAStatus';
import ElectronIntegration from './components/ElectronIntegration';
import { simplifyStatus } from './utils/statusHelpers';

// ==================== SIMPLE COMPONENTS ====================

// Toast Container
const ToastContainer = ({ toasts }: { toasts: Toast[] }) => {
  const typeStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${typeStyles[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg 
            transform transition-all duration-300 animate-slide-in`}
        >
          <p className="font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};

// ==================== MAIN APP ====================
function App() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [printModalState, setPrintModalState] = useState({
    isOpen: false,
    order: null as Order | null,
    templateId: 'completo'
  });
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {}  });

  // Hooks
  const {
    orders,
    loading,
    error,
    statistics,
    refreshOrders,
    updateOrderStatus,
    updateOrder,
    addOrder,
    deleteOrder,
    clearError,
    getFilteredOrders,
    usingMockData
  } = useOrders();
  
  // Indicador de dados mockados
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Verificar se estamos usando dados mockados
  useEffect(() => {
    // Usar o valor do hook diretamente
    setIsDemoMode(usingMockData);
    
    // Armazenar a informação para o componente PWAStatus usar
    localStorage.setItem('usingDemoData', usingMockData ? 'true' : 'false');
  }, [usingMockData]);

  // Toast handler
  const showToast = useCallback((message: string, type: ToastType = ToastType.INFO) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrders();
    showToast('Pedidos atualizados!', ToastType.SUCCESS);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Ação',
      message: `Deseja alterar o status do pedido?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await updateOrderStatus(orderId, newStatus);
          showToast('Status atualizado com sucesso!', ToastType.SUCCESS);
        } catch (error) {
          showToast('Erro ao atualizar status', ToastType.ERROR);
        }
      }
    });
  };

  const handleSavePrices = async (orderId: string, items: OrderItem[], reason: string) => {
    try {
      await updateOrder(orderId, { items });
      showToast('Preços atualizados com sucesso!', ToastType.SUCCESS);
    } catch (error) {
      showToast('Erro ao atualizar preços', ToastType.ERROR);
    }
  };

  const handlePrintClick = useCallback((orderId: string) => {
    const orderToPrint = orders.find((o: Order) => o.id === orderId);
    if (orderToPrint) {
      setPrintModalState({
        isOpen: true,
        order: orderToPrint,
        templateId: 'completo'
      });
    }
  }, [orders]);

  const handleSendWhatsApp = useCallback((phone: string, message: string) => {
    const formattedPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    showToast('Abrindo WhatsApp...', ToastType.INFO);
  }, [showToast]);

  const handlePhoneCall = useCallback((phone: string) => {
    window.location.href = `tel:${phone.replace(/\D/g, '')}`;
    showToast('Iniciando chamada...', ToastType.INFO);
  }, [showToast]);  const handleDuplicateOrder = useCallback(async (orderId: string) => {
    const order = orders.find((o: Order) => o.id === orderId);
    if (!order) return;
    
    const duplicatedOrder = {
      ...order,
      id: undefined,
      orderNumber: undefined,
      createdAt: undefined,
      updatedAt: undefined
    };
    
    const result = await addOrder(duplicatedOrder);
    if (result) { // result é string | null
      showToast('Pedido duplicado com sucesso', ToastType.SUCCESS);
    } else {
      showToast('Erro ao duplicar pedido', ToastType.ERROR);
    }
  }, [orders, addOrder, showToast]);
  const handleDeleteOrder = useCallback(async (orderId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar exclusão',
      message: `Tem certeza que deseja excluir este pedido?`,
      type: 'danger',
      onConfirm: async () => {
        const result = await deleteOrder(orderId);
        if (result) { // Mudança: result é boolean, não objeto
          showToast('Pedido excluído com sucesso', ToastType.SUCCESS);
        } else {
          showToast('Erro ao excluir pedido', ToastType.ERROR);
        }
      }
    });
  }, [deleteOrder, showToast]);
  // Filter logic optimizado com useMemo
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Filtro por status
    if (filter !== 'all') {
      if (filter === OrderStatus.READY) {
        result = orders.filter(order => simplifyStatus(order.status) === OrderStatus.READY);
      } else {
        result = orders.filter(order => simplifyStatus(order.status) === OrderStatus.PENDING);
      }
    }
    
    // Filtro por busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((order: Order) =>
        order.id.toLowerCase().includes(search) ||
        order.customer.name.toLowerCase().includes(search) ||
        order.customer.phone.includes(search)
      );
    }
    
    return result;
  }, [orders, filter, searchTerm]);

  const columns = [
    { id: OrderStatus.PENDING, title: 'Pendentes', color: '#f59e0b' },
    { id: OrderStatus.READY, title: 'Prontos', color: '#10b981' }
  ];

  const displayColumns = filter === 'all' ? columns : columns.filter(col => col.id === filter);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <ToastContainer toasts={toasts} />
      
      {/* Header simplificado */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">ME</span>
              </div>
              <div>
                <h1 className="text-xl font-bold dark:text-white bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">Mercado Express</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Painel de Pedidos Moderno</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">              <PWAStatus className="hidden md:block" />
              <ElectronIntegration />
              
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold dark:text-white">{statistics.totalOrders}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Pedidos hoje</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(statistics.totalRevenue)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Faturamento</div>
                </div>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                title="Atualizar pedidos"
              >
                <div className={`w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}>
                  <span className="text-white text-xs font-bold">↻</span>
                </div>
              </button>
              
              <button
                onClick={() => setShowStats(!showStats)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                title="Estatísticas"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${showStats ? 'bg-orange-500' : 'bg-gray-500'}`}>
                  <span className="text-white text-xs font-bold">📊</span>
                </div>
              </button>
              
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                title="Ajuda"
              >
                <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">?</span>
                </div>
              </button>
            </div>
          </div>
            {/* PWA Status Mobile */}
          <div className="mt-2 md:hidden">
            <div className="flex items-center gap-2">              <PWAStatus className="flex-1" />
              <ElectronIntegration />
            </div>
          </div>
        </div>
      </header>
      
      {/* Filter Bar simplificada */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center gap-3">          <div className="flex items-center gap-2 overflow-x-auto">
            {[{ id: 'all', title: 'Todos' }, ...columns].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  filter === item.id
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-orange-600 dark:text-orange-400 border-2 border-orange-600 dark:border-orange-400'
                    : 'hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>
          
          <div className="md:ml-auto">
            <div className="relative">
              <div className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">🔍</span>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar pedido..."
                className="pl-10 pr-4 py-2 border dark:border-gray-600 rounded-xl text-sm w-full md:w-64 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm
                  focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      
      {isDemoMode && (
        <div className="m-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-300 flex items-center justify-between">
          <div>
            <span className="font-medium">Modo de Demonstração:</span> Usando dados simulados pois o servidor está indisponível.
          </div>
          <button 
            onClick={refreshOrders} 
            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm"
          >
            Tentar Reconectar
          </button>
        </div>
      )}

      {/* Painel de Estatísticas */}
      {showStats && (
        <div className="p-4">
          <StatisticsPanel 
            orders={orders} 
            period={statsPeriod}
            onChangePeriod={setStatsPeriod}
          />
        </div>
      )}

      {/* Grid de pedidos com arrastar e soltar */}
      <div className="p-4">
        <DraggableOrderBoard
          orders={filteredOrders}
          columns={displayColumns}
          filter={filter}
          onUpdateStatus={handleUpdateStatus}
          onEditPrice={setEditingOrder}
          onPrintClick={handlePrintClick}
          onSendWhatsApp={handleSendWhatsApp}
          onPhoneCall={handlePhoneCall}
          onDuplicateOrder={handleDuplicateOrder}
          onDeleteOrder={handleDeleteOrder}
          showToast={showToast}
          loading={loading}
        />
      </div>

      {/* Modals */}
      {editingOrder && (
        <EditPriceModal
          order={editingOrder}
          isOpen={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={handleSavePrices}
          showToast={showToast}
        />
      )}

      <ConfirmationModal
        {...confirmModal}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}
      
      {printModalState.isOpen && printModalState.order && (
        <PrintPreviewModal
          order={printModalState.order}
          isOpen={printModalState.isOpen}
          templateId={printModalState.templateId}
          onClose={() => setPrintModalState(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}

// App with Providers
export default function AppWithProviders() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}