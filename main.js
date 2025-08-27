const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const url = require('url');

// Manter referência global para evitar que a janela seja fechada automaticamente
let mainWindow;

// Simular recebimento de pedidos (em produção, isso viria de uma API externa)
function simularRecebimentoPedidos() {
  setInterval(() => {
    if (mainWindow) {
      // Simulação de um pedido novo
      const novoPedido = {
        id: Math.floor(Math.random() * 1000),
        cliente: "Cliente " + Math.floor(Math.random() * 100),
        valor: parseFloat((Math.random() * 100).toFixed(2)),
        itens: [
          { nome: "Produto " + Math.floor(Math.random() * 10), quantidade: Math.floor(Math.random() * 5) + 1 }
        ],
        status: "novo",
        timestamp: new Date().toISOString()
      };
      
      mainWindow.webContents.send('novos-pedidos', [novoPedido]);
    }
  }, 300000); // A cada 5 minutos (300000 ms)
}

function createWindow() {
  // Criar a janela do navegador
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public/icons/icon.png')
  });
  // Carregar o index.html da aplicação
  const startUrl = isDev 
    ? 'http://localhost:3000' // URL de desenvolvimento
    : url.format({
        pathname: path.join(__dirname, './build/index.html'),
        protocol: 'file:',
        slashes: true
      });
  
  mainWindow.loadURL(startUrl);

  // Abrir o DevTools no modo desenvolvimento
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Evento disparado quando a janela é fechada
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  
  // Iniciar simulação de recebimento de pedidos
  simularRecebimentoPedidos();
}

// Configurar handlers para comunicação IPC
function setupIPC() {
  // Responder a mensagens do renderer
  ipcMain.on('mensagem-do-renderer', (event, mensagem) => {
    console.log('Mensagem recebida do renderer:', mensagem);
    
    // Responder de volta ao renderer
    if (mainWindow) {
      mainWindow.webContents.send('resposta-do-main', 'Recebido: ' + mensagem);
    }
  });
}

// Este método será chamado quando Electron terminar a inicialização
app.whenReady().then(() => {
  createWindow();
  setupIPC();
});

// Sair quando todas as janelas forem fechadas, exceto no macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  // No macOS, é comum recriar uma janela no aplicativo quando o
  // ícone da dock é clicado e não há outras janelas abertas.
  if (mainWindow === null) createWindow();
});


// Aqui você pode implementar comunicações entre o processo principal e o processo de renderização
ipcMain.on('mensagem-do-renderer', (event, arg) => {
  console.log(arg); // Imprime a mensagem do processo de renderização
  event.reply('resposta-do-main', 'Mensagem recebida pelo processo principal!');
});
