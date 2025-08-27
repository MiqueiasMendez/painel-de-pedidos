import React, { useState, useEffect, useCallback } from 'react';

// Redefinindo a interface do Window sem usar declaração global
interface CustomWindow extends Window {
  electronAPI?: {
    enviarMensagem: (mensagem: string) => void;
    receberResposta: (callback: (resposta: string) => void) => void;
    receberPedidos: (callback: (pedidos: any) => void) => void;
  };
}

// Componente de integração com o Electron
const ElectronIntegration: React.FC = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [version, setVersion] = useState<string>('1.0.0');

  // Verificar se estamos rodando no Electron
  useEffect(() => {
    // Verifica se a API do Electron está disponível
    const customWindow = window as CustomWindow;
    
    if (customWindow.electronAPI) {
      setIsElectron(true);
      
      // Configura receptor de respostas
      customWindow.electronAPI.receberResposta((resposta) => {
        setMensagem(resposta);
      });
    }
  }, []);

  // Função para enviar mensagem para o processo principal
  const handleTestClick = () => {
    const customWindow = window as CustomWindow;
    
    if (customWindow.electronAPI) {
      customWindow.electronAPI.enviarMensagem('Teste de comunicação do React para Electron');
    }
  };

  // Se não estiver rodando no Electron, não renderiza nada
  if (!isElectron) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <span className="text-sm font-medium">
            Aplicativo Desktop
          </span>
        </div>
        
        <div className="mt-2">
          <button 
            onClick={handleTestClick}
            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
          >
            Testar Comunicação
          </button>
          
          {mensagem && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              {mensagem}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectronIntegration;
