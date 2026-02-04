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
        parent_message_id: Optional[str] = None,
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
            parent_message_id=parent_message_id,
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
        for_model_id: Optional[str] = None,
    ) -> List[dict]:
        """
        Get messages formatted for LLM context.
        Returns list of {role, content} dicts.
        
        If for_model_id is provided, uses that model's own responses where available.
        Falls back to: 1) selected/best response, 2) first successful response.
        """
        conversation = await self.get_conversation(db, conversation_id)
        if not conversation:
            return []
        
        # Group messages by user message (turn)
        context = []
        current_user_msg = None
        responses_for_turn: List[Message] = []
        
        for msg in conversation.messages:
            if msg.role == "user":
                # Process previous turn's responses before starting new turn
                if current_user_msg and responses_for_turn:
                    context.append({"role": "user", "content": current_user_msg.content})
                    best_response = self._select_best_response(responses_for_turn, for_model_id)
                    if best_response:
                        context.append({"role": "assistant", "content": best_response.content})
                
                # Start new turn
                current_user_msg = msg
                responses_for_turn = []
            elif msg.role == "assistant":
                responses_for_turn.append(msg)
        
        # Process final turn
        if current_user_msg and responses_for_turn:
            context.append({"role": "user", "content": current_user_msg.content})
            best_response = self._select_best_response(responses_for_turn, for_model_id)
            if best_response:
                context.append({"role": "assistant", "content": best_response.content})
        
        return context
    
    def _select_best_response(
        self,
        responses: List[Message],
        for_model_id: Optional[str] = None,
    ) -> Optional[Message]:
        """
        Select the best response for a turn.
        Priority:
        1. The response from for_model_id (if provided and successful)
        2. Any response marked as is_selected
        3. First successful response
        """
        successful = [r for r in responses if r.content and not r.error]
        if not successful:
            return None
        
        # Priority 1: Same model's own response
        if for_model_id:
            for r in successful:
                if r.model_id == for_model_id:
                    return r
        
        # Priority 2: User-selected best response
        for r in successful:
            if r.is_selected:
                return r
        
        # Priority 3: First successful response
        return successful[0]
    
    async def set_selected_response(
        self,
        db: AsyncSession,
        message_id: str,
    ) -> Optional[Message]:
        """
        Mark a message as the selected/best response for its turn.
        Clears is_selected from other responses to the same parent message.
        """
        # Get the message
        result = await db.execute(
            select(Message).where(Message.id == message_id)
        )
        message = result.scalar_one_or_none()
        if not message or message.role != "assistant":
            return None
        
        # Find all sibling responses (same parent_message_id)
        if message.parent_message_id:
            result = await db.execute(
                select(Message).where(
                    Message.parent_message_id == message.parent_message_id,
                    Message.role == "assistant"
                )
            )
            siblings = list(result.scalars().all())
            for sibling in siblings:
                sibling.is_selected = (sibling.id == message_id)
        else:
            # Fallback: just set this one
            message.is_selected = True
        
        await db.commit()
        await db.refresh(message)
        return message


# Singleton instance
history_service = HistoryService()
