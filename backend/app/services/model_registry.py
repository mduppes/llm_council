"""Model registry service for dynamic model discovery from LiteLLM."""

from typing import Dict, List, Optional
from dataclasses import dataclass, field
from functools import lru_cache
import re

from litellm import model_cost

from app.config import get_settings


@dataclass
class ModelInfo:
    """Information about a single model."""
    id: str
    name: str
    provider: str
    description: str = ""
    input_cost_per_million: Optional[float] = None
    output_cost_per_million: Optional[float] = None
    max_tokens: Optional[int] = None
    supports_vision: bool = False
    supports_tools: bool = False
    supports_streaming: bool = True
    is_featured: bool = False
    has_api_key: bool = False
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "provider": self.provider,
            "description": self.description,
            "input_cost_per_million": self.input_cost_per_million,
            "output_cost_per_million": self.output_cost_per_million,
            "max_tokens": self.max_tokens,
            "supports_vision": self.supports_vision,
            "supports_tools": self.supports_tools,
            "supports_streaming": self.supports_streaming,
            "is_featured": self.is_featured,
            "has_api_key": self.has_api_key,
        }


@dataclass
class ProviderInfo:
    """Information about a provider and its models."""
    id: str
    name: str
    has_api_key: bool = False
    models: List[ModelInfo] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "has_api_key": self.has_api_key,
            "models": [m.to_dict() for m in self.models],
        }


# Provider display names and required env vars
PROVIDER_CONFIG = {
    "openai": {
        "name": "OpenAI",
        "env_var": "openai_api_key",
        "description": "GPT-4, GPT-4o, and other OpenAI models",
    },
    "anthropic": {
        "name": "Anthropic",
        "env_var": "anthropic_api_key",
        "description": "Claude 3.5, Claude 4 series models",
    },
    "gemini": {
        "name": "Google Gemini",
        "env_var": "gemini_api_key",
        "description": "Gemini 1.5, 2.0 Flash and Pro models",
    },
    "vertex_ai-language-models": {
        "name": "Google Vertex AI",
        "env_var": "gemini_api_key",  # Can use same key
        "description": "Google Cloud Vertex AI models",
    },
    "xai": {
        "name": "xAI",
        "env_var": "xai_api_key",
        "description": "Grok series models",
    },
    "mistral": {
        "name": "Mistral AI",
        "env_var": "mistral_api_key",
        "description": "Mistral and Mixtral models",
    },
    "cohere": {
        "name": "Cohere",
        "env_var": "cohere_api_key",
        "description": "Command series models",
    },
    "together_ai": {
        "name": "Together AI",
        "env_var": "together_api_key",
        "description": "Open source models hosted on Together",
    },
    "groq": {
        "name": "Groq",
        "env_var": "groq_api_key",
        "description": "Fast inference for Llama and Mixtral",
    },
    "deepseek": {
        "name": "DeepSeek",
        "env_var": "deepseek_api_key",
        "description": "DeepSeek Coder and Chat models",
    },
    "perplexity": {
        "name": "Perplexity",
        "env_var": "perplexity_api_key",
        "description": "Perplexity online models with search",
    },
    "openrouter": {
        "name": "OpenRouter",
        "env_var": "openrouter_api_key",
        "description": "Unified access to OpenAI, Anthropic, Meta, and 100+ models",
    },
    "fireworks_ai": {
        "name": "Fireworks AI",
        "env_var": "fireworks_api_key",
        "description": "Fast inference for Llama, Mixtral, and other open models",
    },
    "bedrock": {
        "name": "Amazon Bedrock",
        "env_var": "aws_access_key_id",
        "description": "AWS-hosted Claude, Llama, and Titan models",
    },
    "azure": {
        "name": "Azure OpenAI",
        "env_var": "azure_api_key",
        "description": "Microsoft Azure-hosted OpenAI models",
    },
}

def _extract_model_sort_key(model_id: str) -> tuple:
    """
    Extract sorting key for models - prioritizes by:
    1. Date suffix (newer first) - e.g., 20250514 > 20241022
    2. Version number (higher first) - e.g., 4 > 3.5 > 3
    3. Name alphabetically
    """
    import re
    
    base_name = model_id.split("/")[-1] if "/" in model_id else model_id
    
    # Extract date suffix (YYYYMMDD format)
    date_match = re.search(r'(\d{8})$', base_name)
    date_val = int(date_match.group(1)) if date_match else 0
    
    # Extract version numbers
    # Handle patterns like: gpt-4, claude-3-5, gemini-2.0, o1, o3
    version_patterns = [
        r'[- ](\d+)[- .](\d+)',  # e.g., 3-5, 2.0
        r'[- ](\d+)(?:[- ]|$)',   # e.g., -4, -3
        r'^o(\d+)',               # e.g., o1, o3
        r'(\d+)$',                # trailing number
    ]
    
    major_version = 0
    minor_version = 0
    
    for pattern in version_patterns:
        match = re.search(pattern, base_name.lower())
        if match:
            major_version = int(match.group(1))
            if len(match.groups()) > 1 and match.group(2):
                minor_version = int(match.group(2))
            break
    
    # Return tuple for sorting: higher date first, higher version first, then alpha
    return (-date_val, -major_version, -minor_version, base_name.lower())

# Model descriptions (for popular models)
MODEL_DESCRIPTIONS = {
    "gpt-4o": "Most capable GPT-4 model with vision. Great for complex tasks.",
    "gpt-4o-mini": "Fast and affordable GPT-4 variant for simpler tasks.",
    "gpt-4-turbo": "GPT-4 Turbo with 128K context window.",
    "gpt-4": "Original GPT-4 model, very capable but slower.",
    "o1": "OpenAI's reasoning model for complex problem solving.",
    "o1-mini": "Faster, more affordable reasoning model.",
    "o1-preview": "Preview version of o1 reasoning model.",
    "o3-mini": "Latest compact reasoning model.",
    "claude-sonnet-4-20250514": "Latest Claude Sonnet 4 - balanced performance and speed.",
    "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet - excellent for coding and analysis.",
    "claude-3-5-haiku-20241022": "Claude 3.5 Haiku - fast and affordable.",
    "claude-3-opus-20240229": "Most capable Claude 3, best for complex tasks.",
    "gemini/gemini-2.0-flash": "Latest Gemini Flash - fast multimodal model.",
    "gemini/gemini-2.0-flash-lite": "Lighter Gemini 2.0 for cost-effective tasks.",
    "gemini/gemini-1.5-pro": "Gemini 1.5 Pro with 1M+ context window.",
    "gemini/gemini-1.5-flash": "Fast Gemini 1.5 variant.",
    "xai/grok-2": "xAI's Grok 2 - capable general model.",
    "xai/grok-2-vision": "Grok 2 with vision capabilities.",
    "xai/grok-3": "Latest Grok 3 model.",
    "mistral/mistral-large-latest": "Mistral's most capable model.",
    "groq/llama-3.3-70b-versatile": "Llama 3.3 70B on Groq's fast inference.",
    "deepseek/deepseek-chat": "DeepSeek's chat model.",
    "deepseek/deepseek-reasoner": "DeepSeek's reasoning model.",
    "perplexity/sonar-pro": "Perplexity's flagship with web search.",
}


def _generate_model_name(model_id: str) -> str:
    """Generate a human-readable name from model ID."""
    # Remove provider prefix if present
    name = model_id.split("/")[-1] if "/" in model_id else model_id
    
    # Clean up common patterns
    name = re.sub(r'-\d{8}$', '', name)  # Remove date suffixes like -20241022
    name = re.sub(r'[-_]', ' ', name)
    name = name.title()
    
    # Fix common capitalizations
    replacements = {
        'Gpt': 'GPT',
        'Gpt 4': 'GPT-4',
        'Gpt 3': 'GPT-3',
        'Gpt 4o': 'GPT-4o',
        'Gpt 4 ': 'GPT-4 ',
        'Claude ': 'Claude ',
        'Gemini': 'Gemini',
        'Llama': 'Llama',
        'Mistral': 'Mistral',
        'Mixtral': 'Mixtral',
        'Grok': 'Grok',
        ' Mini': ' Mini',
        ' Pro': ' Pro',
        ' Ultra': ' Ultra',
        ' Flash': ' Flash',
        ' Haiku': ' Haiku',
        ' Sonnet': ' Sonnet',
        ' Opus': ' Opus',
    }
    for old, new in replacements.items():
        name = name.replace(old, new)
    
    return name


class ModelRegistry:
    """Registry for discovering and organizing models from LiteLLM."""
    
    def __init__(self):
        self.settings = get_settings()
        self._models_cache: Optional[Dict[str, ProviderInfo]] = None
    
    def _has_api_key(self, provider: str) -> bool:
        """Check if we have an API key for the given provider."""
        config = PROVIDER_CONFIG.get(provider, {})
        env_var = config.get("env_var", "")
        if not env_var:
            return False
        return bool(getattr(self.settings, env_var, ""))
    
    def _get_provider_name(self, provider: str) -> str:
        """Get display name for a provider."""
        return PROVIDER_CONFIG.get(provider, {}).get("name", provider.title())
    
    def get_all_models(self, include_unavailable: bool = True) -> Dict[str, ProviderInfo]:
        """
        Get all models organized by provider.
        
        Args:
            include_unavailable: If True, includes models without API keys
        """
        providers: Dict[str, ProviderInfo] = {}
        
        for model_id, info in model_cost.items():
            if not isinstance(info, dict):
                continue
            
            # Only include chat models
            mode = info.get("mode", "")
            if mode != "chat":
                continue
            
            provider_id = info.get("litellm_provider", "unknown")
            
            # Skip providers we don't support or configure
            if provider_id not in PROVIDER_CONFIG:
                continue
            
            has_key = self._has_api_key(provider_id)
            
            # Skip unavailable if not requested
            if not include_unavailable and not has_key:
                continue
            
            # Create provider if not exists
            if provider_id not in providers:
                providers[provider_id] = ProviderInfo(
                    id=provider_id,
                    name=self._get_provider_name(provider_id),
                    has_api_key=has_key,
                )
            
            # Calculate costs
            input_cost = info.get("input_cost_per_token", 0) * 1_000_000
            output_cost = info.get("output_cost_per_token", 0) * 1_000_000
            
            # Get description
            description = MODEL_DESCRIPTIONS.get(model_id, "")
            if not description:
                # Check without provider prefix
                base_name = model_id.split("/")[-1] if "/" in model_id else model_id
                description = MODEL_DESCRIPTIONS.get(base_name, "")
            
            model = ModelInfo(
                id=model_id,
                name=_generate_model_name(model_id),
                provider=provider_id,
                description=description,
                input_cost_per_million=round(input_cost, 4) if input_cost else None,
                output_cost_per_million=round(output_cost, 4) if output_cost else None,
                max_tokens=info.get("max_output_tokens") or info.get("max_tokens"),
                supports_vision=info.get("supports_vision", False),
                supports_tools=info.get("supports_function_calling", False),
                supports_streaming=True,  # Most models support streaming
                is_featured=False,  # No longer used, sorting by date/version instead
                has_api_key=has_key,
            )
            
            providers[provider_id].models.append(model)
        
        # Sort models within each provider (newest first based on date/version)
        for provider in providers.values():
            provider.models.sort(key=lambda m: _extract_model_sort_key(m.id))
        
        return providers
    
    def get_available_models(self) -> List[ModelInfo]:
        """Get flat list of models that have API keys configured."""
        providers = self.get_all_models(include_unavailable=False)
        models = []
        for provider in providers.values():
            models.extend(provider.models)
        return models
    
    def get_featured_models(self) -> List[ModelInfo]:
        """Get newest/top models that have API keys configured (first 3 per provider)."""
        providers = self.get_all_models(include_unavailable=False)
        featured = []
        for provider in providers.values():
            # Take first 3 models from each provider (already sorted by newest)
            featured.extend(provider.models[:3])
        return featured


# Singleton instance
model_registry = ModelRegistry()
