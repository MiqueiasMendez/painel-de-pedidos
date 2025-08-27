/**
 * @fileoverview Gerenciador único de conexões com a API
 * SOLUÇÃO: Uma única instância que controla TODAS as conexões
 */

import { API_CONFIG } from '../../config/api.config';
import { checkApiHealth } from './api-utils';
import { ordersService } from './api-service';
import { Order } from '../../types';

export interface ConnectionStatus {
  isOnline: boolean;
  lastCheck: Date | null;
  lastSuccessfulSync: Date | null;
  retryCount: number;
  error: string | null;
}

export interface SyncResult {
  success: boolean;
  data?: Order[];
  cached?: boolean;
  error?: string;
}

class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  
  private status: ConnectionStatus = {
    isOnline: false,
    lastCheck: null,
    lastSuccessfulSync: null,
    retryCount: 0,
    error: null
  };
  
  private subscribers: Array<(status: ConnectionStatus) => void> = [];
  private dataSubscribers: Array<(result: SyncResult) => void> = [];
  
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private cachedData: Order[] = [];
  private lastSyncTime = 0;
  private lastConsoleLog = 0;
  
  // CONFIGURAÇÃO: Máximo 1 requisição a cada 5 minutos
  private readonly SYNC_INTERVAL = API_CONFIG.SYNC_INTERVAL; // 5 minutos
  private readonly MIN_SYNC_GAP = 30 * 1000; // Mínimo 30s entre syncs
  private readonly LOG_INTERVAL = 10 * 1000; // Máximo 1 log a cada 10s

  private boundHandleOnline: () => void;
  private boundHandleOffline: () => void;

  private constructor() {
    this.boundHandleOnline = this.handleOnline.bind(this);
    this.boundHandleOffline = this.handleOffline.bind(this);
    this.initializeConnection();
  }
  
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }
  
  /**
   * Inscrever para receber atualizações de status
   */
  public subscribe(callback: (status: ConnectionStatus) => void): () => void {
    this.subscribers.push(callback);
    
    // Enviar status atual imediatamente
    callback(this.status);
    
    // Retornar função de unsubscribe
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
  
  /**
   * Inscrever para receber dados
   */
  public subscribeToData(callback: (result: SyncResult) => void): () => void {
    this.dataSubscribers.push(callback);
    
    // Enviar dados em cache se existirem
    if (this.cachedData.length > 0) {
      callback({
        success: true,
        data: this.cachedData,
        cached: true
      });
    }
    
    return () => {
      const index = this.dataSubscribers.indexOf(callback);
      if (index > -1) {
        this.dataSubscribers.splice(index, 1);
      }
    };
  }
  
  /**
   * Forçar sincronização (respeitando rate limit)
   */
  public async forceSync(): Promise<SyncResult> {
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    
    if (timeSinceLastSync < this.MIN_SYNC_GAP && this.cachedData.length > 0) {
      console.log('⏰ Rate limit: usando dados em cache');
      return {
        success: true,
        data: this.cachedData,
        cached: true
      };
    }
    
    return this.performSync(true);
  }
  
  /**
   * Obter dados (cache primeiro, depois API se necessário)
   */
  public async getData(): Promise<SyncResult> {
    // Se tem dados em cache e são recentes, retornar imediatamente
    const now = Date.now();
    const cacheAge = now - this.lastSyncTime;
    
    if (this.cachedData.length > 0 && cacheAge < this.SYNC_INTERVAL) {
      return {
        success: true,
        data: this.cachedData,
        cached: true
      };
    }
    
    // Caso contrário, tentar sync
    return this.performSync();
  }
    private async initializeConnection() {
    console.log('🔧 Inicializando gerenciador de conexão único');
    
    // Verificação inicial
    await this.performSync();
    
    // Configurar sync periódico (5 minutos)
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      // Verificar se já está sincronizando
      if (!this.isSyncing) {
        this.performSync();
      } else if (Date.now() - this.lastConsoleLog > this.LOG_INTERVAL) {
        console.log('⏭️ Sync periódico ignorado (sync em andamento)');
        this.lastConsoleLog = Date.now();
      }
    }, this.SYNC_INTERVAL);
    
    // Remover listeners antigos para evitar duplicidade
    window.removeEventListener('online', this.boundHandleOnline);
    window.removeEventListener('offline', this.boundHandleOffline);

    // Listeners de rede
    window.addEventListener('online', this.boundHandleOnline);
    window.addEventListener('offline', this.boundHandleOffline);
  }
    private async performSync(force = false): Promise<SyncResult> {
    const now = Date.now();
    
    // Verificar rate limit (exceto para forçar)
    if (!force && now - this.lastSyncTime < this.MIN_SYNC_GAP) {
      const timeToWait = this.MIN_SYNC_GAP - (now - this.lastSyncTime);
      
      // Limitar logs para evitar spam no console
      if (now - this.lastConsoleLog > this.LOG_INTERVAL) {
        console.log(`⏱️ Rate limit ativo: aguardando ${Math.round(timeToWait/1000)}s para próxima sincronização`);
        this.lastConsoleLog = now;
      }
      
      return {
        success: true,
        data: this.cachedData,
        cached: true
      };
    }
    
    // Verificar se já está sincronizando
    if (this.isSyncing && !force) {
      // Limitar logs para evitar spam no console
      if (now - this.lastConsoleLog > this.LOG_INTERVAL) {
        console.log('⏭️ Sync já em andamento');
        this.lastConsoleLog = now;
      }
      
      return {
        success: true,
        data: this.cachedData,
        cached: true
      };
    }
    
    this.isSyncing = true;
    const startTime = now;
    
    try {
      // Limitar logs para evitar spam no console
      if (now - this.lastConsoleLog > this.LOG_INTERVAL) {
        console.log('🔄 Iniciando sync único...');
        this.lastConsoleLog = now;
      }
      
      // 1. Verificar saúde da API
      const isHealthy = await checkApiHealth();
      
      this.updateStatus({
        isOnline: isHealthy,
        lastCheck: new Date(),
        error: isHealthy ? null : 'API não está respondendo'
      });
      
      if (!isHealthy) {
        return {
          success: false,
          data: this.cachedData,
          cached: true,
          error: 'API offline'
        };
      }
      
      // 2. Buscar dados
      const response = await ordersService.fetchOrders();
      
      if (response.success && response.data) {
        this.cachedData = response.data;
        this.lastSyncTime = Date.now();
        
        this.updateStatus({
          lastSuccessfulSync: new Date(),
          retryCount: 0,
          error: null
        });
        
        const result: SyncResult = {
          success: true,
          data: response.data,
          cached: false
        };
          // Notificar todos os subscribers
        this.dataSubscribers.forEach(callback => callback(result));
        
        // Limitar logs para evitar spam no console
        if (Date.now() - this.lastConsoleLog > this.LOG_INTERVAL) {
          console.log(`✅ Sync completo: ${response.data.length} pedidos em ${Date.now() - startTime}ms`);
          this.lastConsoleLog = Date.now();
        }
        
        return result;
      }
      
      throw new Error('Resposta inválida da API');
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.updateStatus({
        isOnline: false,
        error: errorMsg,
        retryCount: this.status.retryCount + 1
      });
      
      // Limitar logs para evitar spam no console
      if (Date.now() - this.lastConsoleLog > this.LOG_INTERVAL) {
        console.warn('⚠️ Erro no sync:', errorMsg);
        this.lastConsoleLog = Date.now();
      }
      
      return {
        success: false,
        data: this.cachedData,
        cached: true,
        error: errorMsg
      };
      
    } finally {
      this.isSyncing = false;
    }
  }
  
  private updateStatus(updates: Partial<ConnectionStatus>) {
    this.status = { ...this.status, ...updates };
    
    // Notificar todos os subscribers
    this.subscribers.forEach(callback => callback(this.status));
  }
    private handleOnline() {
    const now = Date.now();
    
    // Verificar intervalo mínimo entre eventos de conexão
    if (now - this.lastSyncTime < this.MIN_SYNC_GAP) {
      // Atualizar status sem fazer sync
      this.updateStatus({
        isOnline: true,
        error: null
      });
      
      // Limitar logs para evitar spam
      if (now - this.lastConsoleLog > this.LOG_INTERVAL) {
        console.log('🌐 Conexão restaurada (aguardando para sync)');
        this.lastConsoleLog = now;
      }
      return;
    }
    
    // Limitar logs para evitar spam
    if (now - this.lastConsoleLog > this.LOG_INTERVAL) {
      console.log('🌐 Conexão restaurada (iniciando sync)');
      this.lastConsoleLog = now;
    }
    
    this.performSync(true);
  }
  
  private handleOffline() {
    // Limitar logs para evitar spam
    if (Date.now() - this.lastConsoleLog > this.LOG_INTERVAL) {
      console.log('📵 Conexão perdida');
      this.lastConsoleLog = Date.now();
    }
    
    this.updateStatus({
      isOnline: false,
      error: 'Sem conexão com a internet'
    });
  }
  
  /**
   * Limpar recursos
   */
  public dispose() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    window.removeEventListener('online', this.boundHandleOnline);
    window.removeEventListener('offline', this.boundHandleOffline);

    this.subscribers.length = 0;
    this.dataSubscribers.length = 0;
  }
}

// Instância única global
export const connectionManager = ConnectionManager.getInstance();
