/**
 * @fileoverview Modal de busca avançada com múltiplos filtros
 * @module components/modals/AdvancedSearchModal
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Filter,
  Calendar,
  DollarSign,
  User,
  Tag,
  MapPin,
  CreditCard,
  Clock,
  Package,
  AlertTriangle,
  RotateCcw,
  Download,
  Upload,
  Save,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  TrendingUp,
  Hash,
  Phone,
  FileText,
  Truck
} from 'lucide-react';
import { 
  SearchFilters, 
  OrderStatus, 
  OrderPriority, 
  PaymentMethod,
  ORDER_STATUS_CONFIG 
} from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';

// ==================== INTERFACES ====================
interface AdvancedSearchModalProps {
  onSearch: (filters: SearchFilters) => void;
  onClose: () => void;
  currentFilters?: SearchFilters;
  totalOrders?: number;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: Date;
  icon?: string;
}

interface QuickFilter {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  filters: Partial<SearchFilters>;
}

// ==================== CONSTANTS ====================
const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'today',
    name: 'Hoje',
    icon: Calendar,
    color: 'blue',
    filters: {
      dateFrom: new Date().toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    }
  },
  {
    id: 'yesterday',
    name: 'Ontem',
    icon: Clock,
    color: 'purple',
    filters: {
      dateFrom: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      dateTo: new Date(Date.now() - 86400000).toISOString().split('T')[0]
    }
  },
  {
    id: 'week',
    name: 'Esta Semana',
    icon: Calendar,
    color: 'green',
    filters: {
      dateFrom: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    }
  },
  {
    id: 'month',
    name: 'Este Mês',
    icon: Calendar,
    color: 'orange',
    filters: {
      dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    }
  },
  {
    id: 'urgent',
    name: 'Urgentes',
    icon: AlertTriangle,
    color: 'red',
    filters: {
      priority: OrderPriority.URGENT
    }
  },
  {
    id: 'high-value',
    name: 'Alto Valor',
    icon: TrendingUp,
    color: 'emerald',
    filters: {
      minValue: 100
    }
  }
];

const DEFAULT_FILTERS: SearchFilters = {
  text: '',
  status: [],
  priority: undefined,
  dateFrom: '',
  dateTo: '',
  minValue: undefined,
  maxValue: undefined,
  paymentMethod: undefined,
  customer: '',
  tags: []
};

// ==================== HELPER COMPONENTS ====================
const DateRangePicker: React.FC<{
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
}> = ({ dateFrom, dateTo, onChange }) => {
  const handlePresetClick = (days: number) => {
    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    onChange(from.toISOString().split('T')[0], to.toISOString().split('T')[0]);
  };

  const presets = [
    { label: 'Hoje', days: 0 },
    { label: '7 dias', days: 7 },
    { label: '30 dias', days: 30 },
    { label: '90 dias', days: 90 }
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data Inicial
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onChange(e.target.value, dateTo)}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
              border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data Final
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onChange(dateFrom, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
              border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        {presets.map(preset => (
          <button
            key={preset.label}
            onClick={() => handlePresetClick(preset.days)}
            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 
              dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const PriceRangeInput: React.FC<{
  minValue?: number;
  maxValue?: number;
  onChange: (min?: number, max?: number) => void;
}> = ({ minValue, maxValue, onChange }) => {
  const handleMinChange = (value: string) => {
    const num = value ? parseFloat(value) : undefined;
    onChange(num, maxValue);
  };

  const handleMaxChange = (value: string) => {
    const num = value ? parseFloat(value) : undefined;
    onChange(minValue, num);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Valor Mínimo
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
          <input
            type="number"
            step="0.01"
            value={minValue || ''}
            onChange={(e) => handleMinChange(e.target.value)}
            placeholder="0,00"
            className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
              border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Valor Máximo
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
          <input
            type="number"
            step="0.01"
            value={maxValue || ''}
            onChange={(e) => handleMaxChange(e.target.value)}
            placeholder="0,00"
            className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
              border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>
    </div>
  );
};

const MultiSelectChips: React.FC<{
  options: Array<{ value: string; label: string; color?: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
  label: string;
}> = ({ options, selected, onChange, label }) => {
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => toggleOption(option.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${isSelected
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
              style={{
                borderWidth: '2px',
                borderColor: isSelected ? option.color || '#ff6500' : 'transparent'
              }}
            >
              <span className="flex items-center gap-2">
                {isSelected && <Check className="w-3 h-3" />}
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  onSearch,
  onClose,
  currentFilters = DEFAULT_FILTERS,
  totalOrders = 0
}) => {
  const { theme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [filters, setFilters] = useState<SearchFilters>(currentFilters);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');
  const [activeSection, setActiveSection] = useState<string>('all');

  // ==================== EFFECTS ====================
  useEffect(() => {
    // Load saved filters from localStorage
    const saved = localStorage.getItem('savedSearchFilters');
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Focus search input on mount
    searchInputRef.current?.focus();
  }, []);

  // ==================== HANDLERS ====================
  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    onSearch(filters);
    onClose();
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const applyQuickFilter = (quickFilter: QuickFilter) => {
    setFilters(prev => ({ ...prev, ...quickFilter.filters }));
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;
    
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: { ...filters },
      createdAt: new Date()
    };
    
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('savedSearchFilters', JSON.stringify(updated));
    setFilterName('');
  };

  const applySavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
  };

  const deleteSavedFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('savedSearchFilters', JSON.stringify(updated));
  };

  const exportFilters = () => {
    const dataStr = JSON.stringify(filters, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportName = `filters-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof SearchFilters];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '' && value !== null;
  });

  // Options for multi-select
  const statusOptions = Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label,
    color: config.color
  }));

  const paymentOptions = Object.entries(PaymentMethod).map(([key, value]) => ({
    value: value,
    label: value
  }));

  const tagOptions = [
    { value: 'vip', label: 'VIP' },
    { value: 'delivery', label: 'Entrega' },
    { value: 'pickup', label: 'Retirada' },
    { value: 'first-time', label: 'Primeira Compra' },
    { value: 'complaint', label: 'Reclamação' },
    { value: 'promotion', label: 'Promoção' }
  ];

  // ==================== RENDER ====================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Search className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Busca Avançada
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {totalOrders} pedidos disponíveis para busca
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Quick Filters */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Filtros Rápidos
            </h3>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 
                  flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {QUICK_FILTERS.map(quickFilter => {
              const Icon = quickFilter.icon;
              return (
                <button
                  key={quickFilter.id}
                  onClick={() => applyQuickFilter(quickFilter)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium 
                    transition-all hover:scale-105 active:scale-95
                    bg-${quickFilter.color}-100 dark:bg-${quickFilter.color}-900/30 
                    text-${quickFilter.color}-700 dark:text-${quickFilter.color}-400
                    hover:bg-${quickFilter.color}-200 dark:hover:bg-${quickFilter.color}-900/50`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {quickFilter.name}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Text Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar por texto
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={filters.text || ''}
                onChange={(e) => updateFilter('text', e.target.value)}
                placeholder="Número do pedido, nome do cliente, telefone, produto..."
                className="w-full pl-10 pr-3 py-3 border rounded-lg bg-white dark:bg-gray-700 
                  border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Busca em todos os campos do pedido
            </p>
          </div>
          
          {/* Sections */}
          <div className="space-y-6">
            {/* Date Range */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Período
                </h3>
              </div>              <DateRangePicker
                dateFrom={typeof filters.dateFrom === 'string' ? filters.dateFrom : ''}
                dateTo={typeof filters.dateTo === 'string' ? filters.dateTo : ''}
                onChange={(from, to) => {
                  updateFilter('dateFrom', from);
                  updateFilter('dateTo', to);
                }}
              />
            </div>
            
            {/* Status */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Status do Pedido
                </h3>
              </div>
              <MultiSelectChips
                options={statusOptions}
                selected={filters.status || []}
                onChange={(selected) => updateFilter('status', selected as OrderStatus[])}
                label=""
              />
            </div>
            
            {/* Price Range */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Faixa de Valor
                </h3>
              </div>
              <PriceRangeInput
                minValue={filters.minValue}
                maxValue={filters.maxValue}
                onChange={(min, max) => {
                  updateFilter('minValue', min);
                  updateFilter('maxValue', max);
                }}
              />
            </div>
            
            {/* Payment Method */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Forma de Pagamento
                </h3>
              </div>
              <select
                value={filters.paymentMethod || 'all'}
                onChange={(e) => updateFilter('paymentMethod', e.target.value === 'all' ? undefined : e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                  border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="all">Todas</option>
                {paymentOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Priority */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Prioridade
                </h3>
              </div>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value="all"
                    checked={!filters.priority}
                    onChange={() => updateFilter('priority', undefined)}
                    className="text-orange-500 focus:ring-orange-500/20"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Todas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value="normal"
                    checked={filters.priority === OrderPriority.NORMAL}
                    onChange={() => updateFilter('priority', OrderPriority.NORMAL)}
                    className="text-orange-500 focus:ring-orange-500/20"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Normal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value="urgent"
                    checked={filters.priority === OrderPriority.URGENT}
                    onChange={() => updateFilter('priority', OrderPriority.URGENT)}
                    className="text-orange-500 focus:ring-orange-500/20"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Urgente</span>
                </label>
              </div>
            </div>
            
            {/* Tags */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Etiquetas
                </h3>
              </div>
              <MultiSelectChips
                options={tagOptions}
                selected={filters.tags || []}
                onChange={(selected) => updateFilter('tags', selected)}
                label=""
              />
            </div>
            
            {/* Customer */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Cliente Específico
                </h3>
              </div>
              <input
                type="text"
                value={filters.customer || ''}
                onChange={(e) => updateFilter('customer', e.target.value)}
                placeholder="Nome ou ID do cliente"
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                  border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
          
          {/* Saved Filters */}
          <div className="mt-6">
            <button
              onClick={() => setShowSavedFilters(!showSavedFilters)}
              className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              <Save className="w-4 h-4" />
              Filtros Salvos ({savedFilters.length})
              {showSavedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showSavedFilters && (
              <div className="mt-3 space-y-3">
                {/* Save current filter */}
                {hasActiveFilters && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="Nome do filtro..."
                      className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                        border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    <button
                      onClick={saveCurrentFilter}
                      disabled={!filterName.trim()}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white 
                        rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Salvar
                    </button>
                  </div>
                )}
                
                {/* List saved filters */}
                {savedFilters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {savedFilters.map(saved => (
                      <div
                        key={saved.id}
                        className="bg-white dark:bg-gray-700 rounded-lg p-3 border 
                          border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {saved.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Criado em {formatDate(saved.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => applySavedFilter(saved)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                              title="Aplicar filtro"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => deleteSavedFilter(saved.id)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                              title="Excluir filtro"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Nenhum filtro salvo ainda
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={exportFilters}
                disabled={!hasActiveFilters}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 
                  hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium 
                  transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              
              <button
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 
                  hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium 
                  transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Limpar
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                  dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white 
                  rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchModal;