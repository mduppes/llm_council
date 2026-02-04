import { useEffect, useState } from 'react';
import { useChatStore } from './stores/chatStore';
import { fetchModels } from './services/api';
import { HistorySidebar, ModelSelector, ResponseGrid, ChatInput } from './components';
import { UsagePanel } from './components/UsagePanel';
import { Menu, X, BarChart3 } from 'lucide-react';

function App() {
  const { setAvailableModels, connectWebSocket, disconnectWebSocket } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [usagePanelOpen, setUsagePanelOpen] = useState(false);
  
  // Initialize on mount
  useEffect(() => {
    // Load available models
    fetchModels()
      .then(setAvailableModels)
      .catch(console.error);
    
    // Connect WebSocket
    connectWebSocket();
    
    return () => {
      disconnectWebSocket();
    };
  }, [setAvailableModels, connectWebSocket, disconnectWebSocket]);
  
  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <aside 
        className={`
          ${sidebarOpen ? 'w-64' : 'w-0'} 
          flex-shrink-0 bg-slate-800 border-r border-slate-700
          transition-all duration-300 overflow-hidden
          flex flex-col
        `}
      >
        <div className="flex-1 overflow-hidden">
          <HistorySidebar />
        </div>
        
        {/* Model selector at bottom of sidebar */}
        <div className="border-t border-slate-700">
          <ModelSelector />
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-4 px-4 py-3 border-b border-slate-700 bg-slate-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-slate-400" />
            ) : (
              <Menu className="w-5 h-5 text-slate-400" />
            )}
          </button>
          
          <h1 className="text-lg font-semibold text-slate-200">
            LLM Council
          </h1>
          
          <span className="text-sm text-slate-500 flex-1">
            Chat with multiple LLMs simultaneously
          </span>
          
          <button
            onClick={() => setUsagePanelOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm text-slate-300"
          >
            <BarChart3 className="w-4 h-4" />
            Usage
          </button>
        </header>
        
        {/* Chat area */}
        <ResponseGrid />
        
        {/* Input */}
        <ChatInput />
      </main>
      
      {/* Usage panel modal */}
      {usagePanelOpen && (
        <UsagePanel onClose={() => setUsagePanelOpen(false)} />
      )}
    </div>
  );
}

export default App;
