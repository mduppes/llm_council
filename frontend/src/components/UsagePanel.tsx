import { useState, useEffect } from 'react';
import { BarChart3, DollarSign, Zap, Clock, RefreshCw, X } from 'lucide-react';
import clsx from 'clsx';
import { fetchUsageStats } from '../services/api';

interface ModelUsage {
  model_id: string;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  request_count: number;
  avg_latency_ms: number;
  estimated_cost: number;
  input_cost_per_million: number;
  output_cost_per_million: number;
}

interface UsageStats {
  period: string;
  start_date: string | null;
  end_date: string;
  summary: {
    total_input_tokens: number;
    total_output_tokens: number;
    total_tokens: number;
    total_estimated_cost: number;
    model_count: number;
  };
  models: ModelUsage[];
}

// Provider colors
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

function getProviderFromModelId(modelId: string): string {
  const lowerModelId = modelId.toLowerCase();
  
  // Check for explicit provider prefixes first
  if (lowerModelId.startsWith('openai/') || lowerModelId.startsWith('gpt')) return 'openai';
  if (lowerModelId.startsWith('anthropic/') || lowerModelId.startsWith('claude')) return 'anthropic';
  if (lowerModelId.startsWith('gemini/') || lowerModelId.startsWith('gemini')) return 'gemini';
  if (lowerModelId.startsWith('xai/') || lowerModelId.includes('grok')) return 'xai';
  if (lowerModelId.startsWith('mistral/') || lowerModelId.includes('mistral')) return 'mistral';
  if (lowerModelId.startsWith('cohere/') || lowerModelId.includes('command')) return 'cohere';
  if (lowerModelId.startsWith('together_ai/') || lowerModelId.startsWith('together/')) return 'together_ai';
  if (lowerModelId.startsWith('groq/')) return 'groq';
  if (lowerModelId.startsWith('deepseek/') || lowerModelId.includes('deepseek')) return 'deepseek';
  if (lowerModelId.startsWith('perplexity/')) return 'perplexity';
  
  // Fallback to checking for known patterns
  if (lowerModelId.includes('openai')) return 'openai';
  if (lowerModelId.includes('anthropic')) return 'anthropic';
  
  return 'default';
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatCost(cost: number): string {
  if (cost < 0.01) return '<$0.01';
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

interface UsagePanelProps {
  onClose: () => void;
}

export function UsagePanel({ onClose }: UsagePanelProps) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('month');

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsageStats(period);
      setStats(data);
    } catch (e) {
      setError('Failed to load usage stats');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">Usage Statistics</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              className="p-1.5 rounded hover:bg-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={clsx("w-4 h-4 text-slate-400", loading && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 px-4 py-2 border-b border-slate-700">
          {(['day', 'week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                "px-3 py-1 rounded text-sm transition-colors",
                period === p
                  ? "bg-primary-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              )}
            >
              {p === 'all' ? 'All Time' : `Last ${p.charAt(0).toUpperCase() + p.slice(1)}`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">{error}</div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Zap className="w-4 h-4" />
                    Total Tokens
                  </div>
                  <div className="text-2xl font-bold text-slate-100">
                    {formatNumber(stats.summary.total_tokens)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatNumber(stats.summary.total_input_tokens)} in / {formatNumber(stats.summary.total_output_tokens)} out
                  </div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    Estimated Cost
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {formatCost(stats.summary.total_estimated_cost)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Based on current pricing
                  </div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <BarChart3 className="w-4 h-4" />
                    Models Used
                  </div>
                  <div className="text-2xl font-bold text-slate-100">
                    {stats.summary.model_count}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Different models queried
                  </div>
                </div>
              </div>

              {/* Per-model breakdown */}
              {stats.models.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Usage by Model</h3>
                  <div className="space-y-2">
                    {stats.models.map((model) => {
                      const provider = getProviderFromModelId(model.model_id);
                      const colorClass = providerColors[provider] || 'bg-slate-600';
                      const maxTokens = Math.max(...stats.models.map((m) => m.total_tokens));
                      const percentage = (model.total_tokens / maxTokens) * 100;
                      
                      return (
                        <div key={model.model_id} className="bg-slate-700/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={clsx("w-2 h-2 rounded-full", colorClass)} />
                              <span className="text-sm font-medium text-slate-200">
                                {model.model_name}
                              </span>
                            </div>
                            <span className="text-sm text-green-400 font-medium">
                              {formatCost(model.estimated_cost)}
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="h-2 bg-slate-600 rounded-full overflow-hidden mb-2">
                            <div
                              className={clsx("h-full rounded-full", colorClass)}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{formatNumber(model.total_tokens)} tokens</span>
                            <span>{model.request_count} requests</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {(model.avg_latency_ms / 1000).toFixed(1)}s avg
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  No usage data for this period
                </div>
              )}

              {/* Note about costs */}
              <div className="text-xs text-slate-500 text-center space-y-2">
                <p>
                  💡 Costs are estimates based on LiteLLM pricing data. Actual billing may vary.
                </p>
                <p>Check your provider dashboards for accurate billing:</p>
                <div className="flex flex-wrap justify-center gap-3 mt-1">
                  <a
                    href="https://platform.openai.com/usage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 underline"
                  >
                    OpenAI
                  </a>
                  <a
                    href="https://console.anthropic.com/settings/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 underline"
                  >
                    Anthropic
                  </a>
                  <a
                    href="https://console.cloud.google.com/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Google Cloud
                  </a>
                  <a
                    href="https://console.x.ai/team/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    xAI
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
