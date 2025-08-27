import { useState, useEffect, useCallback } from 'react';

// Interface personalizada para tipagem da API do Electron
interface ElectronAPIType {
  enviarMensagem: (mensagem: string) => void;
  receberResposta: (callback: (resposta: string) => void) => void;
  receberPedidos: (callback: (pedidos: any) => void) => void;
  getVersion?: () => string;
  impressora?: {
    imprimir: (conteudo: string) => void;
    getImpressoras: () => Promise<string[]>;
  };
}

// Usar type assertion em vez de declaração global
interface CustomWindow extends Window {
  electronAPI?: ElectronAPIType;
}

export const useElectronAPI = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [version, setVersion] = useState<string>('1.0.0');
  const [novosPedidos, setNovosPedidos] = useState<any[]>([]);
  
  // Verificar se estamos rodando no Electron
  useEffect(() => {
    const customWindow = window as CustomWindow;
    
    if (customWindow.electronAPI) {
      setIsElectron(true);
      
      // Obter versão do aplicativo
      if (customWindow.electronAPI.getVersion) {
        try {
          const versao = customWindow.electronAPI.getVersion();
          setVersion(versao);
        } catch (error) {
          console.error('Erro ao obter versão:', error);
        }
      }
      
      // Configurar receptores de mensagens
      customWindow.electronAPI.receberResposta((resposta) => {
        setLastMessage(resposta);
      });
      
      customWindow.electronAPI.receberPedidos((pedidos) => {
        setNovosPedidos((prevPedidos) => [...prevPedidos, ...pedidos]);
      });
    }
  }, []);
  
  // Função para enviar mensagem para o processo principal
  const sendMessage = useCallback((message: string) => {
    const customWindow = window as CustomWindow;
    
    if (customWindow.electronAPI) {
      customWindow.electronAPI.enviarMensagem(message);
      return true;
    }
    return false;
  }, []);
  
  // Função para limpar novos pedidos
  const clearNewOrders = useCallback(() => {
    setNovosPedidos([]);
  }, []);
  
  // Função para imprimir
  const imprimir = useCallback((conteudo: string) => {
    const customWindow = window as CustomWindow;
    
    if (customWindow.electronAPI?.impressora) {
      customWindow.electronAPI.impressora.imprimir(conteudo);
      return true;
    }
    return false;
  }, []);
  
  // Função para obter impressoras disponíveis
  const getImpressoras = useCallback(async () => {
    const customWindow = window as CustomWindow;
    
    if (customWindow.electronAPI?.impressora) {
      try {
        return await customWindow.electronAPI.impressora.getImpressoras();
      } catch (error) {
        console.error('Erro ao obter impressoras:', error);
        return [];
      }
    }
    return [];
  }, []);
  
  return {
    isElectron,
    lastMessage,
    version,
    novosPedidos,
    sendMessage,
    clearNewOrders,
    imprimir,
    getImpressoras
  };
};
