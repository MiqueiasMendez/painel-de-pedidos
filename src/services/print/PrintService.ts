/**
 * @fileoverview Serviço para gerenciar impressão de pedidos
 * @module services/print/PrintService
 */

import { Order } from "../../types";

// ==================== TIPOS ====================
export type PrintTemplate = {
  id: string;
  name: string;
  showPrices: boolean;
  showCustomerDetails: boolean;
  showHeader: boolean;
  showFooter: boolean;
  showLogo: boolean;
};

// ==================== TEMPLATES DISPONÍVEIS ====================
export const PRINT_TEMPLATES: PrintTemplate[] = [
  {
    id: 'completo',
    name: 'Completo',
    showPrices: true,
    showCustomerDetails: true,
    showHeader: true,
    showFooter: true,
    showLogo: true,
  },
  {
    id: 'cozinha',
    name: 'Cozinha',
    showPrices: false,
    showCustomerDetails: false,
    showHeader: true,
    showFooter: false,
    showLogo: true,
  },
  {
    id: 'entrega',
    name: 'Entrega',
    showPrices: true,
    showCustomerDetails: true,
    showHeader: true,
    showFooter: true,
    showLogo: false,
  },
];

/**
 * Classe para gerenciar impressão de pedidos
 */
class PrintService {
  /**
   * Recupera um template de impressão pelo ID
   */
  getTemplateById(templateId: string): PrintTemplate {
    const template = PRINT_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return PRINT_TEMPLATES[0]; // Retorna o template padrão se não encontrar
    }
    return template;
  }

  /**
   * Obtem todos os templates disponíveis
   */
  getAllTemplates(): PrintTemplate[] {
    return PRINT_TEMPLATES;
  }

  /**
   * Gera um título para o documento de impressão
   */
  generatePrintTitle(order: Order, templateId: string): string {
    const template = this.getTemplateById(templateId);
    const orderNumber = order.orderNumber || order.id.slice(0, 6);
    
    switch (templateId) {
      case 'cozinha':
        return `Pedido #${orderNumber} - Cozinha`;
      case 'entrega':
        return `Pedido #${orderNumber} - Entrega`;
      default:
        return `Pedido #${orderNumber} - Mercado Express`;
    }
  }

  /**
   * Prepara os dados do pedido para impressão
   */
  preparePrintData(order: Order, templateId: string) {
    const template = this.getTemplateById(templateId);
    const printData = { ...order };
    
    // Aqui podemos fazer ajustes específicos por template
    // Por exemplo, no template de cozinha podemos priorizar informações relevantes
    
    return {
      order: printData,
      template,
      title: this.generatePrintTitle(order, templateId),
      timestamp: new Date()
    };
  }

  /**
   * Registra um log de impressão
   */
  logPrint(order: Order, templateId: string, userId?: string): void {
    console.log(`[${new Date().toISOString()}] Pedido #${order.orderNumber || order.id.slice(0, 6)} impresso usando template '${templateId}'${userId ? ` pelo usuário ${userId}` : ''}`);
    
    // Aqui poderia registrar em um banco de dados
    // ou enviar para um serviço de analytics
  }
}

export default new PrintService();
