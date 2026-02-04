import { useEffect, useState, useCallback, useRef } from 'react';
import { useChatStore } from './stores/chatStore';
import { fetchGroupedModels } from './services/api';
import { HistorySidebar, ModelSelector, ResponseGrid, ChatInput } from './components';
import { UsagePanel } from './components/UsagePanel';
import { Menu, X, BarChart3 } from 'lucide-react';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 280;

function App() {
  const { setProviders, connectWebSocket, disconnectWebSocket } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [usagePanelOpen, setUsagePanelOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('llm-council-sidebar-width');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    localStorage.setItem('llm-council-sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Add/remove event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
  // Initialize on mount
  useEffect(() => {
    // Load available models (grouped by provider)
    fetchGroupedModels()
      .then(setProviders)
      .catch(console.error);
    
    // Connect WebSocket
    connectWebSocket();
    
    return () => {
      disconnectWebSocket();
    };
  }, [setProviders, connectWebSocket, disconnectWebSocket]);
  
  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        style={{ width: sidebarOpen ? sidebarWidth : 0 }}
        className="flex-shrink-0 bg-slate-800 border-r border-slate-700 overflow-hidden flex flex-col relative"
      >
        <div className="flex-1 overflow-hidden">
          <HistorySidebar />
        </div>
        
        {/* Model selector at bottom of sidebar */}
        <div className="border-t border-slate-700">
          <ModelSelector />
        </div>
        
        {/* Resize handle */}
        {sidebarOpen && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-primary-500/50 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />
        )}
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
