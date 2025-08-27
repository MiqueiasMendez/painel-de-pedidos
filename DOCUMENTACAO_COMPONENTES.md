# Documentação Detalhada do Projeto

Este documento fornece uma visão abrangente de todos os componentes, hooks, serviços, tipos e utilitários presentes no projeto **Painel de Pedidos PWA**.

---

## 1. Visão Geral do Projeto

- **Stack**: React 18 + TypeScript + Tailwind CSS
- **PWA**: Service Worker para cache, suporte offline e sincronização
- **Integração**: API REST em `https://mercado-api-9sw5.onrender.com`
- **Cache**: IndexedDB + Cache Storage + estratégia inteligente
- **Impressão**: Módulo de pré-visualização e templates configuráveis

---

## 2. Estrutura de Pastas

```
├── public/                # Arquivos estáticos e PWA
├── build/                 # Artefatos de produção gerados
├── src/                   # Código-fonte principal
│   ├── components/        # Componentes React
│   │   ├── PWAStatus.tsx
│   │   ├── modals/        # Modais reutilizáveis
│   │   ├── orders/        # Itens de interface de pedidos
│   │   └── print/         # Botões e modais de impressão
│   ├── hooks/             # Hooks personalizados
│   ├── services/          # Conexão API, cache, websocket, impressão
│   ├── types/             # Definições TypeScript
│   └── utils/             # Funções utilitárias
├── .env                   # Variáveis de ambiente
├── tailwind.config.js     # Configuração do Tailwind CSS
├── postcss.config.js      # Configuração do PostCSS
├── tsconfig.json          # Configuração do TypeScript
└── package.json           # Dependências e scripts
```

---

## 3. Componentes React (src/components)

### 3.1. PWAStatus.tsx
Exibe indicadores de status da PWA (online/offline, SW ativo, cache).

### 3.2. modals/
- **AdvancedSearchModal.tsx**: Modal de busca avançada de pedidos (filtros e critérios).
- **ConfirmationModal.tsx**: Modal genérico para confirmação de ações.
- **EditPriceModal.tsx**: Modal específico para editar preço de item em pedido.
- **HelpModal.tsx**: Modal de ajuda e instruções do sistema.

### 3.3. orders/
- **OrderCard.tsx**: Cartão que apresenta resumo de cada pedido.
- **QuickActionMenu.tsx**: Menu flutuante com ações rápidas (status, impressão).

### 3.4. print/
- **PrintButton.tsx**: Botão que dispara o modal de impressão.
- **PrintPreviewModal.tsx**: Modal para pré-visualizar e configurar impressão (templates: completo, cozinha, entrega).

### 3.5. providers/
- **ThemeProvider.tsx**: Contexto para gerenciamento de tema claro/escuro.

---

## 4. Hooks Personalizados (src/hooks)

- **useApi.ts**: Abstrai chamadas HTTP (axios / fetch) configuradas via `.env`.
- **useOfflineSync.ts**: Gerencia fila de operações offline e sincronização automática.
- **useOrders.ts**: Hook principal para CRUD de pedidos e sincronização.
- **useServiceWorker.ts**: Controla o registro e eventos do Service Worker.
- **useSmartCache.ts**: Lógica de cache inteligente (stale-while-revalidate).
- **usePrint.ts**: Gatilho do fluxo de impressão e templates.
- **useTheme.ts**: Alterna entre modos claro e escuro.

---

## 5. Serviços (src/services)

### 5.1. API (src/services/api)
- **api-barrel.ts**: Barrel file para exportar módulos de API.
- **apiService.ts / api.ts**: Implementação de cliente REST (GET, POST, PUT, DELETE).
- **apiAdapter.ts**: Adapta dados do backend para modelos do frontend.
- **apiUtils.ts**: Funções utilitárias (tratamento de erros, interceptors).

### 5.2. Cache (src/services/cache)
- **indexedDBService.ts**: Abstração do IndexedDB para armazenar dados localmente.
- **ordersStorage.ts**: CRUD local de pedidos, estatísticas e sincronização inicial.

### 5.3. Persistence (src/services/persistence)
- **localPersistence.ts**: Persistência local via localStorage + fallback.

### 5.4. WebSocket (src/services/websocket)
- **ordersWebSocket.ts**: Gerencia conexão WS para atualizações em tempo real.

### 5.5. Print (src/services/print)
- **PrintService.ts**: Obtém templates, prepara dados e registra histórico de impressão.

---

## 6. Tipos TypeScript (src/types)

- **index.ts**: Interfaces e enums principais (Order, OrderItem, OrderStatus, Customer, etc.).
- **api.ts**: Tipos de resposta e requisição da API.

---

## 7. Utilitários (src/utils)

- **formatters.ts**: Formatação de datas, moeda, percentual e texto.

---

## 8. Configurações e Scripts

- **.env**: Variáveis de ambiente (API URL, WS URL, timeout, debug, impressão, analytics, Sentry).
- **package.json**: Scripts:
  - `npm start`: DEV server
  - `npm run build`: Build PWA
  - `npm test`: Executa testes
- **tsconfig.json**: Configurações de compilação TypeScript
- **tailwind.config.js / postcss.config.js**: Ajustes de design e responsividade

---

## 9. PWA e Offline

- **public/sw.js**: Estratégias de cache (Network-first API, Cache-first assets, fallback HTML).
- **public/manifest.json**: Configurações de instalação (ícones, nome do app).

---

## 10. Testes e Validações

Arquivos de teste no root:
- **test-pwa-integration.html**: Validação de suporte PWA
- **test-live-api.html**: Monitora disponibilidade da API
- **test-integration.js**: Testa fluxo completo React ↔ API
- **test-api-connection.js**: Teste de conectividade básica

---

### Fim da Documentação

Este arquivo serve como ponto único de consulta sobre a arquitetura, componentes e fluxos de dados do projeto. Para detalhes de implementação, consulte os arquivos dentro de cada pasta referenciada.
