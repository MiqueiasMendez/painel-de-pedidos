import React from 'react';
import ClaudeAssistant from './ClaudeAssistant';

interface ClaudeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ClaudeModal: React.FC<ClaudeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Assistente Claude</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-grow overflow-auto p-4">
          <ClaudeAssistant />
        </div>
        
        <div className="p-4 border-t">
          <div className="text-xs text-gray-500">
            Powered by Anthropic Claude. As respostas são geradas por IA e podem não ser 100% precisas.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaudeModal;
