/**
 * @fileoverview Gerenciador de conexão único para API
 * @module services/api/client/connection
 */

import { API_CONFIG } from '../config';
import { SyncResult, ConnectionStatus } from '../types';
import { checkApiHealth } from './health';

// Tipo para função de callback na sincronização
type SyncCallback<T = any> = (result: SyncResult<T>) => void;

// Tipo para função que realiza a sincronização com a API
type SyncFunction<T = any> = () => Promise<T>;

/**
 * Gerenciador de conexão único para todas as operações com a API
 */
class ConnectionManager {
  private status: ConnectionStatus = {
    isOnline: false,
    lastCheck: null,
    lastSuccessfulSync: null,
    retryCount: 0,
    error: null
  };
  
  private syncInterval: number = API_CONFIG.SYNC_INTERVAL;
  private healthCheckInterval: number = API_CONFIG.HEALTH_CHECK_INTERVAL;
  
  private syncTimer: NodeJS.Timeout | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  
  private syncing: boolean = false;
  private syncCallbacks: SyncCallback[] = [];
  private syncFunction: SyncFunction | null = null;
  
  private lastData: any = null;
  
  constructor() {
    // Iniciar os timers quando a conexão estiver disponível
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      
      // Verificar a conexão inicial
      this.isOnline = navigator.onLine;
      
      // Iniciar os timers se estiver online
      if (this.isOnline) {
        this.startTimers();
      }
    }
  }
  
  /**
   * Define se está online
   */
  private set isOnline(value: boolean) {
    const wasOffline = !this.status.isOnline;
    this.status.isOnline = value;
    
    if (value && wasOffline) {
      console.log('🌐 Conexão restabelecida. Sincronizando...');
      this.forceSync();
    }
  }
  
  /**
   * Obtém se está online
   */
  private get isOnline(): boolean {
    return this.status.isOnline;
  }
  
  /**
   * Manipula evento online
   */
  private handleOnline = () => {
    console.log('🌐 Dispositivo está online');
    this.isOnline = true;
    this.startTimers();
  }
  
  /**
   * Manipula evento offline
   */
  private handleOffline = () => {
    console.log('🔌 Dispositivo está offline');
    this.isOnline = false;
    this.stopTimers();
  }
  
  /**
   * Inicia os timers de sincronização
   */
  private startTimers() {
    // Parar timers existentes
    this.stopTimers();
    
    // Iniciar timer de sincronização
    this.syncTimer = setInterval(() => {
      this.syncWithApi();
    }, this.syncInterval);
    
    // Iniciar timer de verificação de saúde
    this.healthTimer = setInterval(() => {
      this.checkHealth();
    }, this.healthCheckInterval);
    
    // Sincronizar imediatamente
    setTimeout(() => {
      this.syncWithApi();
    }, 1000);
  }
  
  /**
   * Para os timers de sincronização
   */
  private stopTimers() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }
  
  /**
   * Verifica a saúde da API
   */
  private async checkHealth() {
    if (!this.isOnline) return;
    
    try {
      const isHealthy = await checkApiHealth();
      
      // Se a resposta for ok, a API está saudável
      this.isOnline = isHealthy;
      this.status.lastCheck = new Date();
      this.status.error = isHealthy ? null : 'API não está respondendo';
      
      if (!isHealthy) {
        console.warn('⚠️ API não está saudável');
      }
      
    } catch (error) {
      console.warn('⚠️ Erro ao verificar saúde da API:', error);
      this.status.error = error instanceof Error ? error.message : 'Erro na verificação de saúde';
      this.isOnline = false;
    }
  }
  
  /**
   * Realiza a sincronização com a API
   */
  private async syncWithApi(): Promise<SyncResult> {
    // Se já está sincronizando, aguardar
    if (this.syncing) {
      return {
        success: false,
        error: 'Sincronização já em andamento',
        cached: true,
        data: this.lastData
      };
    }
    
    // Se não há função de sincronização, não fazer nada
    if (!this.syncFunction) {
      return {
        success: false,
        error: 'Função de sincronização não definida',
        cached: true,
        data: this.lastData
      };
    }
    
    this.syncing = true;
    let result: SyncResult = {
      success: false,
      error: 'Erro desconhecido na sincronização'
    };
    
    try {
      // Executar a função de sincronização
      const data = await this.syncFunction();
      
      // Verificar e garantir que os dados são válidos
      console.log('🔍 Dados recebidos da função de sync:', data ? (Array.isArray(data) ? `Array com ${data.length} itens` : typeof data) : 'null/undefined');
      
      // Verificar se os dados são um array válido ou tentar extrair um array
      let validData = data;
      
      // Se não for array, tentar extrair array
      if (data && !Array.isArray(data) && typeof data === 'object') {
        console.log('⚠️ Dados retornados não são um array, tentando extrair array...');
        
        // Tentar encontrar array em alguma propriedade
        for (const key of ['data', 'orders', 'results', 'items', 'pedidos']) {
          if (data[key] && Array.isArray(data[key])) {
            console.log(`✅ Array encontrado na propriedade "${key}" com ${data[key].length} itens`);
            validData = data[key];
            break;
          }
        }
        
        // Último recurso: procurar por qualquer propriedade que seja um array
        if (!Array.isArray(validData)) {
          for (const key in data) {
            if (data[key] && Array.isArray(data[key])) {
              console.log(`✅ Array encontrado na propriedade "${key}" com ${data[key].length} itens`);
              validData = data[key];
              break;
            }
          }
        }
      }
      
      // Se ainda não for array, criar array vazio
      if (!Array.isArray(validData)) {
        console.warn('⚠️ Não foi possível extrair array dos dados, usando array vazio');
        validData = [];
      }
      
      // Armazenar os dados validados
      this.lastData = validData;
      
      // Atualizar status
      this.status.lastSuccessfulSync = new Date();
      this.status.retryCount = 0;
      this.status.error = null;
      
      // Criar resultado de sucesso
      result = {
        success: true,
        data: validData
      };
      
      // Notificar callbacks
      this.notifyCallbacks(result);
      
    } catch (error) {
      console.warn('⚠️ Erro na sincronização:', error);
      
      // Incrementar contador de tentativas
      this.status.retryCount += 1;
      this.status.error = error instanceof Error ? error.message : 'Erro na sincronização';
      
      // Criar resultado de erro, mas incluir dados em cache se disponíveis
      result = {
        success: false,
        error: this.status.error,
        cached: !!this.lastData,
        data: this.lastData
      };
      
      // Notificar callbacks mesmo em caso de erro
      this.notifyCallbacks(result);
      
    } finally {
      this.syncing = false;
    }
    
    return result;
  }
  
  /**
   * Notifica os callbacks registrados
   */
  private notifyCallbacks(result: SyncResult) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Erro ao executar callback de sincronização:', error);
      }
    });
  }
  
  // ==================== MÉTODOS PÚBLICOS ====================
  
  /**
   * Define a função que realiza a sincronização com a API
   */
  setSyncFunction(fn: SyncFunction) {
    this.syncFunction = fn;
  }
  
  /**
   * Registra um callback para ser notificado quando os dados forem sincronizados
   */
  subscribeToData(callback: SyncCallback): () => void {
    this.syncCallbacks.push(callback);
    
    // Se já temos dados, notificar imediatamente
    if (this.lastData) {
      try {
        callback({
          success: true,
          data: this.lastData,
          cached: true
        });
      } catch (error) {
        console.error('Erro ao executar callback inicial:', error);
      }
    }
    
    // Retornar função para cancelar a inscrição
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Força uma sincronização imediata
   */
  async forceSync(): Promise<SyncResult> {
    return await this.syncWithApi();
  }
  
  /**
   * Obtém o status atual da conexão
   */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }
  
  /**
   * Verifica se há dados em cache
   */
  hasCachedData(): boolean {
    return !!this.lastData;
  }
  
  /**
   * Obtém os dados em cache
   */
  getCachedData(): any {
    return this.lastData;
  }
}

// Criar uma única instância do gerenciador de conexão
export const connectionManager = new ConnectionManager();