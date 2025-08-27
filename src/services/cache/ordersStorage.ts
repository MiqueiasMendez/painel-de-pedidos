/**
 * @fileoverview Serviço de Armazenamento Permanente de Pedidos
 * Sistema especializado para persistir pedidos localmente de forma permanente
 */

import { Order, OrderStatus } from '../../types';

export interface StoredOrder extends Order {
  storedAt: Date;
  lastSyncAt?: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  version: number;
}

export interface OrdersStorageStats {
  totalOrders: number;
  pendingSync: number;
  byStatus: Record<OrderStatus, number>;
  storageSize: number;
  oldestOrder: Date;
  newestOrder: Date;
}

class OrdersStorageService {
  private dbName = 'MercadoExpressPedidos';
  private version = 3;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('📦 Sistema de armazenamento de pedidos inicializado');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store principal de pedidos com índices otimizados
        if (!db.objectStoreNames.contains('orders')) {
          const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
          
          // Índices para consulta rápida
          ordersStore.createIndex('status', 'status', { unique: false });
          ordersStore.createIndex('createdAt', 'createdAt', { unique: false });
          ordersStore.createIndex('storedAt', 'storedAt', { unique: false });
          ordersStore.createIndex('customerId', 'customer.id', { unique: false });
          ordersStore.createIndex('orderNumber', 'orderNumber', { unique: false });
          ordersStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          ordersStore.createIndex('date_status', ['createdAt', 'status'], { unique: false });
          
          console.log('📋 Store de pedidos criado com índices otimizados');
        }

        // Store para metadados e configurações
        if (!db.objectStoreNames.contains('metadata')) {
          const metaStore = db.createObjectStore('metadata', { keyPath: 'key' });
          console.log('⚙️ Store de metadados criado');
        }

        // Store para histórico de sincronização
        if (!db.objectStoreNames.contains('sync_log')) {
          const syncStore = db.createObjectStore('sync_log', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('orderId', 'orderId', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('action', 'action', { unique: false });
          console.log('📝 Store de log de sincronização criado');
        }

        // Store para backup automático (pedidos dos últimos 7 dias)
        if (!db.objectStoreNames.contains('backup')) {
          const backupStore = db.createObjectStore('backup', { keyPath: 'id' });
          backupStore.createIndex('backupDate', 'backupDate', { unique: false });
          console.log('💾 Store de backup criado');
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  /**
   * Salva um pedido de forma permanente
   */
  async saveOrder(order: Order): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['orders', 'sync_log'], 'readwrite');
    
    const ordersStore = transaction.objectStore('orders');
    const syncStore = transaction.objectStore('sync_log');

    // Preparar pedido para armazenamento
    const storedOrder: StoredOrder = {
      ...order,
      storedAt: new Date(),
      lastSyncAt: new Date(),
      syncStatus: 'synced',
      version: 1
    };

    // Verificar se já existe
    const existingOrder = await this.getOrder(order.id);
    if (existingOrder) {
      storedOrder.version = existingOrder.version + 1;
      storedOrder.storedAt = existingOrder.storedAt; // Manter data original
    }

    return new Promise((resolve, reject) => {
      // Salvar pedido
      const orderRequest = ordersStore.put(storedOrder);
      
      // Log da operação
      const logRequest = syncStore.add({
        orderId: order.id,
        action: existingOrder ? 'update' : 'create',
        timestamp: new Date(),
        data: { orderNumber: order.orderNumber, status: order.status }
      });

      orderRequest.onsuccess = () => {
        console.log(`💾 Pedido ${order.id} salvo permanentemente`);
        resolve();
      };
      
      orderRequest.onerror = () => reject(orderRequest.error);
      logRequest.onerror = () => console.warn('Falha ao salvar log:', logRequest.error);
    });
  }

  /**
   * Salva múltiplos pedidos em lote
   */
  async saveOrdersBatch(orders: Order[]): Promise<number> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['orders'], 'readwrite');
    const store = transaction.objectStore('orders');
    
    let savedCount = 0;
    const promises = orders.map(order => {
      const storedOrder: StoredOrder = {
        ...order,
        storedAt: new Date(),
        lastSyncAt: new Date(),
        syncStatus: 'synced',
        version: 1
      };

      return new Promise<void>((resolve, reject) => {
        const request = store.put(storedOrder);
        request.onsuccess = () => {
          savedCount++;
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log(`📦 ${savedCount} pedidos salvos em lote`);
    return savedCount;
  }

  /**
   * Recupera um pedido específico
   */
  async getOrder(orderId: string): Promise<StoredOrder | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['orders'], 'readonly');
    const store = transaction.objectStore('orders');

    return new Promise((resolve, reject) => {
      const request = store.get(orderId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Recupera todos os pedidos salvos
   */
  async getAllOrders(): Promise<StoredOrder[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['orders'], 'readonly');
    const store = transaction.objectStore('orders');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        console.log(`📋 ${request.result.length} pedidos recuperados do armazenamento`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Recupera pedidos por status
   */
  async getOrdersByStatus(status: OrderStatus): Promise<StoredOrder[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['orders'], 'readonly');
    const store = transaction.objectStore('orders');
    const index = store.index('status');

    return new Promise((resolve, reject) => {
      const request = index.getAll(status);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Recupera pedidos por período
   */
  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<StoredOrder[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['orders'], 'readonly');
    const store = transaction.objectStore('orders');
    const index = store.index('createdAt');

    const range = IDBKeyRange.bound(startDate, endDate);

    return new Promise((resolve, reject) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Recupera pedidos de hoje
   */
  async getTodayOrders(): Promise<StoredOrder[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getOrdersByDateRange(today, tomorrow);
  }

  /**
   * Atualiza status de sincronização
   */
  async updateSyncStatus(orderId: string, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    const order = await this.getOrder(orderId);
    if (!order) return;

    order.syncStatus = status;
    order.lastSyncAt = new Date();
    
    await this.saveOrder(order);
  }

  /**
   * Recupera pedidos pendentes de sincronização
   */
  async getPendingSyncOrders(): Promise<StoredOrder[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['orders'], 'readonly');
    const store = transaction.objectStore('orders');
    const index = store.index('syncStatus');

    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * Recupera estatísticas do armazenamento
   */
  async getStorageStats(): Promise<OrdersStorageStats> {
    const orders = await this.getAllOrders();
    
    const stats: OrdersStorageStats = {
      totalOrders: orders.length,
      pendingSync: orders.filter(o => o.syncStatus === 'pending').length,
      byStatus: {} as Record<OrderStatus, number>,
      storageSize: orders.length,
      oldestOrder: new Date(),
      newestOrder: new Date()
    };

    // Inicializar contadores por status
    Object.values(OrderStatus).forEach(status => {
      stats.byStatus[status] = 0;
    });

    // Calcular estatísticas
    if (orders.length > 0) {
      orders.forEach(order => {
        stats.byStatus[order.status]++;
      });

      const dates = orders.map(o => new Date(o.createdAt));
      stats.oldestOrder = new Date(Math.min(...dates.map(d => d.getTime())));
      stats.newestOrder = new Date(Math.max(...dates.map(d => d.getTime())));
    }

    return stats;
  }

  /**
   * Força sincronização completa (recarrega todos os pedidos)
   */
  async forceSyncFromAPI(apiOrders: Order[]): Promise<void> {
    console.log('🔄 Iniciando sincronização forçada...');
    
    // Salvar backup dos dados locais
    const localOrders = await this.getAllOrders();
    await this.createBackup(localOrders);
    
    // Limpar e recarregar
    await this.clearAllOrders();
    await this.saveOrdersBatch(apiOrders);
    
    console.log(`✅ Sincronização concluída: ${apiOrders.length} pedidos atualizados`);
  }

  /**
   * Cria backup dos pedidos
   */
  private async createBackup(orders: StoredOrder[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['backup'], 'readwrite');
    const store = transaction.objectStore('backup');

    const backupId = `backup_${Date.now()}`;
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: backupId,
        orders: orders,
        backupDate: new Date(),
        count: orders.length
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpa todos os pedidos (use com cuidado!)
   */
  async clearAllOrders(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['orders'], 'readwrite');
    const store = transaction.objectStore('orders');

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('🗑️ Todos os pedidos foram removidos');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Salva configuração de última sincronização
   */
  async setLastSyncTime(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.put({
        key: 'lastSync',
        value: new Date().toISOString(),
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Recupera configuração de última sincronização
   */
  async getLastSyncTime(): Promise<Date | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.get('lastSync');
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? new Date(result.value) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Auto-salva pedidos recebidos da API mantendo-os permanentemente
   */
  async autoSaveFromAPI(orders: Order[]): Promise<{
    saved: number;
    updated: number;
    errors: number;
  }> {
    const stats = { saved: 0, updated: 0, errors: 0 };
    
    for (const order of orders) {
      try {
        const existing = await this.getOrder(order.id);
        
        if (existing) {
          // Atualizar apenas se o pedido da API for mais recente
          const apiDate = new Date(order.updatedAt);
          const localDate = new Date(existing.updatedAt);
          
          if (apiDate > localDate) {
            await this.saveOrder(order);
            stats.updated++;
            console.log(`🔄 Pedido ${order.id} atualizado automaticamente`);
          }
        } else {
          // Novo pedido - salvar automaticamente
          await this.saveOrder(order);
          stats.saved++;
          console.log(`💾 Novo pedido ${order.id} salvo automaticamente`);
        }
      } catch (error) {
        console.error(`❌ Erro ao auto-salvar pedido ${order.id}:`, error);
        stats.errors++;
      }
    }
    
    // Atualizar timestamp da última sincronização
    await this.setLastSyncTime();
    
    console.log(`📦 Auto-salvamento concluído: ${stats.saved} novos, ${stats.updated} atualizados, ${stats.errors} erros`);
    return stats;
  }

  /**
   * Carrega todos os pedidos salvos para inicialização
   */
  async loadSavedOrdersForStartup(): Promise<Order[]> {
    try {
      const savedOrders = await this.getAllOrders();
      
      if (savedOrders.length > 0) {
        console.log(`📂 ${savedOrders.length} pedidos carregados do armazenamento permanente`);
        
        // Ordenar por data de criação (mais recentes primeiro)
        return savedOrders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      
      return [];
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos salvos:', error);
      return [];
    }
  }

  /**
   * Mantém apenas os pedidos mais recentes (por exemplo, últimos 1000)
   */
  async cleanupOldOrders(maxOrders: number = 1000): Promise<number> {
    try {
      const allOrders = await this.getAllOrders();
      
      if (allOrders.length <= maxOrders) {
        return 0; // Nada para limpar
      }
      
      // Ordenar por data e manter apenas os mais recentes
      const sortedOrders = allOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
        const ordersToRemove = sortedOrders.slice(maxOrders);
      
      // Remover pedidos antigos
      const db = await this.ensureDB();
      const transaction = db.transaction(['orders'], 'readwrite');
      const store = transaction.objectStore('orders');
      
      let deletedCount = 0;
      for (const order of ordersToRemove) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(order.id);
          request.onsuccess = () => {
            deletedCount++;
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      }
        console.log(`🧹 ${deletedCount} pedidos antigos removidos para otimizar armazenamento`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Erro na limpeza de pedidos antigos:', error);
      return 0;
    }
  }

  /**
   * Salva um único pedido recebido em tempo real
   */
  async saveNewOrderFromAPI(order: Order): Promise<boolean> {
    try {
      await this.saveOrder(order);
      console.log(`🆕 Novo pedido ${order.id} salvo permanentemente em tempo real`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao salvar novo pedido ${order.id}:`, error);
      return false;
    }
  }

  /**
   * Atualiza status de um pedido e salva permanentemente
   */
  async updateOrderStatusPermanently(orderId: string, newStatus: OrderStatus): Promise<boolean> {
    try {
      const existingOrder = await this.getOrder(orderId);
      if (!existingOrder) {
        console.warn(`⚠️ Pedido ${orderId} não encontrado para atualização de status`);
        return false;
      }

      const updatedOrder = {
        ...existingOrder,
        status: newStatus,
        updatedAt: new Date(),
        lastSyncAt: new Date(),
        syncStatus: 'pending' as const
      };

      await this.saveOrder(updatedOrder);
      console.log(`✅ Status do pedido ${orderId} atualizado para ${newStatus} e salvo permanentemente`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao atualizar status do pedido ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Garante que dados críticos sejam sempre salvos
   */
  async ensureCriticalDataSaved(): Promise<void> {
    try {
      const stats = await this.getStorageStats();
      console.log('📊 Estatísticas de armazenamento:', {
        total: stats.totalOrders,
        pendingSync: stats.pendingSync,
        storage: `${(stats.storageSize / 1024).toFixed(2)} KB`
      });
      
      // Fazer backup em localStorage como fallback
      const recentOrders = await this.getOrdersByDateRange(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
        new Date()
      );
      
      if (recentOrders.length > 0) {
        localStorage.setItem('mercado_orders_backup', JSON.stringify({
          orders: recentOrders,
          timestamp: new Date().toISOString()
        }));
        console.log(`💿 Backup de ${recentOrders.length} pedidos recentes salvo em localStorage`);
      }
    } catch (error) {
      console.error('❌ Erro ao garantir dados críticos salvos:', error);
    }
  }
}

// Instância singleton do serviço
export const ordersStorage = new OrdersStorageService();

// Auto-inicialização quando o módulo é importado
ordersStorage.init().catch(error => {
  console.error('❌ Falha ao inicializar armazenamento de pedidos:', error);
});
