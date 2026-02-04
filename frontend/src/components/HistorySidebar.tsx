import { useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { fetchConversations, fetchConversation, deleteConversation } from '../services/api';
import { MessageSquare, Plus, Trash2, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function HistorySidebar() {
  const { 
    conversations, 
    setConversations, 
    conversationId,
    setCurrentConversation,
    clearCurrentConversation,
  } = useChatStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);
  
  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectConversation = async (id: string) => {
    if (id === conversationId) return;
    
    try {
      const data = await fetchConversation(id);
      setCurrentConversation(data.id, data.messages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };
  
  const handleNewConversation = () => {
    clearCurrentConversation();
  };
  
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (deletingId) return;
    
    setDeletingId(id);
    try {
      await deleteConversation(id);
      setConversations(conversations.filter(c => c.id !== id));
      
      // If we deleted the current conversation, clear it
      if (id === conversationId) {
        clearCurrentConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setDeletingId(null);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <button
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 
                     bg-primary-600 hover:bg-primary-500 rounded-lg
                     text-white font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>
      
      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            No conversations yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={clsx(
                  "w-full group flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                  conv.id === conversationId
                    ? "bg-slate-700"
                    : "hover:bg-slate-800"
                )}
              >
                <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-slate-400" />
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">
                    {conv.title || 'Untitled'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {formatDate(conv.updated_at)} · {conv.message_count} messages
                  </div>
                </div>
                
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-600 
                             rounded transition-all"
                  disabled={deletingId === conv.id}
                >
                  {deletingId === conv.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                  )}
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Refresh button */}
      <div className="p-2 border-t border-slate-700">
        <button
          onClick={loadConversations}
          disabled={isLoading}
          className="w-full text-xs text-slate-500 hover:text-slate-400 py-2 transition-colors"
        >
          {isLoading ? 'Loading...' : 'Refresh history'}
        </button>
      </div>
    </div>
  );
}
