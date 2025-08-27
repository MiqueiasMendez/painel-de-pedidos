# Painel de Pedidos

Sistema de gerenciamento de pedidos para pequenos negócios, disponível como aplicativo web e desktop.

## Versão Desktop (Electron)

O sistema também pode ser executado como aplicativo nativo para desktop usando Electron, oferecendo:

- Funcionamento offline completo
- Integração com hardware local (impressoras)
- Notificações nativas do sistema
- Recebimento automático de novos pedidos

Antes de rodar a versão desktop pela primeira vez, execute `npm install` para baixar todas as dependências de desenvolvimento (incluindo o Electron). O comando `npm run electron:dev` abre o aplicativo em modo de desenvolvimento e `npm run electron:build` gera o instalador para Windows.

### Comandos para Versão Desktop

```bash
# Executar em modo de desenvolvimento
npm run electron:dev

# Construir o instalador para Windows
npm run electron:build
```

## Versão Mobile (PWA)

O projeto também funciona em dispositivos móveis como um aplicativo web progressivo (PWA). Basta acessar a URL no navegador do celular e escolher a opção **Adicionar à tela inicial** para ter uma experiência semelhante a um app nativo, com suporte a funcionamento offline e notificações quando ativadas.

### Opções de Build Nativo

Caso seja necessário distribuir o aplicativo pelas lojas oficiais, existem algumas possibilidades:

- **Integração com Capacitor**: Utilize o [Capacitor](https://capacitorjs.com/) para empacotar o PWA como aplicativo nativo, mantendo o mesmo código base.
- **Projeto React Native**: Crie um projeto em React Native que compartilhe a lógica de negócios deste repositório, permitindo uma experiência totalmente nativa.


## Diagnóstico da API

Para resolver problemas de comunicação com a API, adicionamos ferramentas de diagnóstico:

1. **Página de Diagnóstico**: Abra `/logs/api-status.html` no navegador para verificar a conexão com a API.

2. **Debug Script**: Adicione ao seu `index.html` para inspecionar todas as chamadas de rede:
   ```html
   <script src="/logs/debug.js"></script>
   ```
   
3. **Console do Navegador**: Use os comandos:
   - `window.testApiConnection()` - Testa a conexão com vários endpoints
   - `window.testCors()` - Verifica problemas de CORS

## Problemas Comuns

### API Offline ou Lenta

O painel agora utiliza a API somente para **receber novos pedidos** e para **informar que eles estão prontos**. Quando a API estiver indisponível:

1. Todas as funções continuam operando com os dados locais
2. Uma mensagem "Modo de Demonstração" aparece no topo
3. Você pode clicar em "Tentar Reconectar" para buscar novos pedidos assim que a conexão voltar

### Erros de CORS

Se estiver desenvolvendo localmente e vir erros de CORS:

1. O app agora usa proxies CORS automaticamente em ambiente de desenvolvimento
2. Você pode adicionar mais proxies na configuração se necessário

### Problema com Formato de Dados

A API pode retornar dados em diferentes formatos. Implementamos:

1. Adaptadores robustos que aceitam múltiplos formatos
2. Tratamento para diferentes nomenclaturas (camelCase, snake_case)
3. Lógica de fallback para evitar crashes quando dados estão incompletos

### Reconexão Automática

O sistema agora:

1. Detecta quando o dispositivo volta a ficar online
2. Tenta reconectar com backoff exponencial
3. Mostra status de conexão no componente PWAStatus

## Configuração

A configuração da API está em `/src/config/api.config.ts`. Você pode ajustar:

- `BASE_URL`: URL base da API
- `TIMEOUT`: Tempo limite das requisições (15000ms por padrão)
- `MAX_RETRIES`: Número máximo de tentativas (3 por padrão)
- `SYNC_INTERVAL`: Intervalo de sincronização (5 minutos por padrão)

### Variáveis de Ambiente

Copie `.env.example` para `.env` e defina a variável:

- `CLAUDE_API_KEY`: chave da API do Claude

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start

# Construir para produção
npm run build
```