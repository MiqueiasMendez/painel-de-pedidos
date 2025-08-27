# Guia de Integração da API do Painel de Pedidos

Este documento descreve como a integração da API foi implementada e como usar o adaptador para conectar o painel de pedidos à API principal.

## Visão Geral

A integração permite que o painel de pedidos se comunique com a API principal para:

1. Buscar pedidos
2. Atualizar status de pedidos
3. Modificar itens de pedidos
4. Verificar a saúde da API

## Arquitetura

A integração usa um padrão adaptador que padroniza a comunicação com a API, independentemente das diferenças nos endpoints e formatos de resposta. Isso proporciona:

- **Resiliência**: Tentativas automáticas em caso de falha
- **Compatibilidade**: Suporte a diferentes formatos de resposta
- **Fallback**: Uso de endpoints alternativos quando o principal falha
- **Normalização**: Conversão de dados para o formato esperado pelo frontend

## Componentes Principais

### 1. CompleteApiAdapter

Classe principal que encapsula toda a lógica de comunicação com a API:

```typescript
import { CompleteApiAdapter } from './services/api/api-adapter-complete';

const api = new CompleteApiAdapter({
  baseUrl: 'https://mercado-api-9sw5.onrender.com/api',
  debug: true
});

// Buscar pedidos
const orders = await api.getOrders();

// Atualizar status
await api.updateOrderStatus('order123', 'preparing');
```

### 2. Connection Manager

Gerencia a conexão única com a API, evitando múltiplas requisições simultâneas:

```typescript
import { connectionManager } from './services/api/client/connection';

// Forçar sincronização
await connectionManager.forceSync();

// Obter status da conexão
connectionManager.subscribe(status => {
  console.log('Status da API:', status.isOnline ? 'Online' : 'Offline');
});
```

### 3. Hook useOrders

Hook React que integra o adaptador e gerenciador de conexão com o frontend:

```typescript
import { useOrders } from './hooks/useOrders';

function OrdersPanel() {
  const { 
    orders, 
    loading, 
    error, 
    updateOrderStatus 
  } = useOrders();
  
  // Usar os dados nos componentes
}
```

## Configuração

A configuração da API está centralizada no arquivo `src/config/api.config.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://mercado-api-9sw5.onrender.com/api',
  TIMEOUT: 15000,
  SYNC_INTERVAL: 5 * 60 * 1000,
  MAX_RETRIES: 3,
  DEBUG: false
};
```

## Executando Testes

Para testar a integração:

1. **Teste via Terminal**:
   ```bash
   node test-api-connection.js
   ```

2. **Teste Visual**:
   Abra o arquivo `api-test.html` em um navegador.

## Tratamento de Erros

O adaptador inclui vários mecanismos para lidar com erros:

1. **Retries Automáticos**: Tenta novamente em caso de falha com backoff exponencial
2. **Timeout Adaptativo**: Ajusta o timeout com base na experiência prévia
3. **Fallbacks**: Tenta endpoints alternativos quando o principal falha
4. **Cache Local**: Armazena dados localmente para uso offline
5. **Atualizações Otimistas**: Atualiza a UI imediatamente e sincroniza depois

## Uso com JavaScript

Para projetos que usam JavaScript em vez de TypeScript, uma versão JavaScript do adaptador está disponível em `src/services/api-adapter-complete.js`:

```javascript
const { CompleteApiAdapter } = require('./services/api-adapter-complete');

const api = new CompleteApiAdapter({
  baseUrl: 'https://sua-api.com/api',
  debug: true
});
```

## Problemas Comuns

### API Offline

Se a API estiver offline, o adaptador usará dados em cache e tentará reconectar periodicamente. Você pode verificar o status com:

```typescript
const { checkApiHealth } = require('./services/api/client/health');
const isOnline = await checkApiHealth();
```

### Formato de Resposta Diferente

O adaptador normaliza automaticamente diferentes formatos de resposta. Se encontrar um formato não suportado, você pode estender o método `adaptResponse` para lidar com ele.

## Conclusão

Esta integração fornece uma maneira robusta e flexível de conectar o painel de pedidos à API principal, com mecanismos de resiliência e fallback para garantir uma experiência confiável mesmo em condições adversas de rede.