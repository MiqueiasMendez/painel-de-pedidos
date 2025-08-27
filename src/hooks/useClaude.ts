/**
 * @fileoverview Hook para usar o serviço Claude nos componentes React
 */

import { useState, useCallback } from 'react';
import ClaudeService, { AIResponse } from '../services/ai/claudeService';

interface UseCloudeReturn {
  loading: boolean;
  error: string | null;
  response: string | null;
  sendMessage: (message: string) => Promise<void>;
  analyzeOrder: (orderText: string) => Promise<void>;
  generateSuggestions: (orderHistory: string) => Promise<void>;
  clearResponse: () => void;
}

/**
 * Hook para usar o Claude em componentes React
 */
export function useClaude(): UseCloudeReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);

  const handleAIResponse = (result: AIResponse) => {
    if (result.success && result.text) {
      setResponse(result.text);
      setError(null);
    } else {
      setError(result.error || 'Erro desconhecido');
      setResponse(null);
    }
  };

  const sendMessage = useCallback(async (message: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await ClaudeService.sendMessage(message);
      handleAIResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeOrder = useCallback(async (orderText: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await ClaudeService.analyzeOrder(orderText);
      handleAIResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar pedido');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSuggestions = useCallback(async (orderHistory: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await ClaudeService.generateSuggestions(orderHistory);
      handleAIResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar sugestões');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResponse = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    response,
    sendMessage,
    analyzeOrder,
    generateSuggestions,
    clearResponse
  };
}

export default useClaude;
