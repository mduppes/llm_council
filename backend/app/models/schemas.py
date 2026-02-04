"""Pydantic schemas for API requests and responses."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Model Configuration
# =============================================================================

class ModelInfo(BaseModel):
    """Information about an available LLM model."""
    id: str
    name: str
    provider: str
    description: Optional[str] = None  # Tooltip describing the model
    input_cost_per_million: Optional[float] = None  # Cost per million input tokens
    output_cost_per_million: Optional[float] = None  # Cost per million output tokens
    max_tokens: Optional[int] = None  # Maximum context window
    supports_vision: bool = False  # Whether model supports images
    supports_tools: bool = False  # Whether model supports function calling
    is_featured: bool = False  # Whether this is a popular/recommended model
    has_api_key: bool = True  # Whether the API key is configured


class ProviderInfo(BaseModel):
    """Information about a model provider and its available models."""
    id: str
    name: str
    has_api_key: bool  # Whether the API key for this provider is configured
    models: List[ModelInfo]


# =============================================================================
# Chat Messages
# =============================================================================

class ChatMessage(BaseModel):
    """A single message in a chat conversation."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request to send a chat message."""
    conversation_id: Optional[str] = None  # None = new conversation
    message: str
    models: List[str] = Field(default_factory=list)  # Model IDs to query


class ModelResponse(BaseModel):
    """Response from a single model."""
    model_id: str
    model_name: str
    content: Optional[str] = None
    error: Optional[str] = None
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    latency_ms: Optional[int] = None


class ChatResponse(BaseModel):
    """Response containing results from all queried models."""
    conversation_id: str
    user_message_id: str
    responses: List[ModelResponse]


# =============================================================================
# WebSocket Messages
# =============================================================================

class WSMessage(BaseModel):
    """Base WebSocket message."""
    type: str


class WSChatRequest(BaseModel):
    """WebSocket request to start a chat."""
    type: str = "chat"
    conversation_id: Optional[str] = None
    message: str
    models: List[str]


class WSStreamToken(BaseModel):
    """Streaming token from a model."""
    type: str = "token"
    model_id: str
    token: str


class WSModelComplete(BaseModel):
    """Notification that a model has finished responding."""
    type: str = "model_complete"
    model_id: str
    model_name: str
    content: str
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    latency_ms: Optional[int] = None
    error: Optional[str] = None


class WSChatComplete(BaseModel):
    """Notification that all models have finished."""
    type: str = "chat_complete"
    conversation_id: str
    user_message_id: str


class WSError(BaseModel):
    """Error message."""
    type: str = "error"
    message: str
    model_id: Optional[str] = None


# =============================================================================
# Conversation / History
# =============================================================================

class MessageOut(BaseModel):
    """Message output schema."""
    id: str
    role: str
    content: Optional[str]
    model_id: Optional[str]
    model_name: Optional[str]
    tokens_input: Optional[int]
    tokens_output: Optional[int]
    latency_ms: Optional[int]
    error: Optional[str]
    is_selected: bool = False
    parent_message_id: Optional[str] = None
    created_at: datetime


class ConversationSummary(BaseModel):
    """Summary of a conversation for listing."""
    id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    message_count: int


class ConversationDetail(BaseModel):
    """Full conversation with all messages."""
    id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    messages: List[MessageOut]
