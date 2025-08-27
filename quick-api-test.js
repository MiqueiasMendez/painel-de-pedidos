/**
 * Teste rápido da API - Verifica saúde e busca pedidos
 * Execute com: node quick-api-test.js
 */

// Importar o adaptador da API
const { CompleteApiAdapter } = require('./src/services/api-adapter-complete');

// Criar instância do adaptador
const api = new CompleteApiAdapter({
  baseUrl: 'https://mercado-api-9sw5.onrender.com/api',
  debug: true
});

// Função principal
async function quickTest() {
  console.log('🧪 TESTE RÁPIDO DE API');
  console.log('=====================');

  try {
    // Verificar saúde
    console.log('\n1. Verificando saúde da API...');
    const health = await api.checkHealth();
    console.log(`   Resultado: ${health.success ? '✅ Online' : '❌ Offline'}`);
    
    if (!health.success) {
      console.log('   ⚠️ API offline. Abortando teste.');
      return;
    }
    
    // Buscar pedidos
    console.log('\n2. Buscando pedidos...');
    const orders = await api.getOrders();
    
    if (orders.success && orders.data) {
      const count = Array.isArray(orders.data) ? orders.data.length : 0;
      console.log(`   ✅ ${count} pedidos encontrados`);
      
      if (count > 0) {
        // Mostrar primeiro pedido
        const first = orders.data[0];
        console.log('\n   Exemplo de pedido:');
        console.log(`   ID: ${first.id}`);
        console.log(`   Cliente: ${first.customer.name}`);
        console.log(`   Status: ${first.status}`);
        console.log(`   Total: R$ ${first.total.toFixed(2)}`);
        console.log(`   Itens: ${first.items.length}`);
      }
    } else {
      console.log(`   ❌ Erro ao buscar pedidos: ${orders.message || 'Desconhecido'}`);
    }
    
    console.log('\n🏁 TESTE CONCLUÍDO');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
  }
}

// Executar o teste
quickTest().catch(console.error);