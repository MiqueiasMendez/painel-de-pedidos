// Ferramenta de diagnóstico para a API
// Adicione ao seu index.html:
// <script src="/logs/debug.js"></script>

(function() {
  // Intercepta todas as chamadas de fetch
  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options) {
    const startTime = Date.now();
    console.log(`🔍 [DEBUG] Iniciando requisição para: ${url}`, options);
    
    try {
      const response = await originalFetch(url, options);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Clonar a resposta para poder lê-la sem consumir o original
      const clone = response.clone();
      
      // Registrar a resposta
      try {
        const text = await clone.text();
        console.log(`✅ [DEBUG] Resposta de ${url} (${duration}ms):`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries([...response.headers.entries()]),
          body: text.length < 1000 ? text : `${text.substring(0, 1000)}... (truncado)`
        });
        
        // Tentar fazer parse de JSON (apenas para log)
        try {
          if (text && text.trim() && (
              response.headers.get('content-type')?.includes('application/json') ||
              text.trim().startsWith('{') || 
              text.trim().startsWith('[')
            )) {
            console.log('📦 [DEBUG] Dados JSON:', JSON.parse(text));
          }
        } catch (jsonError) {
          console.log('⚠️ [DEBUG] Erro ao fazer parse JSON:', jsonError);
        }
      } catch (textError) {
        console.log(`⚠️ [DEBUG] Erro ao ler resposta de ${url}:`, textError);
      }
      
      return response;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`❌ [DEBUG] Erro na requisição para ${url} (${duration}ms):`, error);
      throw error;
    }
  };
  
  // Verificar conexão API
  window.testApiConnection = function(url = 'https://mercado-api-9sw5.onrender.com') {
    console.log('🧪 Testando conexão com a API...');
    
    const endpoints = [
      `${url}/api/health`,
      `${url}/health`,
      `${url}/api/status`,
      `${url}/status`,
      `${url}/api`,
      url
    ];
    
    endpoints.forEach(endpoint => {
      fetch(endpoint, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      })
      .then(response => {
        console.log(`✅ Endpoint ${endpoint}: ${response.status} ${response.statusText}`);
        return response.text();
      })
      .then(text => {
        console.log(`📦 Resposta de ${endpoint}:`, text.substring(0, 100));
      })
      .catch(error => {
        console.error(`❌ Erro em ${endpoint}:`, error);
      });
    });
  };
  
  // Verificar CORS
  window.testCors = function(url = 'https://mercado-api-9sw5.onrender.com') {
    console.log('🧪 Testando CORS...');
    
    fetch(url, {
      method: 'OPTIONS',
      mode: 'cors'
    })
    .then(response => {
      console.log('✅ Preflight response:', {
        status: response.status,
        headers: Object.fromEntries([...response.headers.entries()])
      });
    })
    .catch(error => {
      console.error('❌ Erro no preflight:', error);
    });
    
    // Também testar com proxy CORS
    const corsProxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    ];
    
    corsProxies.forEach(proxyUrl => {
      fetch(proxyUrl)
      .then(response => {
        console.log(`✅ Proxy ${proxyUrl}: ${response.status}`);
        return response.text();
      })
      .then(text => {
        console.log(`📦 Resposta via proxy:`, text.substring(0, 100));
      })
      .catch(error => {
        console.error(`❌ Erro no proxy ${proxyUrl}:`, error);
      });
    });
  };
  
  console.log('🔧 Ferramenta de diagnóstico da API carregada. Use window.testApiConnection() ou window.testCors() para testar a conexão.');
})();