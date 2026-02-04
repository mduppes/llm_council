// Type definitions for LLM Council

// =============================================================================
// Model Types
// =============================================================================

export interface Model {
  id: string;
  name: string;
  provider: string;
  input_cost_per_million?: number | null;
  output_cost_per_million?: number | null;
}

// =============================================================================
// Message Types
// =============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | null;
  model_id: string | null;
  model_name: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  latency_ms: number | null;
  error: string | null;
  is_selected?: boolean;
  parent_message_id?: string | null;
  created_at: string;
}

export interface UserMessage extends Message {
  role: 'user';
  content: string;
  model_id: null;
  model_name: null;
}

export interface AssistantMessage extends Message {
  role: 'assistant';
  model_id: string;
  model_name: string;
}

// =============================================================================
// Conversation Types
// =============================================================================

export interface ConversationSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Conversation extends ConversationSummary {
  messages: Message[];
}

// =============================================================================
// WebSocket Message Types
// =============================================================================

export interface WSChatRequest {
  type: 'chat';
  conversation_id: string | null;
  message: string;
  models: string[];
}

export interface WSConversationStarted {
  type: 'conversation_started';
  conversation_id: string;
}

export interface WSToken {
  type: 'token';
  model_id: string;
  token: string;
}

export interface WSModelComplete {
  type: 'model_complete';
  model_id: string;
  model_name: string;
  content: string;
  tokens_input: number | null;
  tokens_output: number | null;
  latency_ms: number | null;
  error: string | null;
}

export interface WSChatComplete {
  type: 'chat_complete';
  conversation_id: string;
  user_message_id: string;
}

export interface WSError {
  type: 'error';
  message: string;
  model_id?: string;
}

export type WSMessage = 
  | WSConversationStarted 
  | WSToken 
  | WSModelComplete 
  | WSChatComplete 
  | WSError;

// =============================================================================
// Store Types
// =============================================================================

export interface ModelResponse {
  model_id: string;
  model_name: string;
  content: string;
  isStreaming: boolean;
  tokens_input: number | null;
  tokens_output: number | null;
  latency_ms: number | null;
  error: string | null;
  message_id?: string;
  is_selected?: boolean;
}

export interface ChatState {
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
  wsConnected: boolean;
}
