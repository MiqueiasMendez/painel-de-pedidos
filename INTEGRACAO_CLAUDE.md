# Integração do Claude AI no Painel de Pedidos

Este documento descreve como configurar e usar a integração do Claude (assistente de IA da Anthropic) no projeto Painel de Pedidos.

## Configuração Inicial

Antes de usar o Claude, você precisa configurar sua chave de API:

1. Abra o arquivo `src/services/ai/claudeService.ts`
2. Substitua o valor da constante `CLAUDE_API_KEY` pela sua chave real da Anthropic
3. **IMPORTANTE**: Em ambiente de produção, use variáveis de ambiente em vez de colocar a chave diretamente no código

## Componentes Disponíveis

### 1. ClaudeButton

Um botão que pode ser adicionado em qualquer parte do aplicativo para abrir o assistente do Claude.

```tsx
import ClaudeButton from '../components/ai/ClaudeButton';

// Em seu componente:
<ClaudeButton className="mt-4" />
```

### 2. ClaudeModal

Um modal que contém o assistente do Claude. Pode ser controlado programaticamente.

```tsx
import { useState } from 'react';
import ClaudeModal from '../components/ai/ClaudeModal';

// Em seu componente:
const [isModalOpen, setIsModalOpen] = useState(false);

// Para abrir o modal:
setIsModalOpen(true);

// No JSX:
<ClaudeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
```

### 3. ClaudeAssistant

O componente principal do assistente que pode ser integrado diretamente em qualquer parte da UI.

```tsx
import ClaudeAssistant from '../components/ai/ClaudeAssistant';

// Em seu componente:
<ClaudeAssistant className="my-4" />
```

## Hook useClaude

O hook `useClaude` pode ser usado para interagir diretamente com o Claude em componentes customizados:

```tsx
import useClaude from '../hooks/useClaude';

function MyComponent() {
  const { 
    loading, 
    error, 
    response, 
    sendMessage, 
    analyzeOrder, 
    generateSuggestions 
  } = useClaude();

  const handleSendMessage = async () => {
    await sendMessage("Como posso melhorar meu sistema de pedidos?");
  };

  // Restante do componente...
}
```

## Funções Disponíveis

O serviço do Claude oferece três funções principais:

1. **sendMessage**: Envia uma mensagem genérica para o Claude
2. **analyzeOrder**: Analisa um pedido para extrair informações relevantes
3. **generateSuggestions**: Gera sugestões personalizadas com base no histórico de pedidos

## Exemplos de Uso

### Analisar um Pedido

```tsx
const { analyzeOrder, response, loading } = useClaude();

// Quando quiser analisar um pedido:
await analyzeOrder(`
  Cliente: João Silva
  Telefone: (11) 98765-4321
  Endereço: Rua das Flores, 123
  Itens:
  - 2x Pizza Grande de Calabresa - R$ 45,90 cada
  - 1x Refrigerante 2L - R$ 12,00
  - 1x Sobremesa - R$ 15,00
  Total: R$ 118,80
  Pagamento: Cartão de crédito
  Observações: Sem cebola na pizza
`);

// Mostrar resultado:
{loading ? (
  <p>Analisando pedido...</p>
) : (
  <div>{response}</div>
)}
```

### Gerar Sugestões para um Cliente

```tsx
const { generateSuggestions, response } = useClaude();

// Quando quiser gerar sugestões:
await generateSuggestions(`
  Histórico de Pedidos do Cliente João:
  - 10/05: 2x Pizza de Calabresa, 1x Refrigerante
  - 25/05: 1x Pizza de Frango, 1x Pizza de Calabresa, 1x Refrigerante
  - 15/06: 2x Pizza de Calabresa, 1x Sobremesa, 1x Refrigerante
`);

// Mostrar resultado:
<div className="sugestoes">{response}</div>
```

## Modelos Disponíveis

O Claude oferece diferentes modelos com capacidades variadas. Os principais são:

- `claude-3-opus-20240229`: O mais avançado, melhor para tarefas complexas
- `claude-3-sonnet-20240229`: Equilibra capacidade e custo
- `claude-3-haiku-20240307`: Mais rápido, ideal para respostas curtas

Para alterar o modelo padrão, modifique o arquivo `claudeService.ts`.

## Considerações sobre Custos

A API do Claude é paga com base no uso (tokens processados). Para controlar custos:

1. Limite o tamanho das respostas usando `maxTokens`
2. Use o modelo mais simples que atenda às suas necessidades
3. Implemente controles de uso para evitar abusos

## Solução de Problemas

Se encontrar erros:

1. Verifique se sua chave API está correta e ativa
2. Confira se você tem créditos suficientes em sua conta Anthropic
3. Verifique os logs no console do navegador para mensagens de erro detalhadas
4. Confirme que a biblioteca `@anthropic-ai/sdk` está instalada corretamente
