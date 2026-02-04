import { useChatStore } from '../stores/chatStore';
import { Check, Square, CheckSquare } from 'lucide-react';
import clsx from 'clsx';

// Provider colors for visual distinction
const providerColors: Record<string, string> = {
  openai: 'bg-green-600',
  anthropic: 'bg-orange-600',
  google: 'bg-blue-600',
  xai: 'bg-purple-600',
};

export function ModelSelector() {
  const { availableModels, selectedModels, toggleModel, selectAllModels, deselectAllModels } = useChatStore();
  
  const allSelected = selectedModels.length === availableModels.length;
  const noneSelected = selectedModels.length === 0;
  
  if (availableModels.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 text-sm">
        No models available.
        <br />
        Check API key configuration.
      </div>
    );
  }
  
  return (
    <div className="p-3">
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
      
      <div className="space-y-1">
        {availableModels.map((model) => {
          const isSelected = selectedModels.includes(model.id);
          const colorClass = providerColors[model.provider] || 'bg-slate-600';
          
          return (
            <button
              key={model.id}
              onClick={() => toggleModel(model.id)}
              className={clsx(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors",
                isSelected ? "bg-slate-700" : "bg-transparent hover:bg-slate-800"
              )}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-primary-400 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />
              )}
              
              <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", colorClass)} />
              
              <span className={clsx(
                "truncate",
                isSelected ? "text-slate-200" : "text-slate-400"
              )}>
                {model.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
