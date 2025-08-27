/**
 * @fileoverview Ponto de entrada principal para API
 * @module services/api
 */

// Importação da classe para criar a instância
import { CompleteApiAdapter } from './api-adapter-complete';

// Configuração
export { API_CONFIG } from '../../config/api.config';

// Adaptadores
export { ApiAdapter } from './adapter';
export { CompleteApiAdapter } from './api-adapter-complete';

// Serviços
export { OrdersService } from './services/orders';

// Cliente
export { connectionManager } from './client/connection';
export { checkApiHealth, checkApiHealthDetailed } from './client/health';
export { postJSON, getJSON, fetchWithConfig } from './client/fetch';

// Tipos
export type { 
  ApiResponse, 
  ApiError, 
  PaginatedResponse, 
  BackendOrder,
  UpdateStatusResponse,
  ConnectionStatus,
  SyncResult
} from './types';

// Instância do adaptador completo para uso direto
export const apiClient = new CompleteApiAdapter({
  debug: true // Ativar logging para debug
});