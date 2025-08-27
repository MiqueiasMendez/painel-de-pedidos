// claude-code-assistant.js
// Script para enviar código para o Claude API e receber sugestões

require('dotenv').config();
const { Anthropic } = require('@anthropic-ai/sdk');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Inicializar o cliente do Claude
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY, // Pegue da variável de ambiente
});

// Criar interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para ler arquivos
async function readFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    const content = await fs.promises.readFile(fullPath, 'utf8');
    return { success: true, content, path: fullPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Função para enviar pergunta ao Claude
async function askClaude(prompt) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 4000,
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });
    
    return message.content[0].text;
  } catch (error) {
    console.error("Erro ao consultar Claude:", error.message);
    return "Ocorreu um erro ao consultar o Claude. Verifique sua chave API e conexão.";
  }
}

// Função principal
async function main() {
  console.log("=== Claude Code Assistant ===");
  console.log("Este assistente ajuda a melhorar seu código usando o Claude AI");
  
  // Perguntar se quer analisar um arquivo ou inserir código manualmente
  rl.question("Você deseja (1) analisar um arquivo existente ou (2) inserir código manualmente? ", async (answer) => {
    let codeContent = "";
    let filePath = "";
    
    if (answer === "1") {
      // Analisar arquivo existente
      rl.question("Digite o caminho para o arquivo (relativo ou absoluto): ", async (path) => {
        const fileResult = await readFile(path);
        
        if (!fileResult.success) {
          console.log(`Erro ao ler arquivo: ${fileResult.error}`);
          rl.close();
          return;
        }
        
        codeContent = fileResult.content;
        filePath = fileResult.path;
        
        await processCodeRequest(codeContent, filePath);
      });
    } else {
      // Inserir código manualmente
      console.log("Cole seu código abaixo (Digite 'FIM' em uma linha separada quando terminar):");
      
      let inputCode = "";
      const collectCode = (line) => {
        if (line.trim() === "FIM") {
          codeContent = inputCode;
          rl.removeListener("line", collectCode);
          processCodeRequest(codeContent, "código inserido manualmente");
        } else {
          inputCode += line + "\n";
        }
      };
      
      rl.on("line", collectCode);
    }
  });
}

// Processar a requisição de código
async function processCodeRequest(code, source) {
  console.log(`\nAnalisando: ${source}\n`);
  
  rl.question("O que você gostaria de melhorar neste código? (Ex: otimização, bugs, refatoração, etc.): ", async (improvement) => {
    const prompt = `
# Código para analisar:
\`\`\`
${code}
\`\`\`

# O que preciso:
${improvement}

Por favor, analise este código e forneça sugestões concretas para melhorá-lo conforme solicitado.
Inclua exemplos de código quando relevante. Se houver problemas no código, explique por que são problemas
e como corrigi-los. Seja específico e forneça explicações claras.
`;

    console.log("\nConsultando Claude AI...");
    const response = await askClaude(prompt);
    
    console.log("\n=== Resposta do Claude ===\n");
    console.log(response);
    console.log("\n===========================\n");
    
    // Perguntar se o usuário deseja salvar a resposta
    rl.question("Deseja salvar esta resposta em um arquivo? (s/n): ", async (saveAnswer) => {
      if (saveAnswer.toLowerCase() === "s") {
        const filename = `claude-review-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
        fs.writeFileSync(filename, `# Análise de Código por Claude AI\n\n## Código Analisado\nArquivo: ${source}\n\n\`\`\`\n${code}\n\`\`\`\n\n## Solicitação\n${improvement}\n\n## Resposta do Claude\n\n${response}`);
        console.log(`Resposta salva em ${filename}`);
      }
      
      // Perguntar se o usuário deseja fazer outra pergunta sobre o mesmo código
      rl.question("Deseja fazer outra pergunta sobre este código? (s/n): ", (anotherQuestion) => {
        if (anotherQuestion.toLowerCase() === "s") {
          processCodeRequest(code, source);
        } else {
          rl.close();
        }
      });
    });
  });
}

// Iniciar o programa
main();
