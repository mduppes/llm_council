# LLM Council - Project Plan

A webapp for chatting with multiple LLMs simultaneously, displaying responses side-by-side.

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [API Keys Setup](#api-keys-setup)
5. [Project Structure](#project-structure)
6. [Development Phases](#development-phases)
7. [Key Considerations & Tradeoffs](#key-considerations--tradeoffs)
8. [Deployment Options](#deployment-options)
9. [Cost Analysis](#cost-analysis)
10. [Future Enhancements](#future-enhancements)

---

## Overview

### Goals
- Chat with multiple LLMs (GPT-4o, Claude, Gemini, Grok, etc.) from a single UI
- Display all model responses side-by-side for easy comparison
- Persist chat history for later retrieval
- Run locally on Mac for development, deploy to cloud for production

### Core Features
- **Multi-model chat**: Send one prompt → get responses from all selected models
- **Model selector**: Choose which LLMs to query (checkboxes/toggles)
- **Chat history**: Sidebar showing past conversations, click to reload
- **Streaming responses**: Real-time token display (optional but nice UX)
- **Persistence**: Save conversations to disk/DB for retrieval across sessions

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            FRONTEND                                  │
│                   (Vite + React + TailwindCSS)                       │
│  ┌──────────────┐  ┌────────────────────────────────────────────┐   │
│  │   History    │  │              Chat Area                      │   │
│  │   Sidebar    │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │              │  │  │  GPT-4  │ │ Claude  │ │ Gemini  │ ...   │   │
│  │  - Chat 1    │  │  │ Response│ │ Response│ │ Response│       │   │
│  │  - Chat 2    │  │  └─────────┘ └─────────┘ └─────────┘       │   │
│  │  - Chat 3    │  │                                             │   │
│  └──────────────┘  │  ┌─────────────────────────────────────┐   │   │
│                    │  │         Text Input + Send            │   │   │
│                    │  └─────────────────────────────────────┘   │   │
│                    └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DOCKER CONTAINER                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Backend (FastAPI)                          │  │
│  │  - GET  /history        → list all conversations               │  │
│  │  - GET  /history/{id}   → get specific conversation            │  │
│  │  - DELETE /history/{id} → delete conversation                  │  │
│  │  - WebSocket /ws/chat   → streaming + auto-save to DB          │  │
│  │    (saves user message + all model responses automatically)    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│                                    ▼                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      LiteLLM Library                           │  │
│  │  - Unified API for all providers                               │  │
│  │  - Handles auth, retries, error normalization                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Storage (SQLite/Postgres)                   │  │
│  │  - conversations table                                         │  │
│  │  - messages table                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
            ┌───────────┬───────────┬───────────┬───────────┐
            │  OpenAI   │ Anthropic │  Google   │    xAI    │
            │   API     │    API    │   API     │    API    │
            └───────────┴───────────┴───────────┴───────────┘
```

### Two Architecture Options

#### Option A: LiteLLM as Library (Recommended for this project)
```
Frontend → FastAPI Backend → LiteLLM (library) → Provider APIs
```
- **Pros**: Simpler, one container, less moving parts
- **Cons**: Less separation of concerns
- **Best for**: Single-user/small team, local dev, simpler deployment

#### Option B: LiteLLM as Proxy (Separate Service)
```
Frontend → FastAPI Backend → LiteLLM Proxy (separate container) → Provider APIs
```
- **Pros**: Separate scaling, built-in admin UI, virtual keys, spend tracking
- **Cons**: More complexity, two containers, more config
- **Best for**: Multi-user, production, enterprise features

**Recommendation**: Start with Option A, migrate to Option B if you need advanced features.

---

## Technology Stack

### Frontend
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Build Tool | **Vite** | Fast HMR, modern, great React support |
| Framework | **React 18** | Component-based, huge ecosystem |
| Styling | **TailwindCSS** | Rapid UI development, utility-first |
| State | **Zustand** | Lightweight, simple API |
| HTTP Client | **fetch** | Standard, no extra deps |
| Streaming | **WebSocket** | Bidirectional, real-time token streaming |

### Backend
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | **FastAPI** | Async-native, auto OpenAPI docs, type hints |
| LLM Gateway | **LiteLLM** (library) | Unified API, 100+ providers, parallel calls |
| Database | **SQLite** | Simple file-based, zero config, good for single-user |
| ORM | **SQLAlchemy** (async) | FastAPI integration, easy Postgres migration later |
| Migrations | **Alembic** | Standard for SQLAlchemy |

### Infrastructure
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Containerization | **Docker** + **Docker Compose** | Consistent environments |
| Local Dev | **Docker Desktop for Mac** | Easy setup, ARM support |
| Cloud (Simple) | **Render** / **Fly.io** | One-click deploy, free tiers |
| Cloud (AWS) | **ECS Fargate** | Serverless containers, scales to zero |
| Secrets | **Env vars** (dev) / **AWS Secrets Manager** (prod) | Secure key management |

---

## API Keys Setup

LiteLLM reads API keys from environment variables. You'll need to obtain keys from each provider and add them to your `.env` file.

### Required API Keys

| Provider | Env Variable | Get Key From | Models |
|----------|--------------|--------------|--------|
| **OpenAI** | `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini` |
| **Anthropic** | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) | `claude-3-5-sonnet-20240620`, `claude-3-opus-20240229` |
| **Google** | `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `gemini/gemini-1.5-flash`, `gemini/gemini-1.5-pro` |
| **xAI** | `XAI_API_KEY` | [console.x.ai](https://console.x.ai/) | `xai/grok-2`, `xai/grok-2-vision` |

### .env File Template

Create a `.env` file in the project root (never commit this file!):

```bash
# .env - API Keys for LLM providers
# Get these from each provider's console

# OpenAI - https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx

# Anthropic - https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxx

# Google Gemini - https://aistudio.google.com/apikey
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx

# xAI (Grok) - https://console.x.ai/
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxx

# Optional: Additional providers
# COHERE_API_KEY=
# MISTRAL_API_KEY=
# TOGETHER_API_KEY=
# GROQ_API_KEY=
```

### Model Name Reference

LiteLLM uses specific model name formats. Here are the ones we'll use:

```python
# In your code / config
MODELS = [
    "gpt-4o",                        # OpenAI GPT-4o
    "gpt-4o-mini",                   # OpenAI GPT-4o Mini (cheaper)
    "claude-3-5-sonnet-20240620",    # Anthropic Claude 3.5 Sonnet
    "claude-3-opus-20240229",        # Anthropic Claude 3 Opus
    "gemini/gemini-1.5-flash",       # Google Gemini 1.5 Flash (fast/cheap)
    "gemini/gemini-1.5-pro",         # Google Gemini 1.5 Pro
    "xai/grok-2",                    # xAI Grok 2
]
```

### Verifying Keys Work

You can test your keys with a quick Python script:

```python
# test_keys.py
import os
from dotenv import load_dotenv
from litellm import completion

load_dotenv()  # Load .env file

models = ["gpt-4o-mini", "claude-3-5-sonnet-20240620", "gemini/gemini-1.5-flash"]

for model in models:
    try:
        response = completion(
            model=model,
            messages=[{"role": "user", "content": "Say 'hello' and nothing else"}],
            max_tokens=10
        )
        print(f"✅ {model}: {response.choices[0].message.content}")
    except Exception as e:
        print(f"❌ {model}: {e}")
```

### Security Notes

1. **Never commit `.env`** — Add it to `.gitignore`
2. **Use `.env.example`** — Template with placeholder values for documentation
3. **Docker** — Pass keys via `-e` flags or `env_file` in docker-compose
4. **Production** — Use AWS Secrets Manager, HashiCorp Vault, or similar

---

## Project Structure

```
llm_council/
├── README.md
├── PLAN.md
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production config
├── .env.example                # Template for env vars
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pyproject.toml          # Optional: modern Python packaging
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app entry
│   │   ├── config.py           # Settings/env vars
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── conversation.py # Pydantic models
│   │   │   └── message.py
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── database.py     # DB connection
│   │   │   └── models.py       # SQLAlchemy models
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py         # /chat endpoints
│   │   │   └── history.py      # /history endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── llm_service.py  # LiteLLM wrapper
│   │   │   └── history_service.py
│   │   └── utils/
│   │       └── __init__.py
│   └── tests/
│       └── ...
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css           # Tailwind imports
│       ├── components/
│       │   ├── ChatInput.tsx
│       │   ├── HistorySidebar.tsx
│       │   ├── ModelCard.tsx
│       │   ├── ModelSelector.tsx
│       │   └── ResponseGrid.tsx
│       ├── hooks/
│       │   ├── useChat.ts
│       │   └── useHistory.ts
│       ├── services/
│       │   └── api.ts
│       ├── stores/
│       │   └── chatStore.ts    # Zustand store
│       └── types/
│           └── index.ts
│
└── infra/                      # Optional: IaC
    ├── terraform/              # AWS ECS deployment
    └── k8s/                    # Kubernetes manifests
```

---

## Development Phases

### Phase 1: Backend Foundation (1-2 days)
- [ ] Set up FastAPI project structure
- [ ] Configure LiteLLM with 2-3 models (GPT-4o, Claude, Gemini)
- [ ] Implement `/chat` endpoint with parallel async calls
- [ ] Add basic error handling and response normalization
- [ ] Dockerize backend
- [ ] Test with curl/Postman

### Phase 2: Frontend Foundation (1-2 days)
- [ ] Set up Vite + React + TypeScript + TailwindCSS
- [ ] Build basic layout (sidebar + main area)
- [ ] Create chat input component
- [ ] Create model response cards (side-by-side grid)
- [ ] Connect to backend `/chat` endpoint
- [ ] Add loading states

### Phase 3: History & Persistence (1-2 days)
- [ ] Set up SQLite database with async SQLAlchemy
- [ ] Create conversation/message DB models
- [ ] Implement GET `/history` and GET `/history/{id}` endpoints
- [ ] Auto-save in WebSocket handler (no separate POST endpoint)
- [ ] Build history sidebar component
- [ ] Add conversation loading/switching

### Phase 4: Model Selection & Polish (1 day)
- [ ] Add model selector UI (checkboxes/toggles)
- [ ] Make model list configurable from backend
- [ ] Add metadata display (tokens, latency)
- [ ] Improve error handling/display
- [ ] Add conversation titles (auto-generate or edit)

### Phase 5: Docker Compose & Local Dev (0.5 days)
- [ ] Create docker-compose.yml for full stack
- [ ] Add hot-reload for development
- [ ] Document local setup in README

### Phase 6: WebSocket Streaming (1-2 days)
- [ ] Implement WebSocket `/ws/chat` endpoint with LiteLLM streaming
- [ ] Stream tokens from multiple models in parallel
- [ ] Add streaming response display in frontend
- [ ] Handle partial responses from multiple models simultaneously

### Phase 7: Production Deployment (1-2 days)
- [ ] Switch to PostgreSQL for production
- [ ] Set up cloud deployment (Render/Fly.io or AWS ECS)
- [ ] Configure secrets management
- [ ] Add basic auth (optional)
- [ ] Set up monitoring/logging

---

## Key Considerations & Tradeoffs

### 1. Flask vs FastAPI

| Aspect | Flask | FastAPI |
|--------|-------|---------|
| **Async Support** | Needs extensions (Quart) | Native async/await |
| **Performance** | Good | Better (Starlette/uvicorn) |
| **Type Hints** | Optional | Built-in, auto-validates |
| **API Docs** | Manual (Swagger ext) | Auto-generated OpenAPI |
| **Learning Curve** | Lower | Slightly higher |
| **Parallel LLM Calls** | More complex | Natural with async |

**Recommendation: FastAPI** — Native async is critical for parallel LLM calls. Your example code already uses `async`, so FastAPI is the natural fit.

---

### 2. LiteLLM: Library vs Proxy

| Aspect | Library (import litellm) | Proxy (separate service) |
|--------|--------------------------|--------------------------|
| **Complexity** | Lower | Higher |
| **Containers** | 1 | 2+ |
| **Admin UI** | None | Built-in dashboard |
| **Virtual Keys** | Manual | Built-in |
| **Spend Tracking** | Manual | Built-in |
| **Scaling** | Coupled with backend | Independent |
| **Best For** | Single user, dev | Multi-user, enterprise |

**Recommendation: Start with Library** — Simpler for MVP. Migrate to Proxy later if you need:
- Multiple users with separate API budgets
- Built-in spend tracking dashboard
- Rate limiting per user

---

### 3. Database: SQLite vs PostgreSQL

| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| **Setup** | Zero (file-based) | Requires server |
| **Concurrency** | Limited writes | Excellent |
| **Deployment** | Easy (file) | Need managed service |
| **Features** | Basic | Full (JSONB, etc.) |
| **Cost** | Free | Free tier available |

**Recommendation: SQLite for dev, PostgreSQL for prod**
- Use SQLAlchemy for ORM → switching is trivial
- Docker Compose can run Postgres locally for testing

---

### 4. File Storage vs Database for History

| Aspect | JSON Files | Database |
|--------|------------|----------|
| **Simplicity** | Very simple | More setup |
| **Querying** | Manual parsing | SQL queries |
| **Scaling** | Poor | Excellent |
| **Backup** | File copy | pg_dump / managed |
| **Search** | Slow | Indexed |

**Recommendation: Database** — Even for MVP. Querying history, searching, and future features (tags, sharing) are much easier.

---

### 5. Streaming Approach

| Aspect | Polling | SSE (Server-Sent Events) | WebSocket |
|--------|---------|--------------------------|-----------|
| **Complexity** | Low | Medium | Medium |
| **Real-time** | No (latency) | Yes | Yes |
| **Bidirectional** | No | No (server→client) | Yes |
| **LLM Streaming** | N/A | Good fit | Great fit |
| **Browser Support** | Universal | Great | Great |

**Decision: WebSocket** — Enables bidirectional communication which is useful for:
- Sending new messages without new connections
- Client-side cancellation of in-progress requests
- Future features like typing indicators
- Cleaner handling of multiple parallel model streams

---

### 6. State Management (Frontend)

| Aspect | useState/Context | Zustand | Redux | React Query |
|--------|------------------|---------|-------|-------------|
| **Complexity** | Low | Low | High | Medium |
| **Boilerplate** | None | Minimal | Lots | Minimal |
| **DevTools** | Limited | Good | Excellent | Excellent |
| **Server State** | Manual | Manual | Manual | Built-in |

**Recommendation: Zustand + React Query**
- Zustand for UI state (selected models, sidebar open)
- React Query for server state (history, chat responses) — caching, refetching, loading states built-in

---

### 7. Authentication (If Needed)

| Option | Complexity | Best For |
|--------|------------|----------|
| None | Zero | Single user, local |
| Basic Auth | Low | Simple password protection |
| JWT (custom) | Medium | Custom user system |
| Auth0/Clerk | Medium | Quick, managed auth |
| AWS Cognito | Higher | AWS ecosystem |

**Recommendation: Start with none or Basic Auth** — Add proper auth when you have multiple users or deploy publicly.

---

### 8. Local Dev vs Cloud Deployment

| Aspect | Local (Mac) | Cloud (Render/Fly) | AWS ECS |
|--------|-------------|--------------------| --------|
| **Cost** | Free | Free tier / ~$5-20/mo | ~$10-30/mo |
| **Always On** | No | Yes | Yes |
| **Setup** | Easy | Easy | Medium |
| **HTTPS** | Manual (ngrok) | Automatic | Manual (ALB) |
| **Scaling** | None | Auto | Auto |
| **Control** | Full | Limited | Full |

**Recommendation: Local → Render/Fly.io → AWS**
1. **Development**: Docker Compose locally
2. **Sharing/Demo**: Render or Fly.io (easiest, free tier)
3. **Production**: AWS ECS Fargate (if you need AWS integration, enterprise features)

---

### 9. Parallel Calls: Error Handling Strategy

When calling multiple LLMs, some may fail. Options:

| Strategy | Behavior |
|----------|----------|
| **Fail Fast** | If any model fails, return error |
| **Best Effort** | Return successful responses, show errors inline |
| **Timeout + Fallback** | Set timeout, show partial results |

**Recommendation: Best Effort** — Show successful responses, display errors per-model in UI. Users see value even if one provider is down.

```python
results = await asyncio.gather(*tasks, return_exceptions=True)
# Filter: successful responses + errors shown separately
```

---

### 10. Model Configuration

| Option | Flexibility | Complexity |
|--------|-------------|------------|
| Hardcoded list | Low | Very low |
| Config file | Medium | Low |
| Database | High | Medium |
| Admin UI | Highest | High |

**Recommendation: Config file (YAML/JSON)** — Easy to edit, version-controlled, no DB migration needed.

```yaml
# models.yaml
models:
  - id: gpt-4o
    name: GPT-4o
    provider: openai
    enabled: true
  - id: claude-3-5-sonnet-20240620
    name: Claude 3.5 Sonnet
    provider: anthropic
    enabled: true
```

---

## Deployment Options

### Option 1: Local Development (Mac)
```bash
# Clone and setup
git clone <repo>
cd llm_council

# Add API keys
cp .env.example .env
# Edit .env with your keys

# Start everything
docker-compose up --build

# Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Render.com (Easiest Cloud)
1. Connect GitHub repo
2. Create Web Service for backend (Docker)
3. Create Static Site for frontend (or Web Service if SSR)
4. Add environment variables in Render dashboard
5. Done — auto-deploys on push

### Option 3: Fly.io
```bash
# Install flyctl
brew install flyctl

# Deploy backend
cd backend
fly launch
fly secrets set OPENAI_API_KEY=...

# Deploy frontend
cd ../frontend
fly launch
```

### Option 4: AWS ECS Fargate
- Use LiteLLM's Terraform module: https://github.com/BerriAI/litellm-ecs-deployment
- Or create custom ECS task definitions
- Add RDS PostgreSQL for persistence
- Use AWS Secrets Manager for API keys
- Put behind ALB with HTTPS

---

## Cost Analysis

### API Costs (Primary Expense)
| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| GPT-4o | $2.50 | $10.00 |
| GPT-4o-mini | $0.15 | $0.60 |
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude 3 Haiku | $0.25 | $1.25 |
| Gemini 1.5 Flash | $0.075 | $0.30 |
| Gemini 1.5 Pro | $1.25 | $5.00 |
| Grok | Varies | Varies |

**Typical conversation** (~500 input + 500 output tokens per model):
- 4 models × ~1000 tokens = ~$0.02-0.05 per prompt

**Monthly estimate** (100 prompts/day):
- ~$60-150/month in API costs

### Infrastructure Costs
| Option | Monthly Cost |
|--------|-------------|
| Local Mac | $0 |
| Render Free Tier | $0 (limited) |
| Render Paid | $7-25 |
| Fly.io | $0-10 |
| AWS ECS (minimal) | $15-30 |
| AWS ECS + RDS | $30-50 |

### Cost Optimization Tips
1. **Use cheaper models for simple queries** — Route to GPT-4o-mini or Gemini Flash for straightforward questions
2. **Enable caching** — LiteLLM supports semantic caching
3. **Set budgets** — LiteLLM virtual keys can enforce spending limits
4. **Batch requests** — If applicable
5. **Monitor usage** — Track tokens per model

---

## Future Enhancements

### Short-term (Nice to Have)
- [ ] **Streaming responses** — Real-time token display
- [ ] **Markdown rendering** — Format LLM responses properly
- [ ] **Code highlighting** — Syntax highlighting for code blocks
- [ ] **Copy button** — Easy copy for responses
- [ ] **Regenerate** — Re-run a prompt
- [ ] **Model comparison metrics** — Response time, token count display

### Medium-term
- [ ] **User authentication** — Multiple users
- [ ] **Conversation sharing** — Share via link
- [ ] **Tagging/folders** — Organize conversations
- [ ] **Search** — Full-text search in history
- [ ] **Export** — Download conversations as Markdown/JSON
- [ ] **System prompts** — Configurable per-model or global

### Long-term
- [ ] **Voting/ranking** — Rate responses to track model performance
- [ ] **Analytics dashboard** — Usage, costs, model performance
- [ ] **Plugins/tools** — Web search, code execution
- [ ] **Image support** — Multimodal models (GPT-4V, Claude vision)
- [ ] **RAG integration** — Upload documents, query against them
- [ ] **Agent mode** — Multi-step reasoning with tool use

---

## Quick Start Commands

```bash
# 1. Clone and enter directory
cd /Users/mduppes/code/llm_council

# 2. Create environment file
cat > .env << 'EOF'
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
XAI_API_KEY=...
EOF

# 3. Start with Docker Compose (once set up)
docker-compose up --build

# 4. Access the app
open http://localhost:3000
```

---

## Summary

| Decision | Choice |
|----------|--------|
| Backend Framework | **FastAPI** (async-native) |
| LLM Integration | **LiteLLM as library** |
| Database | **SQLite** (file-based, simple) |
| Frontend | **Vite + React + TailwindCSS** |
| State Management | **Zustand** |
| Streaming | **WebSocket** |
| History Saving | **Auto-save on backend** (no POST endpoint) |
| Deployment | **Local** → **Render/Fly.io** → **AWS** |

**Estimated Timeline**: 1-2 weeks for MVP with core features

---

## Next Steps

1. Set up backend with FastAPI + LiteLLM + SQLite
2. Implement WebSocket `/ws/chat` with streaming + auto-save
3. Scaffold frontend with Vite + React + TailwindCSS
4. Build UI (history sidebar + response grid + input)
5. Connect WebSocket for real-time streaming
6. Dockerize and test locally
7. Deploy to cloud when ready

Ready to start building? Let me know which phase you'd like to tackle first!
