"""History router for conversation management."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.schemas import ConversationSummary, ConversationDetail, MessageOut
from app.services.history_service import history_service

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=List[ConversationSummary])
async def list_conversations(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List all conversations, most recent first."""
    conversations = await history_service.list_conversations(db, limit, offset)
    
    return [
        ConversationSummary(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=len(conv.messages) if conv.messages else 0,
        )
        for conv in conversations
    ]


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific conversation with all messages."""
    conversation = await history_service.get_conversation(db, conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[
            MessageOut(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                model_id=msg.model_id,
                model_name=msg.model_name,
                tokens_input=msg.tokens_input,
                tokens_output=msg.tokens_output,
                latency_ms=msg.latency_ms,
                error=msg.error,
                created_at=msg.created_at,
            )
            for msg in conversation.messages
        ],
    )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation and all its messages."""
    deleted = await history_service.delete_conversation(db, conversation_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"status": "deleted", "conversation_id": conversation_id}


@router.patch("/{conversation_id}/title")
async def update_title(
    conversation_id: str,
    title: str,
    db: AsyncSession = Depends(get_db),
):
    """Update conversation title."""
    conversation = await history_service.update_conversation_title(
        db, conversation_id, title
    )
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"status": "updated", "title": conversation.title}
