import clsx from 'clsx';
import { Clock, Coins, AlertCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { ModelResponse } from '../types';

// Provider colors
const providerColors: Record<string, { bg: string; border: string; text: string }> = {
  openai: { bg: 'bg-green-900/30', border: 'border-green-700', text: 'text-green-400' },
  anthropic: { bg: 'bg-orange-900/30', border: 'border-orange-700', text: 'text-orange-400' },
  google: { bg: 'bg-blue-900/30', border: 'border-blue-700', text: 'text-blue-400' },
  xai: { bg: 'bg-purple-900/30', border: 'border-purple-700', text: 'text-purple-400' },
};

function getProviderFromModelId(modelId: string): string {
  if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'openai';
  if (modelId.startsWith('claude')) return 'anthropic';
  if (modelId.startsWith('gemini')) return 'google';
  if (modelId.startsWith('xai') || modelId.startsWith('grok')) return 'xai';
  return 'default';
}

interface ModelCardProps {
  response: ModelResponse;
}

export function ModelCard({ response }: ModelCardProps) {
  const [copied, setCopied] = useState(false);
  
  const provider = getProviderFromModelId(response.model_id);
  const colors = providerColors[provider] || { 
    bg: 'bg-slate-800', 
    border: 'border-slate-600', 
    text: 'text-slate-400' 
  };
  
  const handleCopy = async () => {
    if (!response.content) return;
    
    try {
      await navigator.clipboard.writeText(response.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };
  
  return (
    <div className={clsx(
      "flex flex-col rounded-xl border",
      colors.bg,
      colors.border,
      "min-w-0 max-h-[600px]"
    )}>
      {/* Header */}
      <div className={clsx(
        "flex items-center justify-between px-4 py-2 border-b",
        colors.border
      )}>
        <div className="flex items-center gap-2">
          <span className={clsx("font-medium", colors.text)}>
            {response.model_name}
          </span>
          {response.isStreaming && (
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        
        <button
          onClick={handleCopy}
          disabled={!response.content}
          className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-50 transition-colors"
          title="Copy response"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {response.error ? (
          <div className="flex items-start gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Error</div>
              <div className="text-sm opacity-80">{response.error}</div>
            </div>
          </div>
        ) : (
          <div className={clsx(
            "text-slate-200 whitespace-pre-wrap",
            response.isStreaming && "typing-cursor"
          )}>
            {response.content || (
              <span className="text-slate-500 italic">Waiting for response...</span>
            )}
          </div>
        )}
      </div>
      
      {/* Footer with metadata */}
      {!response.isStreaming && (response.latency_ms || response.tokens_output) && (
        <div className={clsx(
          "flex items-center gap-4 px-4 py-2 border-t text-xs",
          colors.border,
          "text-slate-500"
        )}>
          {response.latency_ms && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {(response.latency_ms / 1000).toFixed(2)}s
            </span>
          )}
          {response.tokens_output && (
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3" />
              {response.tokens_output} tokens
            </span>
          )}
        </div>
      )}
    </div>
  );
}
