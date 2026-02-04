"""LLM Service using LiteLLM for unified API access."""

import asyncio
import time
from typing import AsyncGenerator, List, Optional, Dict, Any

import litellm
from litellm import acompletion

from app.config import get_settings

settings = get_settings()

# Configure LiteLLM
litellm.set_verbose = settings.debug


class LLMService:
    """Service for making LLM API calls via LiteLLM."""
    
    def __init__(self):
        self.settings = get_settings()
    
    def get_available_models(self) -> List[dict]:
        """Get list of available models based on configured API keys."""
        return self.settings.enabled_models
    
    async def complete(
        self,
        model_id: str,
        messages: List[dict],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> dict:
        """
        Make a completion request to a single model.
        
        Returns dict with response content and metadata.
        """
        start_time = time.time()
        
        try:
            response = await acompletion(
                model=model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            return {
                "model_id": model_id,
                "content": response.choices[0].message.content,
                "tokens_input": response.usage.prompt_tokens if response.usage else None,
                "tokens_output": response.usage.completion_tokens if response.usage else None,
                "latency_ms": latency_ms,
                "error": None,
            }
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "model_id": model_id,
                "content": None,
                "tokens_input": None,
                "tokens_output": None,
                "latency_ms": latency_ms,
                "error": str(e),
            }
    
    async def complete_parallel(
        self,
        model_ids: List[str],
        messages: List[dict],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> List[dict]:
        """
        Make parallel completion requests to multiple models.
        
        Returns list of response dicts from all models.
        """
        tasks = [
            self.complete(model_id, messages, temperature, max_tokens)
            for model_id in model_ids
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions that weren't caught
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "model_id": model_ids[i],
                    "content": None,
                    "tokens_input": None,
                    "tokens_output": None,
                    "latency_ms": None,
                    "error": str(result),
                })
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def stream_complete(
        self,
        model_id: str,
        messages: List[dict],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Stream completion from a single model.
        
        Yields dicts with either token chunks or final metadata.
        """
        start_time = time.time()
        full_content = ""
        tokens_input = None
        tokens_output = None
        
        try:
            response = await acompletion(
                model=model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            
            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    full_content += token
                    yield {
                        "type": "token",
                        "model_id": model_id,
                        "token": token,
                    }
                
                # Try to get usage from final chunk
                if hasattr(chunk, 'usage') and chunk.usage:
                    tokens_input = chunk.usage.prompt_tokens
                    tokens_output = chunk.usage.completion_tokens
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            yield {
                "type": "complete",
                "model_id": model_id,
                "content": full_content,
                "tokens_input": tokens_input,
                "tokens_output": tokens_output,
                "latency_ms": latency_ms,
                "error": None,
            }
            
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            yield {
                "type": "complete",
                "model_id": model_id,
                "content": full_content if full_content else None,
                "tokens_input": None,
                "tokens_output": None,
                "latency_ms": latency_ms,
                "error": str(e),
            }


# Singleton instance
llm_service = LLMService()
