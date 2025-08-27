/**
 * Teste de conexão com a API do Painel de Pedidos
 */

// Importar o adaptador de API
const { CompleteApiAdapter } = require('./src/services/api-adapter-complete');

// Criar uma instância do adaptador
const api = new CompleteApiAdapter({
  baseUrl: 'https://mercado-api-9sw5.onrender.com/api',
  debug: true
});

// Verificar a saúde da API
async function checkHealth() {
  try {
    console.log('Verificando saúde da API...');
    const health = await api.checkHealth();
    console.log('Resultado:', health);
    
    return health.success;
  } catch (error) {
    console.error('Erro ao verificar saúde da API:', error);
    return false;
  }
}

// Obter pedidos
async function getOrders() {
  try {
    console.log('\nObtendo pedidos...');
    const orders = await api.getOrders();
    
    if (orders.success && orders.data) {
      const count = Array.isArray(orders.data) ? orders.data.length : 
                    orders.data.orders ? orders.data.orders.length : 0;
      
      console.log(`✅ Sucesso! ${count} pedidos encontrados.`);
      
      // Mostrar parte dos dados
      if (count > 0) {
        const sample = Array.isArray(orders.data) ? orders.data[0] : 
                      orders.data.orders ? orders.data.orders[0] : null;
        
        if (sample) {
          console.log('\n📦 Exemplo de pedido:');
          console.log('- ID:', sample.id);
          console.log('- Cliente:', sample.customer.name);
          console.log('- Status:', sample.status);
          console.log('- Total:', sample.total);
          console.log('- Itens:', sample.items.length);
        }
      }
    } else {
      console.log('❌ Falha ao obter pedidos:', orders.message || 'Erro desconhecido');
    }
    
    return orders.success;
  } catch (error) {
    console.error('❌ Erro ao obter pedidos:', error);
    return false;
  }
}

// Função principal de teste
async function runTests() {
  console.log('🔍 INICIANDO TESTES DE CONEXÃO COM API');
  console.log('======================================');
  
  // Verificar saúde
  const healthOk = await checkHealth();
  
  if (!healthOk) {
    console.log('\n❌ API não está respondendo. Abortando testes.');
    return;
  }
  
  // Buscar pedidos
  const ordersOk = await getOrders();
  
  // Relatório final
  console.log('\n📋 RELATÓRIO FINAL');
  console.log('==================');
  console.log('Saúde da API:', healthOk ? '✅ OK' : '❌ Falha');
  console.log('Obtenção de pedidos:', ordersOk ? '✅ OK' : '❌ Falha');
  
  if (healthOk && ordersOk) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('O adaptador de API está funcionando corretamente.');
  } else {
    console.log('\n⚠️ ALGUNS TESTES FALHARAM.');
    console.log('Verifique a conexão com a API ou o adaptador.');
  }
}

// Executar os testes
runTests().catch(console.error);