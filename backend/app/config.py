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
    # Add your API keys to .env file to enable models from each provider
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    xai_api_key: str = ""
    mistral_api_key: str = ""
    cohere_api_key: str = ""
    together_api_key: str = ""
    groq_api_key: str = ""
    deepseek_api_key: str = ""
    perplexity_api_key: str = ""
    
    # Available models configuration - now dynamically loaded from LiteLLM
    @property
    def enabled_models(self) -> List[dict]:
        """Return list of enabled models based on available API keys.
        
        Models are now dynamically loaded from LiteLLM's model_cost dictionary.
        This property returns featured models for backwards compatibility.
        """
        from app.services.model_registry import model_registry
        
        featured = model_registry.get_featured_models()
        return [
            {
                "id": m.id,
                "name": m.name,
                "provider": m.provider,
                "input_cost_per_million": m.input_cost_per_million,
                "output_cost_per_million": m.output_cost_per_million,
            }
            for m in featured
        ]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
