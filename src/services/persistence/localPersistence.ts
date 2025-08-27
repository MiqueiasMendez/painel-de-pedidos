/**
 * @fileoverview Serviço de persistência local para pedidos
 * @module services/persistence/localPersistence
 */

export interface OrdersData {
  orders: any[];
  timestamp: number;
  version: string;
}

class LocalOrdersPersistence {
  private readonly STORAGE_KEY = 'mercado_orders';
  private readonly BACKUP_KEY = 'mercado_orders_backup';
  private readonly LAST_UPDATE_KEY = 'mercado_last_update';
  private readonly VERSION = '1.0';

  /**
   * Salvar pedidos localmente de forma segura
   */
  saveOrders(orders: any[]): void {
    try {
      // Verificar se orders é realmente um array
      if (!Array.isArray(orders)) {
        console.error('❌ Tentativa de salvar orders não-array:', orders);
        orders = []; // Garantir que é um array vazio em vez de undefined
      }
      
      const data: OrdersData = {
        orders,
        timestamp: Date.now(),
        version: this.VERSION
      };
      
      const dataStr = JSON.stringify(data);
      
      // Salvar principal
      localStorage.setItem(this.STORAGE_KEY, dataStr);
      
      // Backup de segurança
      localStorage.setItem(this.BACKUP_KEY, dataStr);
      localStorage.setItem(this.LAST_UPDATE_KEY, Date.now().toString());
      
      console.log(`✅ ${orders.length} pedidos salvos localmente`);
    } catch (error) {
      console.error('❌ Erro ao salvar pedidos:', error);
      // Tentar limpar dados corrompidos
      this.clearCorruptedData();
    }
  }

  /**
   * Carregar pedidos (sempre disponível, como mock)
   */
  loadOrders(): any[] {
    try {
      // Tentar carregar dados principais
      let dataStr = localStorage.getItem(this.STORAGE_KEY);
      
      // Se falhar, tentar backup
      if (!dataStr) {
        dataStr = localStorage.getItem(this.BACKUP_KEY);
        if (dataStr) {
          console.log('📂 Carregando dados do backup');
        }
      }
      
      if (dataStr) {
        const data: OrdersData = JSON.parse(dataStr);
        
        // Verificar versão dos dados
        if (data.version === this.VERSION && Array.isArray(data.orders)) {
          console.log(`📂 ${data.orders.length} pedidos carregados do cache local`);
          return data.orders;
        } else {
          console.log('⚠️ Dados em formato antigo, limpando cache');
          this.clearAllData();
        }
      }
      
      return [];
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos:', error);
      this.clearCorruptedData();
      return [];
    }
  }

  /**
   * Verificar se tem dados locais válidos
   */
  hasLocalData(): boolean {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (!dataStr) return false;
      
      const data = JSON.parse(dataStr);
      return data.version === this.VERSION && Array.isArray(data.orders) && data.orders.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Obter timestamp da última atualização
   */
  getLastUpdate(): number {
    try {
      const timestamp = localStorage.getItem(this.LAST_UPDATE_KEY);
      return timestamp ? parseInt(timestamp) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Atualizar um pedido específico
   */
  updateOrder(orderId: string, updates: any): boolean {
    try {
      const orders = this.loadOrders();
      const orderIndex = orders.findIndex(order => order.id === orderId);
      
      if (orderIndex !== -1) {
        orders[orderIndex] = { 
          ...orders[orderIndex], 
          ...updates,
          updatedAt: new Date()
        };
        this.saveOrders(orders);
        console.log(`🔄 Pedido ${orderId} atualizado localmente`);
        return true;
      }
      
      console.warn(`⚠️ Pedido ${orderId} não encontrado para atualização`);
      return false;
    } catch (error) {
      console.error('❌ Erro ao atualizar pedido:', error);
      return false;
    }
  }

  /**
   * Adicionar novos pedidos sem duplicar
   */
  addNewOrders(newOrders: any[]): number {
    try {
      if (!Array.isArray(newOrders) || newOrders.length === 0) {
        return 0;
      }

      const existingOrders = this.loadOrders();
      const existingIds = new Set(existingOrders.map(order => order.id));
      
      const trulyNewOrders = newOrders.filter(order => 
        order && order.id && !existingIds.has(order.id)
      );
      
      if (trulyNewOrders.length > 0) {
        const allOrders = [...trulyNewOrders, ...existingOrders].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        this.saveOrders(allOrders);
        console.log(`➕ ${trulyNewOrders.length} novos pedidos adicionados`);
        return trulyNewOrders.length;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Erro ao adicionar novos pedidos:', error);
      return 0;
    }
  }

  /**
   * Remover um pedido
   */
  removeOrder(orderId: string): boolean {
    try {
      const orders = this.loadOrders();
      const filteredOrders = orders.filter(order => order.id !== orderId);
      
      if (filteredOrders.length !== orders.length) {
        this.saveOrders(filteredOrders);
        console.log(`🗑️ Pedido ${orderId} removido localmente`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erro ao remover pedido:', error);
      return false;
    }
  }
  /**
   * Mesclar pedidos da API com dados locais
   */
  mergeWithApiData(apiOrders: any[]): any[] {
    try {
      const localOrders = this.loadOrders();
      const localMap = new Map(localOrders.map(order => [order.id, order]));
      
      let hasChanges = false;
      const mergedOrders = [...apiOrders];
      
      // Adicionar pedidos locais que não estão na API (modificações offline)
      for (const localOrder of localOrders) {
        const apiOrder = apiOrders.find(order => order.id === localOrder.id);
        
        if (!apiOrder) {
          // Pedido existe apenas localmente (pode ser modificação offline)
          mergedOrders.push(localOrder);
          hasChanges = true;
        } else {
          // Verificar se houve mudanças
          const localTime = new Date(localOrder.updatedAt || localOrder.createdAt).getTime();
          const apiTime = new Date(apiOrder.updatedAt || apiOrder.createdAt).getTime();
          
          if (localTime > apiTime) {
            // Versão local é mais recente (modificação offline)
            const index = mergedOrders.findIndex(order => order.id === localOrder.id);
            if (index !== -1) {
              mergedOrders[index] = localOrder;
              hasChanges = true;
            }
          }
        }
      }
      
      // Verificar se há pedidos novos da API
      const localIds = new Set(localOrders.map(order => order.id));
      const newFromApi = apiOrders.filter(order => !localIds.has(order.id));
      
      if (newFromApi.length > 0) {
        hasChanges = true;
      }
      
      if (hasChanges || apiOrders.length !== localOrders.length) {
        this.saveOrders(mergedOrders);
      }
      
      return mergedOrders;
    } catch (error) {
      console.error('❌ Erro ao mesclar dados:', error);
      return apiOrders || [];
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): { total: number; lastUpdate: Date | null; hasData: boolean } {
    const orders = this.loadOrders();
    const lastUpdate = this.getLastUpdate();
    
    return {
      total: orders.length,
      lastUpdate: lastUpdate > 0 ? new Date(lastUpdate) : null,
      hasData: orders.length > 0
    };
  }

  /**
   * Limpar dados corrompidos
   */
  private clearCorruptedData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🧹 Dados corrompidos removidos');
    } catch (error) {
      console.error('❌ Erro ao limpar dados corrompidos:', error);
    }
  }

  /**
   * Limpar todos os dados
   */
  clearAllData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      localStorage.removeItem(this.LAST_UPDATE_KEY);
      console.log('🧹 Todos os dados locais removidos');
    } catch (error) {
      console.error('❌ Erro ao limpar dados:', error);
    }
  }
}

export const localPersistence = new LocalOrdersPersistence();
