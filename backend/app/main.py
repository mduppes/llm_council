"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.database import init_db
from app.routers import chat, history

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - startup and shutdown."""
    # Startup
    print("🚀 Starting LLM Council backend...")
    await init_db()
    print("✅ Database initialized")
    
    # Log available models
    models = settings.enabled_models
    if models:
        print(f"✅ Available models: {[m['name'] for m in models]}")
    else:
        print("⚠️  No models available - check API key configuration")
    
    yield
    
    # Shutdown
    print("👋 Shutting down LLM Council backend...")


app = FastAPI(
    title="LLM Council",
    description="Chat with multiple LLMs simultaneously",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(history.router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "llm-council",
        "models_available": len(settings.enabled_models),
    }


@app.get("/health")
async def health():
    """Health check for load balancers."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=settings.debug,
    )
