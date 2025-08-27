import React, { useState } from 'react';
import useClaude from '../../hooks/useClaude';

interface ClaudeAssistantProps {
  className?: string;
}

const ClaudeAssistant: React.FC<ClaudeAssistantProps> = ({ className = '' }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'analyze' | 'suggest'>('chat');
  const { loading, error, response, sendMessage, analyzeOrder, generateSuggestions, clearResponse } = useClaude();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    switch (mode) {
      case 'chat':
        await sendMessage(input);
        break;
      case 'analyze':
        await analyzeOrder(input);
        break;
      case 'suggest':
        await generateSuggestions(input);
        break;
    }
    
    // Não limpar o input após envio para permitir modificações
  };

  return (
    <div className={`claude-assistant ${className}`}>
      <div className="p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Assistente Claude</h2>
        
        {/* Seletor de modo */}
        <div className="mb-4">
          <div className="flex border rounded overflow-hidden">
            <button 
              className={`flex-1 py-2 ${mode === 'chat' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              onClick={() => setMode('chat')}
            >
              Chat
            </button>
            <button 
              className={`flex-1 py-2 ${mode === 'analyze' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              onClick={() => setMode('analyze')}
            >
              Analisar Pedido
            </button>
            <button 
              className={`flex-1 py-2 ${mode === 'suggest' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              onClick={() => setMode('suggest')}
            >
              Sugestões
            </button>
          </div>
        </div>
        
        {/* Formulário de entrada */}
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea 
            className="w-full p-3 border rounded resize-y min-h-[120px]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'chat' 
                ? "Digite sua mensagem para o Claude..." 
                : mode === 'analyze' 
                ? "Cole o texto do pedido para análise..." 
                : "Cole o histórico de pedidos do cliente para sugestões..."
            }
          />
          <div className="flex justify-between mt-2">
            <button
              type="button"
              onClick={() => setInput('')}
              className="px-4 py-2 bg-gray-200 rounded"
              disabled={loading}
            >
              Limpar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
              disabled={loading || !input.trim()}
            >
              {loading ? 'Processando...' : 'Enviar'}
            </button>
          </div>
        </form>
        
        {/* Área de resposta */}
        {error && (
          <div className="p-3 bg-red-100 border-red-300 border rounded mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {response && (
          <div className="p-4 bg-gray-50 border rounded">
            <div className="flex justify-between mb-2">
              <h3 className="font-medium">Resposta do Claude:</h3>
              <button 
                onClick={clearResponse}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Limpar
              </button>
            </div>
            <div className="claude-response whitespace-pre-wrap">
              {response}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaudeAssistant;
