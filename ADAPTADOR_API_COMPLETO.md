# Implementação da API Padronizada para o Painel de Pedidos

Este documento descreve a solução implementada para resolver os problemas de comunicação entre o painel de pedidos (frontend) e a API (backend).

## Problema Original

O sistema enfrentava vários desafios na comunicação entre frontend e backend:

1. **Inconsistência nos endpoints**: Falta de padrão claro nos nomes e estrutura dos endpoints (/list-orders, /orders, etc.)
2. **Formatos de resposta variados**: Respostas retornando como arrays diretos ou objetos com arrays aninhados
3. **Estrutura de dados inconsistente**: Campos com nomes variáveis (ex: created_at/createdAt)
4. **Problemas de CORS**: Dificuldades no acesso direto à API pelo frontend

## Solução Implementada

### 1. API RESTful Padronizada

Modificamos o arquivo `server/api/loja-online.js` para implementar endpoints RESTful padronizados:

```
GET /api/orders - Listar todos os pedidos
GET /api/orders/:id - Obter um pedido específico
POST /api/orders/:id/status - Atualizar status de um pedido
GET /api/health - Verificar saúde da API
```

Todas as respostas seguem um formato padronizado:

```json
{
  "success": true,
  "data": [...],  // Array de pedidos ou objeto único
  "message": "Operação realizada com sucesso"
}
```

### 2. Adaptador de API

Criamos um adaptador API para o frontend (`api-adapter-complete.js`) que:

- Fornece uma interface consistente para acessar endpoints padronizados
- Normaliza estruturas de dados para um formato único
- Possui fallback para endpoints legados, garantindo compatibilidade retroativa
- Implementa tratamento de erros robusto

### 3. Normalização de Dados

O adaptador normaliza campos inconsistentes:

```javascript
// Exemplo de normalização de pedido
{
  id: orderData._id || orderData.id,
  customer: {
    name: orderData.customerName || orderData.customer_name || '',
    phone: orderData.customerPhone || orderData.customer?.phone || '',
    address: orderData.address || {}
  },
  items: (orderData.items || []).map(item => ({
    id: item._id || item.id || '',
    name: item.name || '',
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.price) || 0,
    totalPrice: (Number(item.price) || 0) * (Number(item.quantity) || 1),
    category: item.category || ''
  })),
  // outros campos normalizados...
}
```

### 4. Configuração CORS Correta

Configuramos o CORS adequadamente no servidor para permitir acesso do frontend:

```javascript
// Configuração CORS padronizada
const corsOptions = {
  origin: '*', // Em produção, restringir para a origem do frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

app.use(cors(corsOptions));
```

### 5. Hook React para Integração Fácil

Implementamos um hook React para simplificar a integração com componentes:

```javascript
function useOrdersApi() {
  // Estado para pedidos, loading e erros
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Instância do adaptador
  const api = useMemo(() => new ApiAdapter(), []);

  // Métodos para interagir com a API
  const loadOrders = useCallback(async () => {
    // Implementação...
  }, [api]);

  const updateOrderStatus = useCallback(async (orderId, status, message) => {
    // Implementação...
  }, [api]);
  
  // Carregar pedidos ao montar o componente
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  
  // Retornar interface para o componente
  return {
    orders,
    loading,
    error,
    loadOrders,
    updateOrderStatus
  };
}
```

## Endpoints Disponíveis

| Operação | Endpoint | Método | Descrição |
|----------|----------|--------|-----------|
| Verificar API | /api/health | GET | Verifica se a API está funcionando |
| Listar Pedidos | /api/orders | GET | Retorna lista de pedidos com paginação |
| Obter Pedido | /api/orders/:id | GET | Busca um pedido específico pelo ID |
| Atualizar Status | /api/orders/:id/status | POST | Altera o status de um pedido |
| Listar Pedidos (Legacy) | /api/list-orders | POST | Retorna todos os pedidos (formato antigo) |
| Obter Pedido (Legacy) | /api/get-order | POST | Busca um pedido específico (formato antigo) |
| Atualizar Status (Legacy) | /api/update-order-status | POST | Altera o status de um pedido (formato antigo) |
| Atualizar Total (Legacy) | /api/update-order-total | POST | Modifica o valor total de um pedido |
| Criar Pedido | /api/place-order | POST | Cria um novo pedido |
| Verificar Status | /api/get-order-status | POST | Obtém apenas o status de um pedido |

## Arquivos Criados/Modificados

1. **server/api/loja-online.js**: Implementação dos endpoints RESTful padronizados
2. **server/server.js**: Ajustes na configuração de CORS e registro de rotas
3. **api-adapter-complete.js**: Adaptador para normalização e acesso à API
4. **teste-integracao-api.html**: Página de demonstração e teste da solução

## Como Usar o Adaptador

### Uso Básico (JavaScript Vanilla)

```javascript
// Instanciar o adaptador
const api = new ApiAdapter();

// Listar pedidos
async function loadOrders() {
  try {
    const response = await api.getOrders();
    if (response.success) {
      console.log('Pedidos:', response.data.orders);
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Obter um pedido específico
async function getOrder(orderId) {
  try {
    const response = await api.getOrder(orderId);
    if (response.success) {
      console.log('Pedido:', response.data);
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Atualizar status de um pedido
async function updateStatus(orderId, newStatus, message) {
  try {
    const response = await api.updateOrderStatus(orderId, newStatus, message);
    if (response.success) {
      console.log('Status atualizado:', response.data);
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}
```

### Uso com React

```jsx
import React from 'react';
import { useOrdersApi } from './path/to/api-adapter-complete.js';

function OrdersPanel() {
  const { 
    orders, 
    loading, 
    error, 
    loadOrders, 
    updateOrderStatus 
  } = useOrdersApi();

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h1>Painel de Pedidos</h1>
      <button onClick={loadOrders}>Atualizar</button>
      
      {orders.map(order => (
        <div key={order.id}>
          <h3>Pedido #{order.id.slice(-6)}</h3>
          <p>Cliente: {order.customer.name}</p>
          <p>Status: {order.status}</p>
          <p>Total: R$ {order.total.toFixed(2)}</p>
          
          <button onClick={() => updateOrderStatus(order.id, 'preparing')}>
            Em Preparação
          </button>
          <button onClick={() => updateOrderStatus(order.id, 'delivering')}>
            Em Entrega
          </button>
          <button onClick={() => updateOrderStatus(order.id, 'completed')}>
            Finalizar
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Testando a Solução

A solução pode ser testada abrindo o arquivo `teste-integracao-api.html` em um navegador. Esta página de demonstração mostra o adaptador funcionando com todas as suas funcionalidades:

1. Verificação de status da API
2. Listagem de pedidos
3. Visualização de detalhes de pedidos
4. Atualização de status
5. Tratamento de erros

## Próximos Passos

1. Restringir a configuração CORS em produção para apenas as origens permitidas
2. Adicionar autenticação para endpoints que modificam dados
3. Implementar paginação para listagens com grande volume de dados
4. Adicionar cache no frontend para melhorar a performance
5. Implementar sistema de reconexão automática em caso de falhas da API

Esta solução garante uma comunicação padronizada e confiável entre o frontend e backend, sem necessidade de modificar a lógica de negócio existente.