import { useEffect } from 'react';
import { useChatStore } from './stores/chatStore';
import { fetchModels } from './services/api';
import { HistorySidebar, ModelSelector, ResponseGrid, ChatInput } from './components';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

function App() {
  const { setAvailableModels, connectWebSocket, disconnectWebSocket } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
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
          
          <span className="text-sm text-slate-500">
            Chat with multiple LLMs simultaneously
          </span>
        </header>
        
        {/* Chat area */}
        <ResponseGrid />
        
        {/* Input */}
        <ChatInput />
      </main>
    </div>
  );
}

export default App;
