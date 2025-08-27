# Mercado Express - Sistema de Pedidos

## 🚀 Instalação Rápida

### 1. Instalar dependências
```bash
npm install
```

### 2. Instalar Tailwind CSS (se não instalou)
```bash
npm install -D tailwindcss postcss autoprefixer
```

### 3. Instalar Lucide Icons (ícones)
```bash
npm install lucide-react
```

### 4. Rodar o projeto
```bash
npm start
```

## 📁 Estrutura de Pastas

```
src/
├── components/
│   ├── orders/
│   │   ├── OrderCard.tsx
│   │   └── QuickActionMenu.tsx
│   ├── modals/
│   │   ├── EditPriceModal.tsx
│   │   ├── AdvancedSearchModal.tsx
│   │   ├── HelpModal.tsx
│   │   └── ConfirmationModal.tsx
│   └── print/
│       ├── PrintButton.tsx
│       └── PrintPreviewModal.tsx
├── hooks/
│   ├── useOrders.ts
│   ├── useTheme.ts
│   └── usePrint.ts
├── services/
│   └── print/
│       └── PrintService.ts
├── types/
│   └── index.ts
├── utils/
│   └── formatters.ts
├── App.tsx
├── index.tsx
└── index.css
```

## 🐛 Correção de Erros Comuns

### Erro: "Cannot find module 'lucide-react'"
```bash
npm install lucide-react
```

### Erro: "Cannot find module './types'"
Certifique-se que o arquivo `src/types/index.ts` existe

### Erro no useOrders.ts
Se houver erros de tipo, verifique se o arquivo types/index.ts tem todas as interfaces exportadas

### Erro no Tailwind CSS
1. Certifique-se que os arquivos de config existem:
   - tailwind.config.js
   - postcss.config.js
   
2. Reinicie o servidor:
```bash
npm start
```

## 🎨 Temas

O sistema suporta Light/Dark mode. Para alternar, use o botão de tema no header.

## 📱 Mobile

O sistema é totalmente responsivo. No mobile:
- Deslize cards para direita: WhatsApp
- Deslize cards para esquerda: Editar
- Menu inferior para navegação

## ⌨️ Atalhos de Teclado

- `Ctrl+F`: Buscar
- `Ctrl+R`: Atualizar
- `Ctrl+K`: Busca avançada
- `?`: Ajuda
- `0-3`: Filtros rápidos

## 🖨️ Impressão

Clique em "Imprimir" em qualquer pedido para:
- Ver preview antes de imprimir
- Escolher template (completo, cozinha, entrega)
- Configurar margens e opções
- Imprimir múltiplos pedidos

## 🔧 Desenvolvimento

### Adicionar novos componentes
Coloque em `src/components/` seguindo a estrutura existente

### Adicionar novos hooks
Coloque em `src/hooks/` e exporte do arquivo

### Modificar tipos
Edite `src/types/index.ts` e o TypeScript irá validar automaticamente