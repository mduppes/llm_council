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
                {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai"},
                {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai"},
            ])
        
        if self.anthropic_api_key:
            models.extend([
                {"id": "claude-3-5-sonnet-20240620", "name": "Claude 3.5 Sonnet", "provider": "anthropic"},
                {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "provider": "anthropic"},
            ])
        
        if self.gemini_api_key:
            models.extend([
                {"id": "gemini/gemini-1.5-flash", "name": "Gemini 1.5 Flash", "provider": "google"},
                {"id": "gemini/gemini-1.5-pro", "name": "Gemini 1.5 Pro", "provider": "google"},
            ])
        
        if self.xai_api_key:
            models.extend([
                {"id": "xai/grok-2", "name": "Grok 2", "provider": "xai"},
            ])
        
        return models


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
