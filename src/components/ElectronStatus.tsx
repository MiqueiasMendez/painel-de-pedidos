import React, { useEffect, useState } from 'react';

// Interface para tipagem do objeto window com API Electron
declare global {
  interface Window {
    electronAPI?: {
      enviarMensagem: (mensagem: string) => void;
      receberResposta: (callback: (resposta: string) => void) => void;
      receberPedidos: (callback: (pedidos: any) => void) => void;
    };
  }
}

// Hook personalizado para usar a API do Electron
export const useElectron = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [mensagem, setMensagem] = useState<string>('');
  const [novosPedidos, setNovosPedidos] = useState<any[]>([]);

  useEffect(() => {
    // Verificar se estamos rodando no Electron
    if (window.electronAPI) {
      setIsElectron(true);
      
      // Configurar listeners
      window.electronAPI.receberResposta((resposta) => {
        setMensagem(resposta);
      });
      
      window.electronAPI.receberPedidos((pedidos) => {
        setNovosPedidos(pedidos);
      });
    }
  }, []);

  // Função para enviar mensagem para o processo principal
  const enviarMensagem = (mensagem: string) => {
    if (window.electronAPI) {
      window.electronAPI.enviarMensagem(mensagem);
    }
  };

  return {
    isElectron,
    mensagem,
    novosPedidos,
    enviarMensagem
  };
};

// Componente de status do Electron
const ElectronStatus: React.FC = () => {
  const { isElectron, mensagem, enviarMensagem } = useElectron();

  const handleTestClick = () => {
    enviarMensagem('Teste de comunicação do React para Electron');
  };

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${isElectron ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            {isElectron ? 'Aplicativo Desktop' : 'Modo Navegador'}
          </span>
        </div>
        
        {isElectron && (
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
        )}
      </div>
    </div>
  );
};

export default ElectronStatus;
