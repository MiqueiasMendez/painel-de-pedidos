#!/usr/bin/env node

/**
 * Claude CLI - Assistente de linha de comando
 * Para usar: claude "sua pergunta aqui"
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

// Configuração
const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.claude-cli.json');

// Função para salvar/carregar configuração
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.error('Erro ao carregar configuração:', error.message);
  }
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Erro ao salvar configuração:', error.message);
  }
}

// Função para configurar a API key
function setupApiKey() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Digite sua chave API do Claude: ', (apiKey) => {
      const config = loadConfig();
      config.apiKey = apiKey.trim();
      saveConfig(config);
      console.log('✅ Chave API salva com sucesso!');
      rl.close();
      resolve(apiKey.trim());
    });
  });
}

// Função principal
async function main() {
  const args = process.argv.slice(2);

  // Verificar se é comando de configuração
  if (args[0] === 'config' || args[0] === 'setup') {
    await setupApiKey();
    return;
  }

  // Verificar se há pergunta
  if (args.length === 0) {
    console.log(`
🤖 Claude CLI - Assistente de linha de comando

Uso:
  claude "sua pergunta aqui"
  claude config                # Configurar chave API
  claude setup                 # Configurar chave API

Exemplos:
  claude "Como corrigir erro de TypeScript?"
  claude "Explique este código JavaScript"
  claude "Criar função para validar email"
    `);
    return;
  }

  // Carregar configuração
  const config = loadConfig();
  let apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;

  // Verificar se há chave API
  if (!apiKey) {
    console.log('❌ Chave API não encontrada.');
    console.log('Configure sua chave API usando: claude config');
    console.log('Ou defina a variável de ambiente ANTHROPIC_API_KEY');
    return;
  }

  // Juntar todos os argumentos em uma pergunta
  const question = args.join(' ');

  try {
    console.log('🤔 Pensando...\n');

    // Inicializar cliente Claude
    const anthropic = new Anthropic({
      apiKey: apiKey
    });

    // Fazer pergunta ao Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: question
        }
      ]
    });

    // Exibir resposta
    console.log('🤖 Claude:\n');
    console.log(message.content[0].text);
    console.log();

  } catch (error) {
    console.error('❌ Erro ao consultar Claude:', error.message);
    
    if (error.message.includes('authentication')) {
      console.log('💡 Verifique sua chave API usando: claude config');
    }
  }
}

// Executar
if (require.main === module) {
  main().catch(console.error);
}
