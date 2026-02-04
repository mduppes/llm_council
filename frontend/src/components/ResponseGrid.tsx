import { useChatStore } from '../stores/chatStore';
import { ModelCard } from './ModelCard';
import { User } from 'lucide-react';
import { selectBestResponse } from '../services/api';
import type { Message } from '../types';

export function ResponseGrid() {
  const { messages, currentResponses, setMessages } = useChatStore();
  
  const handleSelectBest = async (messageId: string) => {
    try {
      await selectBestResponse(messageId);
      // Update local state to reflect selection
      setMessages(messages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, is_selected: true };
        }
        // Find and unselect siblings (same parent_message_id)
        const selectedMsg = messages.find(m => m.id === messageId);
        if (selectedMsg?.parent_message_id && 
            msg.parent_message_id === selectedMsg.parent_message_id &&
            msg.id !== messageId) {
          return { ...msg, is_selected: false };
        }
        return msg;
      }));
    } catch (e) {
      console.error('Failed to select response:', e);
    }
  };
  
  // Group messages by user turns
  const turns: Array<{
    userMessage: Message;
    assistantMessages: Message[];
  }> = [];
  
  let currentTurn: typeof turns[0] | null = null;
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (currentTurn) {
        turns.push(currentTurn);
      }
      currentTurn = { userMessage: msg, assistantMessages: [] };
    } else if (msg.role === 'assistant' && currentTurn) {
      currentTurn.assistantMessages.push(msg);
    }
  }
  
  if (currentTurn) {
    turns.push(currentTurn);
  }
  
  // Check if we have streaming responses (last turn)
  const hasStreamingResponses = Object.keys(currentResponses).length > 0;
  
  if (turns.length === 0 && !hasStreamingResponses) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <div className="text-xl font-medium mb-2">Welcome to LLM Council</div>
          <div className="text-sm">
            Send a message to chat with multiple LLMs simultaneously
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {turns.map((turn, turnIndex) => (
        <div key={turn.userMessage.id} className="space-y-4">
          {/* User message */}
          <div className="flex items-start gap-3 max-w-4xl mx-auto">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 bg-slate-800 rounded-xl px-4 py-3 text-slate-200">
              {turn.userMessage.content}
            </div>
          </div>
          
          {/* Assistant responses grid */}
          {turn.assistantMessages.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {turn.assistantMessages.map((msg) => (
                <ModelCard
                  key={msg.id}
                  response={{
                    model_id: msg.model_id || '',
                    model_name: msg.model_name || '',
                    content: msg.content || '',
                    isStreaming: false,
                    tokens_input: msg.tokens_input,
                    tokens_output: msg.tokens_output,
                    latency_ms: msg.latency_ms,
                    error: msg.error,
                    message_id: msg.id,
                    is_selected: msg.is_selected,
                  }}
                  showSelect={true}
                  onSelect={handleSelectBest}
                />
              ))}
            </div>
          )}
          
          {/* Streaming responses for the last turn */}
          {turnIndex === turns.length - 1 && hasStreamingResponses && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.values(currentResponses).map((response) => (
                <ModelCard key={response.model_id} response={response} />
              ))}
            </div>
          )}
        </div>
      ))}
      
      {/* If we have streaming responses but no turns yet (first message) */}
      {turns.length === 0 && hasStreamingResponses && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.values(currentResponses).map((response) => (
            <ModelCard key={response.model_id} response={response} />
          ))}
        </div>
      )}
    </div>
  );
}
