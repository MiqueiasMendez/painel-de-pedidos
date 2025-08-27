# 🔗 SOLICITAÇÃO DE INTEGRAÇÃO - Painel de Pedidos Frontend

## 📋 **CONTEXTO DA SITUAÇÃO**

Criei um **painel de gerenciamento de pedidos em React/TypeScript** separado do projeto principal. Este painel precisa se conectar à API do backend que está hospedado em:
- **URL**: `https://mercado-api-9sw5.onrender.com`
- **Status**: Aparentemente ativo, mas retornando 404 em alguns endpoints

## 🎯 **OBJETIVO**

Configurar a integração completa entre:
- **Frontend**: Painel React (separado)
- **Backend**: API do projeto principal (Render.com)

## 🔧 **ESTRUTURA ATUAL DO FRONTEND**

### **Tipos TypeScript Definidos:**
```typescript
interface Order {
  id: string;
  orderNumber?: number;
  customer: {
    id?: string;
    name: string;
    phone: string;
    address?: string;
    email?: string;
    isFrequent?: boolean;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  total: number;
  status: OrderStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
```

### **Endpoints que o Frontend Espera:**
- `GET /api/orders` - Listar pedidos
- `POST /api/orders` - Criar pedido
- `PUT /api/orders/:id` - Atualizar pedido
- `PATCH /api/orders/:id/status` - Atualizar status
- `DELETE /api/orders/:id` - Excluir pedido
- `POST /api/orders/:id/duplicate` - Duplicar pedido
- `PATCH /api/orders/batch-status` - Atualização em lote

### **Formato de Resposta Esperado:**
```typescript
// Sucesso
{
  "success": true,
  "data": [...pedidos...],
  "message": "Operação realizada com sucesso"
}

// Erro
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Pedido não encontrado"
  }
}
```

## ❓ **INFORMAÇÕES NECESSÁRIAS DO BACKEND**

### **1. Estrutura da API**
- Qual é a **URL base real** da API?
- Quais são os **endpoints disponíveis** para pedidos?
- Existe algum **prefixo de rota** específico? (ex: `/api/v1/`, `/admin/`)

### **2. Formato das Respostas**
- Como são estruturadas as **respostas de sucesso**?
- Como são estruturadas as **respostas de erro**?
- Exemplo de um **pedido retornado pela API**

### **3. Modelo de Dados**
- Como está estruturado o **modelo Order** no backend?
- Quais campos são **obrigatórios/opcionais**?
- Como são nomeados os campos? (português/inglês)
- Quais são os **valores possíveis** para status de pedidos?

### **4. Autenticação**
- A API requer **autenticação**?
- Se sim, que tipo? (Bearer token, API key, etc.)
- Como obter e renovar tokens?

### **5. Operações Disponíveis**
- Quais **operações CRUD** estão implementadas?
- Existe suporte para **atualização em lote**?
- Existe endpoint para **duplicar pedidos**?
- Como funciona a **exclusão** (soft delete ou hard delete)?

## 🔄 **EXEMPLOS DE REQUISIÇÕES**

**Poderia fornecer exemplos de:**

### **GET /api/orders**
```bash
curl -X GET "https://mercado-api-9sw5.onrender.com/api/orders"
```
*Como é a resposta? Qual formato JSON?*

### **POST /api/orders**
```bash
curl -X POST "https://mercado-api-9sw5.onrender.com/api/orders" \
  -H "Content-Type: application/json" \
  -d '{"customer": {...}, "items": [...]}'
```
*Qual o formato esperado no body? Qual a resposta?*

### **PATCH /api/orders/:id/status**
```bash
curl -X PATCH "https://mercado-api-9sw5.onrender.com/api/orders/123/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```
*Como atualizar status? Quais status são válidos?*

## 🛠️ **ADAPTADOR CRIADO**

Já criei um **adaptador** que pode converter entre formatos:
```typescript
export class ApiAdapter {
  static adaptApiResponse<T>(backendResponse: any): ApiResponse<T>
  static adaptOrder(backendOrder: any): Order
  static adaptOrderForBackend(frontendOrder: Partial<Order>): any
}
```

## 📝 **INFORMAÇÕES TÉCNICAS EXTRAS**

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Estado**: Context API + useReducer
- **HTTP Client**: fetch API nativo
- **Deploy**: Frontend será separado do backend
- **Modo Offline**: Implementado com dados mock

## 🎯 **O QUE PRECISO**

1. **Documentação dos endpoints** disponíveis
2. **Exemplos de payloads** de request/response
3. **Estrutura exata** do modelo Order no backend
4. **Como tratar erros** específicos da API
5. **Se há limitações** de CORS ou autenticação

---

**Com essas informações, posso configurar perfeitamente o adaptador e garantir que a integração funcione flawlessly! 🚀**

*Envie exemplos de chamadas reais da API ou logs de resposta para que eu possa mapear corretamente os dados.*
