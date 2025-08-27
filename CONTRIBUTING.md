# Guia de Contribuição

Obrigado por considerar contribuir para o Painel de Pedidos! Este documento fornece orientações para contribuir com o projeto.

## Como Contribuir

1. **Faça um Fork do repositório**
2. **Clone o seu fork localmente**
3. **Crie uma branch para sua feature**:
   ```
   git checkout -b feature/nome-da-feature
   ```
4. **Faça suas alterações**
5. **Commit suas alterações**:
   ```
   git commit -m "Descrição clara da alteração"
   ```
6. **Push para a sua branch**:
   ```
   git push origin feature/nome-da-feature
   ```
7. **Abra um Pull Request**

## Padrões de Código

- Utilizamos TypeScript para todo o código
- Seguimos a convenção de nomes camelCase para variáveis e funções
- Componentes React usam PascalCase
- Todos os componentes devem ser funcionais e usar hooks

## Testes

- Todos os novos recursos devem incluir testes
- Certifique-se de que todos os testes passam antes de submeter um PR

## Versão Desktop (Electron)

Para contribuir com a versão desktop:

1. Teste suas alterações em ambos os modos: web e desktop
2. Certifique-se de que as funcionalidades específicas do desktop estão isoladas corretamente
3. Documente qualquer nova funcionalidade específica do desktop
