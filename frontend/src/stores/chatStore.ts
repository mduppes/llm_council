import { create } from 'zustand';
import type { 
  Model, 
  Message, 
  ConversationSummary, 
  ModelResponse,
  WSMessage,
} from '../types';

interface ChatStore {
  // Current conversation
  conversationId: string | null;
  messages: Message[];
  
  // Streaming state
  isLoading: boolean;
  currentResponses: Record<string, ModelResponse>;
  
  // Model selection
  availableModels: Model[];
  selectedModels: string[];
  
  // History
  conversations: ConversationSummary[];
  
  // WebSocket
  ws: WebSocket | null;
  wsConnected: boolean;
  
  // Actions
  setAvailableModels: (models: Model[]) => void;
  toggleModel: (modelId: string) => void;
  selectAllModels: () => void;
  deselectAllModels: () => void;
  
  setConversations: (conversations: ConversationSummary[]) => void;
  setCurrentConversation: (id: string | null, messages: Message[]) => void;
  setMessages: (messages: Message[]) => void;
  clearCurrentConversation: () => void;
  
  // WebSocket actions
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  sendMessage: (message: string) => void;
  
  // Internal state updates from WebSocket
  _handleWSMessage: (data: WSMessage) => void;
  _addUserMessage: (content: string) => void;
}

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat/ws`;

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  conversationId: null,
  messages: [],
  isLoading: false,
  currentResponses: {},
  availableModels: [],
  selectedModels: [],
  conversations: [],
  ws: null,
  wsConnected: false,
  
  // Model actions
  setAvailableModels: (models) => {
    // Try to load saved selection from localStorage
    const savedModels = localStorage.getItem('llm-council-selected-models');
    let selectedModels: string[];
    
    if (savedModels) {
      try {
        const parsed = JSON.parse(savedModels) as string[];
        // Only use saved models that are still available
        selectedModels = parsed.filter(id => models.some(m => m.id === id));
        // If no saved models are valid, select all
        if (selectedModels.length === 0) {
          selectedModels = models.map(m => m.id);
        }
      } catch {
        selectedModels = models.map(m => m.id);
      }
    } else {
      // Select all models by default
      selectedModels = models.map(m => m.id);
    }
    
    set({ availableModels: models, selectedModels });
  },
  
  toggleModel: (modelId) => {
    const { selectedModels } = get();
    let newSelectedModels: string[];
    
    if (selectedModels.includes(modelId)) {
      newSelectedModels = selectedModels.filter(id => id !== modelId);
    } else {
      newSelectedModels = [...selectedModels, modelId];
    }
    
    // Persist to localStorage
    localStorage.setItem('llm-council-selected-models', JSON.stringify(newSelectedModels));
    set({ selectedModels: newSelectedModels });
  },
  
  selectAllModels: () => {
    const { availableModels } = get();
    const allModelIds = availableModels.map(m => m.id);
    localStorage.setItem('llm-council-selected-models', JSON.stringify(allModelIds));
    set({ selectedModels: allModelIds });
  },
  
  deselectAllModels: () => {
    localStorage.setItem('llm-council-selected-models', JSON.stringify([]));
    set({ selectedModels: [] });
  },
  
  // Conversation actions
  setConversations: (conversations) => {
    set({ conversations });
  },
  
  setCurrentConversation: (id, messages) => {
    set({ 
      conversationId: id, 
      messages,
      currentResponses: {},
      isLoading: false,
    });
  },
  
  setMessages: (messages) => {
    set({ messages });
  },
  
  clearCurrentConversation: () => {
    set({ 
      conversationId: null, 
      messages: [],
      currentResponses: {},
      isLoading: false,
    });
  },
  
  // WebSocket actions
  connectWebSocket: () => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) return;
    
    const newWs = new WebSocket(WS_URL);
    
    newWs.onopen = () => {
      console.log('WebSocket connected');
      set({ wsConnected: true });
    };
    
    newWs.onclose = () => {
      console.log('WebSocket disconnected');
      set({ wsConnected: false, ws: null });
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (!get().ws) {
          get().connectWebSocket();
        }
      }, 3000);
    };
    
    newWs.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    newWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        get()._handleWSMessage(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
    
    set({ ws: newWs });
  },
  
  disconnectWebSocket: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, wsConnected: false });
    }
  },
  
  sendMessage: (message) => {
    const { ws, wsConnected, selectedModels, conversationId, availableModels } = get();
    
    if (!ws || !wsConnected) {
      console.error('WebSocket not connected');
      return;
    }
    
    if (selectedModels.length === 0) {
      console.error('No models selected');
      return;
    }
    
    // Initialize response state for each selected model
    const initialResponses: Record<string, ModelResponse> = {};
    for (const modelId of selectedModels) {
      const model = availableModels.find(m => m.id === modelId);
      initialResponses[modelId] = {
        model_id: modelId,
        model_name: model?.name || modelId,
        content: '',
        isStreaming: true,
        tokens_input: null,
        tokens_output: null,
        latency_ms: null,
        error: null,
      };
    }
    
    set({ 
      isLoading: true,
      currentResponses: initialResponses,
    });
    
    // Add user message to local state
    get()._addUserMessage(message);
    
    // Send to server
    ws.send(JSON.stringify({
      type: 'chat',
      conversation_id: conversationId,
      message,
      models: selectedModels,
    }));
  },
  
  // Internal handlers
  _handleWSMessage: (data) => {
    switch (data.type) {
      case 'conversation_started':
        set({ conversationId: data.conversation_id });
        break;
        
      case 'token':
        set((state) => ({
          currentResponses: {
            ...state.currentResponses,
            [data.model_id]: {
              ...state.currentResponses[data.model_id],
              content: (state.currentResponses[data.model_id]?.content || '') + data.token,
            },
          },
        }));
        break;
        
      case 'model_complete':
        set((state) => ({
          currentResponses: {
            ...state.currentResponses,
            [data.model_id]: {
              model_id: data.model_id,
              model_name: data.model_name,
              content: data.content,
              isStreaming: false,
              tokens_input: data.tokens_input,
              tokens_output: data.tokens_output,
              latency_ms: data.latency_ms,
              error: data.error,
            },
          },
        }));
        break;
        
      case 'chat_complete':
        // Convert current responses to messages
        const { currentResponses, messages } = get();
        const assistantMessages: Message[] = Object.values(currentResponses).map(resp => ({
          id: `${resp.model_id}-${Date.now()}`,
          role: 'assistant' as const,
          content: resp.content,
          model_id: resp.model_id,
          model_name: resp.model_name,
          tokens_input: resp.tokens_input,
          tokens_output: resp.tokens_output,
          latency_ms: resp.latency_ms,
          error: resp.error,
          created_at: new Date().toISOString(),
        }));
        
        set({
          isLoading: false,
          messages: [...messages, ...assistantMessages],
          currentResponses: {},
        });
        break;
        
      case 'error':
        console.error('WebSocket error:', data.message);
        if (data.model_id) {
          const modelId = data.model_id;
          set((state) => ({
            currentResponses: {
              ...state.currentResponses,
              [modelId]: {
                ...state.currentResponses[modelId],
                error: data.message,
                isStreaming: false,
              },
            },
          }));
        } else {
          set({ isLoading: false });
        }
        break;
    }
  },
  
  _addUserMessage: (content) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      model_id: null,
      model_name: null,
      tokens_input: null,
      tokens_output: null,
      latency_ms: null,
      error: null,
      created_at: new Date().toISOString(),
    };
    
    set((state) => ({
      messages: [...state.messages, userMessage],
    }));
  },
}));
