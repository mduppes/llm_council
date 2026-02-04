"""Chat router with WebSocket endpoint for streaming responses."""

import asyncio
import json
from typing import List, Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db, async_session_maker
from app.models.schemas import ModelInfo
from app.services.llm_service import llm_service
from app.services.history_service import history_service
from app.config import get_settings

router = APIRouter(prefix="/chat", tags=["chat"])
settings = get_settings()


@router.get("/models", response_model=List[ModelInfo])
async def get_available_models():
    """Get list of available models based on configured API keys."""
    models = llm_service.get_available_models()
    return [ModelInfo(**m) for m in models]


def get_model_name(model_id: str) -> str:
    """Get display name for a model ID."""
    for model in settings.enabled_models:
        if model["id"] == model_id:
            return model["name"]
    return model_id


@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket endpoint for streaming chat with multiple models.
    
    Client sends:
    {
        "type": "chat",
        "conversation_id": "optional-uuid",  // null for new conversation
        "message": "user message",
        "models": ["gpt-4o", "claude-3-5-sonnet-20240620"]
    }
    
    Server sends:
    - {"type": "conversation_started", "conversation_id": "uuid"}
    - {"type": "token", "model_id": "gpt-4o", "token": "Hello"}
    - {"type": "model_complete", "model_id": "gpt-4o", "content": "...", ...}
    - {"type": "chat_complete", "conversation_id": "uuid"}
    - {"type": "error", "message": "...", "model_id": "optional"}
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                request = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON"
                })
                continue
            
            if request.get("type") != "chat":
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {request.get('type')}"
                })
                continue
            
            # Extract request data
            message = request.get("message", "").strip()
            model_ids = request.get("models", [])
            conversation_id = request.get("conversation_id")
            
            if not message:
                await websocket.send_json({
                    "type": "error",
                    "message": "Message cannot be empty"
                })
                continue
            
            if not model_ids:
                # Default to all available models
                model_ids = [m["id"] for m in llm_service.get_available_models()]
            
            if not model_ids:
                await websocket.send_json({
                    "type": "error",
                    "message": "No models available. Check API key configuration."
                })
                continue
            
            # Process chat with database session
            async with async_session_maker() as db:
                await process_chat(
                    websocket=websocket,
                    db=db,
                    conversation_id=conversation_id,
                    message=message,
                    model_ids=model_ids,
                )
    
    except WebSocketDisconnect:
        pass  # Client disconnected, clean exit
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass  # Connection already closed


async def process_chat(
    websocket: WebSocket,
    db: AsyncSession,
    conversation_id: str | None,
    message: str,
    model_ids: List[str],
):
    """Process a chat request: save to DB, stream responses, save results."""
    
    # Create or get conversation
    if conversation_id:
        conversation = await history_service.get_conversation(db, conversation_id)
        if not conversation:
            # Create new if ID doesn't exist
            conversation = await history_service.create_conversation(db)
    else:
        conversation = await history_service.create_conversation(db)
    
    # Notify client of conversation ID
    await websocket.send_json({
        "type": "conversation_started",
        "conversation_id": conversation.id,
    })
    
    # Save user message
    user_message = await history_service.add_user_message(
        db, conversation.id, message
    )
    
    # Build message context for LLM
    # Get previous messages for context
    previous_messages = await history_service.get_conversation_messages(
        db, conversation.id
    )
    
    # Add current message
    messages = previous_messages + [{"role": "user", "content": message}]
    
    # Stream responses from all models in parallel
    async def stream_model(model_id: str):
        """Stream responses from a single model and save to DB."""
        model_name = get_model_name(model_id)
        
        full_content = ""
        final_result = None
        
        try:
            async for chunk in llm_service.stream_complete(model_id, messages):
                if chunk["type"] == "token":
                    full_content += chunk["token"]
                    await websocket.send_json({
                        "type": "token",
                        "model_id": model_id,
                        "token": chunk["token"],
                    })
                elif chunk["type"] == "complete":
                    final_result = chunk
        except Exception as e:
            final_result = {
                "model_id": model_id,
                "content": full_content if full_content else None,
                "tokens_input": None,
                "tokens_output": None,
                "latency_ms": None,
                "error": str(e),
            }
        
        # Save assistant response to DB
        if final_result:
            await history_service.add_assistant_message(
                db=db,
                conversation_id=conversation.id,
                model_id=model_id,
                model_name=model_name,
                content=final_result.get("content"),
                tokens_input=final_result.get("tokens_input"),
                tokens_output=final_result.get("tokens_output"),
                latency_ms=final_result.get("latency_ms"),
                error=final_result.get("error"),
            )
            
            # Notify client that model is complete
            await websocket.send_json({
                "type": "model_complete",
                "model_id": model_id,
                "model_name": model_name,
                "content": final_result.get("content", ""),
                "tokens_input": final_result.get("tokens_input"),
                "tokens_output": final_result.get("tokens_output"),
                "latency_ms": final_result.get("latency_ms"),
                "error": final_result.get("error"),
            })
    
    # Run all model streams in parallel
    tasks = [stream_model(model_id) for model_id in model_ids]
    await asyncio.gather(*tasks, return_exceptions=True)
    
    # Notify client that all models are complete
    await websocket.send_json({
        "type": "chat_complete",
        "conversation_id": conversation.id,
        "user_message_id": user_message.id,
    })
