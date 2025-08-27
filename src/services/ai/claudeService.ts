/**
 * @fileoverview Serviço para interação com a API do Claude (Anthropic)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { TextBlock, ContentBlock } from '@anthropic-ai/sdk/resources/messages/messages';

// Leia a chave da API do Claude de uma variável de ambiente
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Exibe um aviso caso a chave não esteja configurada
if (!CLAUDE_API_KEY) {
  console.warn('CLAUDE_API_KEY not set. The Claude service may not function correctly.');
}

// Inicializar o cliente do Claude
const anthropic = new Anthropic({
  apiKey: CLAUDE_API_KEY || '',
});

// Interface para respostas da IA
export interface AIResponse {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Serviço para interagir com o Claude
 */
export class ClaudeService {
  /**
   * Envia uma mensagem para o Claude e retorna a resposta
   * @param message Mensagem a ser enviada para o Claude
   * @param options Opções adicionais
   * @returns Resposta do Claude
   */
  static async sendMessage(message: string, options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}): Promise<AIResponse> {
    try {
      // Valores padrão
      const model = options.model || 'claude-3-opus-20240229';
      const maxTokens = options.maxTokens || 1000;
      const temperature = options.temperature || 0.7;

      // Enviar mensagem para o Claude
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'user', content: message }
        ],
      });

      // Extrair o texto da resposta
      const text = (response.content as ContentBlock[])
        .filter((content): content is TextBlock => content.type === 'text')
        .map(content => content.text)
        .join('\n');

      return {
        success: true,
        text
      };
    } catch (error) {
      console.error('Erro ao comunicar com Claude:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao comunicar com o Claude'
      };
    }
  }

  /**
   * Analisa um pedido usando o Claude
   * @param orderText Texto do pedido a ser analisado
   * @returns Análise do pedido
   */
  static async analyzeOrder(orderText: string): Promise<AIResponse> {
    const prompt = `
    Analise este pedido e extraia as seguintes informações:
    
    Pedido:
    ${orderText}
    
    Por favor, identifique:
    1. Lista de produtos com quantidades
    2. Total do pedido
    3. Endereço de entrega
    4. Método de pagamento
    5. Quaisquer solicitações especiais
    `;

    return this.sendMessage(prompt, {
      maxTokens: 500,
      temperature: 0.2 // Baixa temperatura para resultados mais determinísticos
    });
  }

  /**
   * Gera sugestões para o cliente com base no histórico de pedidos
   * @param orderHistory Histórico de pedidos do cliente
   * @returns Sugestões personalizadas
   */
  static async generateSuggestions(orderHistory: string): Promise<AIResponse> {
    const prompt = `
    Com base neste histórico de pedidos do cliente:
    
    ${orderHistory}
    
    Por favor, sugira:
    1. Produtos que o cliente pode gostar com base em seus pedidos anteriores
    2. Promoções personalizadas ou combos que seriam relevantes
    3. Melhor horário para entrega com base nos padrões anteriores
    `;

    return this.sendMessage(prompt, {
      maxTokens: 700,
      temperature: 0.7 // Temperatura moderada para criatividade balanceada
    });
  }
}

export default ClaudeService;
