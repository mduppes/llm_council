import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';

export function ChatInput() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { sendMessage, isLoading, wsConnected, selectedModels, availableModels } = useChatStore();
  
  // Get names of selected models
  const selectedModelNames = selectedModels
    .map(id => availableModels.find(m => m.id === id)?.name || id.split('/').pop() || id)
    .sort();
  
  const canSubmit = input.trim() && wsConnected && selectedModels.length > 0 && !isLoading;
  
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!canSubmit) return;
    
    sendMessage(input.trim());
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);
  
  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-700 bg-slate-800 p-4">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !wsConnected 
                ? "Connecting to server..." 
                : selectedModels.length === 0 
                  ? "Select at least one model..."
                  : "Send a message to all selected models..."
            }
            disabled={!wsConnected || isLoading}
            rows={1}
            className="w-full resize-none rounded-xl bg-slate-700 border border-slate-600 
                       px-4 py-3 pr-12 text-slate-100 placeholder-slate-400
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-shrink-0 p-3 rounded-xl bg-primary-600 text-white
                     hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      
      {/* Status indicators */}
      <div className="flex flex-col items-center gap-1 mt-2 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span>{selectedModels.length} model(s) selected</span>
        </div>
        {selectedModels.length > 0 && (
          <div className="text-slate-400 text-center max-w-2xl truncate">
            {selectedModelNames.join(', ')}
          </div>
        )}
      </div>
    </form>
  );
}
