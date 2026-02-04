"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    debug: bool = True
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./llm_council.db"
    
    # LLM API Keys (read from environment)
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    xai_api_key: str = ""
    
    # Available models configuration
    @property
    def enabled_models(self) -> List[dict]:
        """Return list of enabled models based on available API keys."""
        models = []
        
        if self.openai_api_key:
            models.extend([
                {"id": "openai/gpt-4o", "name": "GPT-4o", "provider": "openai"},
                {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai"},
            ])
        
        if self.anthropic_api_key:
            models.extend([
                {"id": "anthropic/claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "provider": "anthropic"},
                {"id": "anthropic/claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "provider": "anthropic"},
            ])
        
        if self.gemini_api_key:
            models.extend([
                {"id": "gemini/gemini-2.0-flash", "name": "Gemini 2.0 Flash", "provider": "google"},
                {"id": "gemini/gemini-2.0-flash-lite", "name": "Gemini 2.0 Flash Lite", "provider": "google"},
            ])
        
        if self.xai_api_key:
            models.extend([
                {"id": "xai/grok-4-1-fast-reasoning", "name": "Grok 4.1 Fast Reasoning", "provider": "xai"},
            ])
        
        return models


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
