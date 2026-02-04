import { useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { Square, CheckSquare, ChevronDown, ChevronRight, KeyRound, Eye, Wrench, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Model, Provider } from '../types';

// Provider colors for visual distinction
const providerColors: Record<string, string> = {
  openai: 'bg-green-500',
  anthropic: 'bg-orange-500',
  google: 'bg-blue-500',
  gemini: 'bg-blue-500',
  xai: 'bg-purple-500',
  mistral: 'bg-red-500',
  cohere: 'bg-cyan-500',
  together_ai: 'bg-yellow-500',
  groq: 'bg-pink-500',
  deepseek: 'bg-indigo-500',
  perplexity: 'bg-teal-500',
};

function formatCost(cost: number | null | undefined): string {
  if (cost == null) return '?';
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

interface ProviderSectionProps {
  provider: Provider;
  selectedModels: string[];
  onToggleModel: (modelId: string) => void;
  expandedProviders: Set<string>;
  onToggleProvider: (providerId: string) => void;
}

function ProviderSection({ provider, selectedModels, onToggleModel, expandedProviders, onToggleProvider }: ProviderSectionProps) {
  const isExpanded = expandedProviders.has(provider.id);
  const colorClass = providerColors[provider.id] || 'bg-slate-500';
  const selectedCount = provider.models.filter(m => selectedModels.includes(m.id)).length;
  const availableCount = provider.models.filter(m => m.has_api_key).length;
  
  return (
    <div className={clsx(
      "rounded-md overflow-hidden",
      provider.has_api_key ? "bg-slate-800/50" : "bg-slate-800/20"
    )}>
      {/* Provider header */}
      <button
        onClick={() => onToggleProvider(provider.id)}
        className={clsx(
          "w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors",
          "hover:bg-slate-700/50",
          !provider.has_api_key && "opacity-60"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
        )}
        
        <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", colorClass)} />
        
        <span className="font-medium text-slate-200 flex-1">
          {provider.name}
        </span>
        
        {!provider.has_api_key && (
          <span className="flex items-center gap-1 text-xs text-amber-400" title="API key not configured">
            <KeyRound className="w-3 h-3" />
          </span>
        )}
        
        <span className="text-xs text-slate-500">
          {selectedCount > 0 && `${selectedCount}/`}{availableCount}
        </span>
      </button>
      
      {/* Model list */}
      {isExpanded && (
        <div className="pl-4 pr-2 pb-1.5 space-y-0.5">
          {provider.models.map((model) => (
            <ModelItem
              key={model.id}
              model={model}
              isSelected={selectedModels.includes(model.id)}
              onToggle={() => onToggleModel(model.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ModelItemProps {
  model: Model;
  isSelected: boolean;
  onToggle: () => void;
}

function ModelItem({ model, isSelected, onToggle }: ModelItemProps) {
  const hasCost = model.input_cost_per_million != null || model.output_cost_per_million != null;
  
  // Build tooltip content
  const tooltipParts: string[] = [];
  if (model.description) {
    tooltipParts.push(model.description);
    tooltipParts.push('');
  }
  if (hasCost) {
    tooltipParts.push(`Input: ${formatCost(model.input_cost_per_million)}/1M tokens`);
    tooltipParts.push(`Output: ${formatCost(model.output_cost_per_million)}/1M tokens`);
  }
  if (model.max_tokens) {
    tooltipParts.push(`Context: ${(model.max_tokens / 1000).toFixed(0)}K tokens`);
  }
  if (!model.has_api_key) {
    tooltipParts.push('⚠️ API key not configured');
  }
  const tooltip = tooltipParts.join('\n');
  
  return (
    <button
      onClick={onToggle}
      disabled={!model.has_api_key}
      className={clsx(
        "w-full flex items-center gap-2 px-2 py-1 rounded text-left text-sm transition-colors",
        model.has_api_key 
          ? isSelected 
            ? "bg-slate-700" 
            : "bg-transparent hover:bg-slate-700/50"
          : "opacity-40 cursor-not-allowed"
      )}
      title={tooltip}
    >
      {isSelected ? (
        <CheckSquare className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
      ) : (
        <Square className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
      )}
      
      <span className={clsx(
        "truncate flex-1",
        isSelected ? "text-slate-200" : "text-slate-400"
      )}>
        {model.name}
      </span>
      
      {/* Capability badges */}
      <div className="flex items-center gap-1 flex-shrink-0">

        {model.supports_vision && (
          <span title="Supports vision">
            <Eye className="w-3 h-3 text-blue-400" />
          </span>
        )}
        {model.supports_tools && (
          <span title="Supports tools">
            <Wrench className="w-3 h-3 text-green-400" />
          </span>
        )}
        {!model.has_api_key && (
          <span title="API key missing">
            <AlertCircle className="w-3 h-3 text-amber-400" />
          </span>
        )}
      </div>
      
      {hasCost && model.has_api_key && (
        <span className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap">
          {formatCost(model.input_cost_per_million)}/{formatCost(model.output_cost_per_million)}
        </span>
      )}
    </button>
  );
}

export function ModelSelector() {
  const { providers, availableModels, selectedModels, toggleModel, selectAllModels, deselectAllModels } = useChatStore();
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(() => {
    // Start with providers that have API keys expanded
    const initialExpanded = new Set<string>();
    providers.filter(p => p.has_api_key).forEach(p => initialExpanded.add(p.id));
    return initialExpanded;
  });
  
  const allSelected = selectedModels.length === availableModels.length;
  const noneSelected = selectedModels.length === 0;
  
  const toggleProvider = (providerId: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };
  
  if (providers.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 text-sm">
        Loading models...
      </div>
    );
  }
  
  // Separate available and unavailable providers
  const availableProviders = providers.filter(p => p.has_api_key);
  const unavailableProviders = providers.filter(p => !p.has_api_key);
  
  return (
    <div className="p-3 max-h-80 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">Models</h3>
        <div className="flex gap-1">
          <button
            onClick={selectAllModels}
            disabled={allSelected}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            All
          </button>
          <button
            onClick={deselectAllModels}
            disabled={noneSelected}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            None
          </button>
        </div>
      </div>
      
      <div className="space-y-1.5">
        {/* Available providers first */}
        {availableProviders.map((provider) => (
          <ProviderSection
            key={provider.id}
            provider={provider}
            selectedModels={selectedModels}
            onToggleModel={toggleModel}
            expandedProviders={expandedProviders}
            onToggleProvider={toggleProvider}
          />
        ))}
        
        {/* Divider if there are unavailable providers */}
        {unavailableProviders.length > 0 && availableProviders.length > 0 && (
          <div className="border-t border-slate-700 my-2 pt-2">
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1.5 px-2">
              <KeyRound className="w-3 h-3" />
              <span>Missing API Keys</span>
            </div>
          </div>
        )}
        
        {/* Unavailable providers */}
        {unavailableProviders.map((provider) => (
          <ProviderSection
            key={provider.id}
            provider={provider}
            selectedModels={selectedModels}
            onToggleModel={toggleModel}
            expandedProviders={expandedProviders}
            onToggleProvider={toggleProvider}
          />
        ))}
      </div>
    </div>
  );
}
