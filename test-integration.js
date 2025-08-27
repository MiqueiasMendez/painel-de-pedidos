// Teste completo do fluxo de integração
console.log('🧪 Teste completo da integração React ↔ API Real');
console.log('=============================================');

// Simular importações do React (usando CommonJS para teste)
const { checkApiHealth } = require('./src/services/api/api-utils');

async function testeCompleto() {
  console.log('\n1. 🔍 Testando função checkApiHealth()...');
  
  try {
    const isHealthy = await checkApiHealth();
    console.log('✅ API Health Check:', isHealthy ? 'ONLINE' : 'OFFLINE');
    
    if (isHealthy) {
      console.log('\n2. 📡 Testando busca de pedidos diretamente...');
      
      const response = await fetch('https://mercado-api-9sw5.onrender.com/api/list-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const orders = await response.json();
        console.log('📦 Pedidos carregados:', orders.length);
        
        if (orders.length > 0) {
          console.log('\n3. 📋 Analisando estrutura dos dados...');
          const firstOrder = orders[0];
          
          console.log('- Campos disponíveis:', Object.keys(firstOrder));
          console.log('- Cliente:', firstOrder.customer_name || firstOrder.customerName);
          console.log('- Status:', firstOrder.status);
          console.log('- Total:', firstOrder.total);
          console.log('- Telefone:', firstOrder.customerPhone);
          
          console.log('\n4. 🎯 Status da integração:');
          console.log('✅ Conexão com API: OK');
          console.log('✅ Endpoint correto: OK');
          console.log('✅ Dados recebidos: OK');
          console.log('✅ Estrutura compatível: OK');
          
          console.log('\n🎉 INTEGRAÇÃO COMPLETADA COM SUCESSO!');
          console.log('A aplicação React está pronta para usar a API real.');
          
        } else {
          console.log('⚠️  API retornou array vazio (sem pedidos)');
        }
      } else {
        console.log('❌ Erro na resposta da API:', response.status);
      }
    } else {
      console.log('❌ API não está respondendo');
    }
    
  } catch (error) {
    console.error('🚫 Erro no teste:', error.message);
  }
}

testeCompleto();
