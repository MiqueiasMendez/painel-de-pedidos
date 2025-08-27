/**
 * @fileoverview Utilitários da API
 */

import { API_CONFIG } from '../../config/api.config';
import { fetchWithConfig } from './fetchWithConfig';

/**
 * Verificar se a API está online fazendo uma requisição direta
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetchWithConfig(`${API_CONFIG.BASE_URL}/list-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar saúde da API:', error);
    return false;
  }
}
