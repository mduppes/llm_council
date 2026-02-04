"""History service for conversation persistence."""

from typing import List, Optional
from datetime import datetime

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Conversation, Message


class HistoryService:
    """Service for managing conversation history in the database."""
    
    async def create_conversation(
        self,
        db: AsyncSession,
        title: Optional[str] = None,
    ) -> Conversation:
        """Create a new conversation."""
        conversation = Conversation(title=title)
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        return conversation
    
    async def get_conversation(
        self,
        db: AsyncSession,
        conversation_id: str,
    ) -> Optional[Conversation]:
        """Get a conversation by ID with all messages."""
        result = await db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()
    
    async def list_conversations(
        self,
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Conversation]:
        """List conversations ordered by most recent."""
        result = await db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .order_by(desc(Conversation.updated_at))
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())
    
    async def delete_conversation(
        self,
        db: AsyncSession,
        conversation_id: str,
    ) -> bool:
        """Delete a conversation and all its messages."""
        conversation = await self.get_conversation(db, conversation_id)
        if not conversation:
            return False
        
        await db.delete(conversation)
        await db.commit()
        return True
    
    async def update_conversation_title(
        self,
        db: AsyncSession,
        conversation_id: str,
        title: str,
    ) -> Optional[Conversation]:
        """Update conversation title."""
        conversation = await self.get_conversation(db, conversation_id)
        if not conversation:
            return None
        
        conversation.title = title
        conversation.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(conversation)
        return conversation
    
    async def add_user_message(
        self,
        db: AsyncSession,
        conversation_id: str,
        content: str,
    ) -> Message:
        """Add a user message to a conversation."""
        message = Message(
            conversation_id=conversation_id,
            role="user",
            content=content,
        )
        db.add(message)
        
        # Update conversation timestamp
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if conversation:
            conversation.updated_at = datetime.utcnow()
            
            # Auto-generate title from first message if not set
            if not conversation.title:
                # Use first 50 chars of message as title
                conversation.title = content[:50] + ("..." if len(content) > 50 else "")
        
        await db.commit()
        await db.refresh(message)
        return message
    
    async def add_assistant_message(
        self,
        db: AsyncSession,
        conversation_id: str,
        model_id: str,
        model_name: str,
        content: Optional[str],
        tokens_input: Optional[int] = None,
        tokens_output: Optional[int] = None,
        latency_ms: Optional[int] = None,
        error: Optional[str] = None,
    ) -> Message:
        """Add an assistant (model) response to a conversation."""
        message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=content,
            model_id=model_id,
            model_name=model_name,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            latency_ms=latency_ms,
            error=error,
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message
    
    async def get_conversation_messages(
        self,
        db: AsyncSession,
        conversation_id: str,
    ) -> List[dict]:
        """
        Get messages formatted for LLM context.
        Returns list of {role, content} dicts.
        Only includes user messages and successful assistant responses.
        """
        conversation = await self.get_conversation(db, conversation_id)
        if not conversation:
            return []
        
        # Build context: for each user message, include one assistant response
        # (typically we'd pick the best or first successful one)
        context = []
        for msg in conversation.messages:
            if msg.role == "user":
                context.append({"role": "user", "content": msg.content})
            elif msg.role == "assistant" and msg.content and not msg.error:
                # Only include one assistant response per user message
                # In practice, you might want to select the "best" or let user choose
                if context and context[-1]["role"] == "user":
                    context.append({"role": "assistant", "content": msg.content})
        
        return context


# Singleton instance
history_service = HistoryService()
