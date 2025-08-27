// Preload script para o Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expõe funções seguras para o processo de renderização
contextBridge.exposeInMainWorld('electronAPI', {
  // Enviar mensagem para o processo principal
  enviarMensagem: (mensagem) => {
    ipcRenderer.send('mensagem-do-renderer', mensagem);
  },
  
  // Receber resposta do processo principal
  receberResposta: (callback) => {
    ipcRenderer.on('resposta-do-main', (event, ...args) => callback(...args));
    return () => {
      ipcRenderer.removeAllListeners('resposta-do-main');
    };
  },
  
  // Receber novos pedidos
  receberPedidos: (callback) => {
    ipcRenderer.on('novos-pedidos', (event, ...args) => callback(...args));
    return () => {
      ipcRenderer.removeAllListeners('novos-pedidos');
    };
  },
  
  // Obter versão do aplicativo
  getVersion: () => {
    return process.env.npm_package_version || '1.0.0';
  },
  
  // Funções relacionadas a impressora
  impressora: {
    imprimir: (conteudo) => {
      ipcRenderer.send('imprimir', conteudo);
    },
    getImpressoras: () => {
      return ipcRenderer.invoke('get-impressoras');
    }
  }
});

// Notifica o processo de renderização que o script preload foi carregado
window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script carregado com sucesso');
});
