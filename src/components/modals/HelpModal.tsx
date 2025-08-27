/**
 * @fileoverview Modal de ajuda com documentação e atalhos
 * @module components/modals/HelpModal
 */

import React, { useState } from 'react';
import {
  X,
  Keyboard,
  HelpCircle,
  Book,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Search,
  Zap,
  MousePointer,
  Monitor,
  Smartphone,
  Info,
  CheckCircle,
  AlertTriangle,
  Clock,
  Package,
  Truck,
  DollarSign,
  Printer,
  Edit2,
  RefreshCw,
  Settings,
  User,
  Shield,
  Sparkles,
  Youtube,
  FileText,
  Download
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

// ==================== INTERFACES ====================
interface HelpModalProps {
  onClose: () => void;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

interface Shortcut {
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'filters';
}

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

interface VideoTutorial {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  url: string;
}

// ==================== CONSTANTS ====================
const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['Ctrl', 'F'], description: 'Focar na busca', category: 'navigation' },
  { keys: ['Ctrl', 'R'], description: 'Atualizar pedidos', category: 'navigation' },
  { keys: ['Ctrl', 'K'], description: 'Busca avançada', category: 'navigation' },
  { keys: ['Esc'], description: 'Fechar modal/menu', category: 'navigation' },
  { keys: ['Tab'], description: 'Navegar entre elementos', category: 'navigation' },
  { keys: ['?'], description: 'Abrir ajuda', category: 'navigation' },
  
  // Actions
  { keys: ['Enter'], description: 'Confirmar ação', category: 'actions' },
  { keys: ['Ctrl', 'P'], description: 'Imprimir pedido selecionado', category: 'actions' },
  { keys: ['Ctrl', 'E'], description: 'Editar preços', category: 'actions' },
  { keys: ['Ctrl', 'W'], description: 'Enviar WhatsApp', category: 'actions' },
  { keys: ['Delete'], description: 'Cancelar pedido', category: 'actions' },
  
  // Filters
  { keys: ['0'], description: 'Mostrar todos os pedidos', category: 'filters' },
  { keys: ['1'], description: 'Filtrar pendentes', category: 'filters' },
  { keys: ['2'], description: 'Filtrar em preparação', category: 'filters' },
  { keys: ['3'], description: 'Filtrar prontos', category: 'filters' },
  { keys: ['4'], description: 'Filtrar em entrega', category: 'filters' }
];

const FAQS: FAQ[] = [
  {
    question: 'Como altero o status de um pedido?',
    answer: 'Clique no botão principal do card do pedido ou arraste o card entre as colunas. O sistema solicitará confirmação antes de fazer a mudança.',
    category: 'pedidos'
  },
  {
    question: 'Posso editar preços depois do pedido criado?',
    answer: 'Sim! Clique no botão "Editar" no card do pedido. Você poderá ajustar preços e quantidades, mas precisará informar um motivo para a alteração.',
    category: 'pedidos'
  },
  {
    question: 'Como funciona o sistema de impressão?',
    answer: 'Clique em "Imprimir" para ver um preview antes de enviar para a impressora. Você pode escolher diferentes templates (completo, cozinha, entrega) e configurar margens.',
    category: 'impressao'
  },
  {
    question: 'As notificações WhatsApp são automáticas?',
    answer: 'Sim, quando você altera o status de um pedido, o cliente recebe automaticamente uma mensagem. Você também pode enviar mensagens manuais clicando em "WhatsApp".',
    category: 'comunicacao'
  },
  {
    question: 'Como funciona o sistema offline?',
    answer: 'O sistema armazena dados localmente e continua funcionando sem internet. Quando a conexão voltar, as alterações são sincronizadas automaticamente.',
    category: 'sistema'
  },
  {
    question: 'Posso usar no celular?',
    answer: 'Sim! O sistema é totalmente responsivo. No celular, você pode deslizar os cards para ações rápidas: direita para WhatsApp, esquerda para editar.',
    category: 'mobile'
  },
  {
    question: 'Como faço busca avançada?',
    answer: 'Use Ctrl+K ou clique no ícone de filtro ao lado da busca. Você pode filtrar por data, valor, status, prioridade e muito mais.',
    category: 'busca'
  },
  {
    question: 'Existe limite de pedidos?',
    answer: 'Não há limite! O sistema foi otimizado para lidar com milhares de pedidos. Use os filtros para encontrar rapidamente o que precisa.',
    category: 'sistema'
  }
];

const VIDEO_TUTORIALS: VideoTutorial[] = [
  {
    id: '1',
    title: 'Introdução ao Sistema',
    duration: '3:45',
    thumbnail: '/tutorials/intro.jpg',
    url: '#'
  },
  {
    id: '2',
    title: 'Gerenciando Pedidos',
    duration: '5:20',
    thumbnail: '/tutorials/orders.jpg',
    url: '#'
  },
  {
    id: '3',
    title: 'Sistema de Impressão',
    duration: '4:15',
    thumbnail: '/tutorials/print.jpg',
    url: '#'
  },
  {
    id: '4',
    title: 'Usando no Mobile',
    duration: '2:30',
    thumbnail: '/tutorials/mobile.jpg',
    url: '#'
  }
];

// ==================== HELPER COMPONENTS ====================
const ShortcutKey: React.FC<{ keys: string[] }> = ({ keys }) => (
  <div className="flex items-center gap-1">
    {keys.map((key, index) => (
      <React.Fragment key={key}>
        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 
          dark:border-gray-600 rounded text-xs font-mono">
          {key}
        </kbd>
        {index < keys.length - 1 && <span className="text-gray-500">+</span>}
      </React.Fragment>
    ))}
  </div>
);

const StatusGuide: React.FC = () => {
  const statuses = [
    { 
      status: 'Pendente', 
      color: 'bg-yellow-100 text-yellow-700', 
      icon: Clock,
      description: 'Pedido recebido, aguardando confirmação' 
    },
    { 
      status: 'Confirmado', 
      color: 'bg-orange-100 text-orange-700', 
      icon: CheckCircle,
      description: 'Pedido confirmado, pronto para preparação' 
    },
    { 
      status: 'Preparando', 
      color: 'bg-blue-100 text-blue-700', 
      icon: Package,
      description: 'Produtos sendo separados/preparados' 
    },
    { 
      status: 'Pronto', 
      color: 'bg-green-100 text-green-700', 
      icon: CheckCircle,
      description: 'Pedido pronto para entrega/retirada' 
    },
    { 
      status: 'Em Entrega', 
      color: 'bg-purple-100 text-purple-700', 
      icon: Truck,
      description: 'Pedido saiu para entrega' 
    }
  ];

  return (
    <div className="space-y-3">
      {statuses.map(({ status, color, icon: Icon, description }) => (
        <div key={status} className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">{status}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const GestureGuide: React.FC = () => {
  const gestures = [
    {
      icon: '👉',
      action: 'Deslizar para direita',
      result: 'Abrir WhatsApp',
      device: 'mobile'
    },
    {
      icon: '👈',
      action: 'Deslizar para esquerda',
      result: 'Editar pedido',
      device: 'mobile'
    },
    {
      icon: '🖱️',
      action: 'Arrastar e soltar',
      result: 'Mudar status do pedido',
      device: 'desktop'
    },
    {
      icon: '📱',
      action: 'Toque longo',
      result: 'Menu de ações rápidas',
      device: 'mobile'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {gestures.map((gesture, index) => (
        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-2xl">{gesture.icon}</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {gesture.action}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {gesture.result}
            </div>
          </div>
          {gesture.device === 'mobile' ? (
            <Smartphone className="w-4 h-4 text-gray-400" />
          ) : (
            <Monitor className="w-4 h-4 text-gray-400" />
          )}
        </div>
      ))}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Define sections
  const sections: HelpSection[] = [
    {
      id: 'overview',
      title: 'Visão Geral',
      icon: Info,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 
            dark:to-yellow-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Bem-vindo ao Painel de Pedidos! 👋
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Este sistema foi desenvolvido para tornar o gerenciamento de pedidos simples, 
              rápido e eficiente. Aqui estão os principais recursos:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: Zap, text: 'Processamento rápido de pedidos' },
                { icon: MessageCircle, text: 'Notificações automáticas WhatsApp' },
                { icon: Printer, text: 'Sistema de impressão profissional' },
                { icon: Smartphone, text: 'Funciona em qualquer dispositivo' },
                { icon: Shield, text: 'Dados seguros e backup automático' },
                { icon: RefreshCw, text: 'Atualizações em tempo real' }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-orange-600" />
                    <span className="text-sm">{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Status dos Pedidos
            </h4>
            <StatusGuide />
          </div>
        </div>
      )
    },
    {
      id: 'shortcuts',
      title: 'Atalhos de Teclado',
      icon: Keyboard,
      content: (
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use estes atalhos para navegar mais rapidamente pelo sistema:
          </p>
          
          {['navigation', 'actions', 'filters'].map(category => (
            <div key={category}>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 capitalize">
                {category === 'navigation' ? 'Navegação' : 
                 category === 'actions' ? 'Ações' : 'Filtros'}
              </h4>
              <div className="space-y-2">
                {SHORTCUTS
                  .filter(shortcut => shortcut.category === category)
                  .map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between p-3 
                      bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <ShortcutKey keys={shortcut.keys} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'gestures',
      title: 'Gestos e Interações',
      icon: MousePointer,
      content: (
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            O sistema suporta gestos intuitivos para agilizar suas ações:
          </p>
          
          <GestureGuide />
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Dica Pro
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  No mobile, você pode usar gestos de swipe em qualquer card de pedido. 
                  No desktop, o drag and drop permite reorganizar pedidos rapidamente entre colunas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: 'Perguntas Frequentes',
      icon: HelpCircle,
      content: (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nas perguntas..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          
          <div className="space-y-3">
            {FAQS
              .filter(faq => 
                searchTerm === '' || 
                faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((faq, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === faq.question ? null : faq.question)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between 
                      hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg"
                  >
                    <span className="font-medium text-gray-900 dark:text-white pr-2">
                      {faq.question}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                      expandedFAQ === faq.question ? 'rotate-90' : ''
                    }`} />
                  </button>
                  {expandedFAQ === faq.question && (
                    <div className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
          </div>
          
          {FAQS.filter(faq => 
            searchTerm === '' || 
            faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
          ).length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Nenhuma pergunta encontrada para "{searchTerm}"
            </p>
          )}
        </div>
      )
    },
    {
      id: 'tutorials',
      title: 'Tutoriais em Vídeo',
      icon: Youtube,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Aprenda a usar todos os recursos do sistema com nossos tutoriais:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VIDEO_TUTORIALS.map(video => (
              <div key={video.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden 
                hover:shadow-md transition-shadow cursor-pointer">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-3 bg-red-600 rounded-full">
                      <Youtube className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 
                    text-white text-xs rounded">
                    {video.duration}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {video.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center">
            <a
              href="#"
              className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              Ver todos os tutoriais
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )
    },
    {
      id: 'support',
      title: 'Suporte',
      icon: MessageCircle,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 
            dark:to-emerald-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Precisa de Ajuda? 🤝
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Nossa equipe está sempre pronta para ajudar você!
            </p>
          </div>
          
          <div className="space-y-4">
            <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 
                rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <div className="p-3 bg-green-500 rounded-full">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  WhatsApp
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  (11) 99999-9999 - Resposta rápida
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </a>
            
            <a href="tel:+551133334444"
              className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 
                rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <div className="p-3 bg-blue-500 rounded-full">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  Telefone
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  (11) 3333-4444 - Seg a Sex, 9h às 18h
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </a>
            
            <a href="mailto:suporte@mercadoexpress.com"
              className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 
                rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <div className="p-3 bg-purple-500 rounded-full">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  Email
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  suporte@mercadoexpress.com
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </a>
          </div>
          
          <div className="border-t dark:border-gray-700 pt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Recursos Adicionais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a href="#" className="flex items-center gap-2 text-sm text-orange-600 
                hover:text-orange-700">
                <FileText className="w-4 h-4" />
                Documentação Completa
              </a>
              <a href="#" className="flex items-center gap-2 text-sm text-orange-600 
                hover:text-orange-700">
                <Download className="w-4 h-4" />
                Baixar Manual PDF
              </a>
              <a href="#" className="flex items-center gap-2 text-sm text-orange-600 
                hover:text-orange-700">
                <Sparkles className="w-4 h-4" />
                Novidades da Versão
              </a>
              <a href="#" className="flex items-center gap-2 text-sm text-orange-600 
                hover:text-orange-700">
                <User className="w-4 h-4" />
                Comunidade
              </a>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentSection = sections.find(s => s.id === activeSection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex">
        {/* Sidebar */}
        <div className="w-64 border-r dark:border-gray-700 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Central de Ajuda
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg 
                transition-colors md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="space-y-1">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg 
                    text-sm font-medium transition-colors
                    ${activeSection === section.id
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {section.title}
                </button>
              );
            })}
          </nav>
          
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-white mb-1">
                Versão do Sistema
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                v1.0.0
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Última atualização: 01/06/2024
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentSection && (
                <>
                  <currentSection.icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentSection.title}
                  </h3>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg 
                transition-colors hidden md:block"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {currentSection?.content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;