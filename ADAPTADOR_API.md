# Adaptador de API para Painel de Pedidos

Este documento descreve o novo adaptador de API implementado para resolver problemas de comunicação entre o Painel de Pedidos e a API.

## Problema Resolvido

O painel de pedidos estava enfrentando dificuldades para se comunicar com a API devido a:

1. **Inconsistência nos endpoints**: Múltiplos endpoints com diferentes comportamentos
2. **Formatos de resposta variados**: Algumas vezes arrays, outras objetos com diferentes estruturas
3. **Problemas de CORS**: Dificuldades de acesso em ambiente de desenvolvimento
4. **Erros de conexão**: Falhas quando a API está lenta ou hibernada (Render)

## Solução Implementada

Foi criado um adaptador de API robusto que:

1. **Tenta múltiplos endpoints**: Quando um falha, tenta alternativas automaticamente
2. **Adapta diferentes formatos de resposta**: Normaliza os dados independente do formato retornado
3. **Usa CORS proxies quando necessário**: Resolve problemas de CORS em desenvolvimento
4. **Implementa retries com backoff**: Tenta novamente com esperas crescentes para lidar com latência
5. **Funciona com a estrutura existente**: Integra-se com o gerenciador de conexão atual

## Arquivos Chave

- `src/services/api/api-adapter-complete.ts`: Adaptador TypeScript completo
- `src/services/api/index.ts`: Exporta uma instância pronta para uso `apiClient`
- `src/hooks/useOrders.ts`: Integração com o hook existente (fallback transparente)

## Como Usar

O adaptador está integrado automaticamente como fallback, mas também pode ser usado diretamente:

```typescript
import { apiClient } from './services/api';

// Obter pedidos
const response = await apiClient.getOrders();
if (response.success) {
  const orders = response.data;
  // Use os pedidos...
}

// Atualizar status
await apiClient.updateOrderStatus(orderId, OrderStatus.PREPARING);

// Verificar saúde da API
const health = await apiClient.checkHealth();
if (health.isHealthy) {
  console.log(`API respondendo via ${health.endpoint}`);
}
```

## Estratégia de Fallback

O adaptador está configurado para tentar primeiro o serviço padrão e, se falhar, usar o adaptador completo:

1. Tenta `OrdersService.fetchOrders()`
2. Se falhar, tenta `apiClient.getOrders()`
3. Se ambos falharem, usa dados mockados

Isso proporciona a maior chance de sucesso sem alterar a arquitetura existente.

## Integração com Backend

Este adaptador complementa as melhorias feitas no backend, onde foram criados endpoints padronizados:

- `GET /api/orders`: Lista todos os pedidos
- `GET /api/orders/:id`: Obtém um pedido específico
- `POST /api/orders/:id/status`: Atualiza o status de um pedido

O adaptador tenta primeiro estes endpoints padrão e depois usa os endpoints legados se necessário.

## Testes

Para testar o adaptador, use a página `teste-integracao-api.html` que está configurada para mostrar os pedidos e permitir atualizar status usando o novo adaptador.

## Melhorias Futuras

Algumas melhorias que podem ser implementadas no futuro:

1. Implementar caching mais avançado dos resultados
2. Adicionar monitoramento de performance da API
3. Melhorar sincronização offline
4. Implementar filas de operações para quando a API estiver indisponível