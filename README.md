# LLM Council

Chat with multiple LLMs simultaneously and compare their responses side-by-side.

## Features

- 🤖 **Multi-model chat** - Send one message, get responses from all selected LLMs
- 📊 **Side-by-side comparison** - View all model responses in a grid layout
- 💬 **Streaming responses** - Real-time token display via WebSocket
- 📚 **Conversation history** - Auto-saved to database, easily reload past chats
- 🎨 **Modern UI** - Clean, responsive design with TailwindCSS
- 📈 **Usage tracking** - Monitor token usage and estimated costs per model
- 🔌 **Dynamic model discovery** - Automatically detects available models from LiteLLM

## Supported Providers

Models are dynamically discovered from LiteLLM. Just add your API key and all available models from that provider will appear:

| Provider | API Key Variable | Example Models |
|----------|------------------|----------------|
| **OpenAI** | `OPENAI_API_KEY` | GPT-4o, GPT-4o Mini, o1, o3-mini |
| **Anthropic** | `ANTHROPIC_API_KEY` | Claude 4 Sonnet, Claude 3.5 Sonnet/Haiku, Claude 3 Opus |
| **Google Gemini** | `GEMINI_API_KEY` | Gemini 2.0 Flash, Gemini 1.5 Pro/Flash |
| **xAI** | `XAI_API_KEY` | Grok 2, Grok 3 |
| **Mistral** | `MISTRAL_API_KEY` | Mistral Large, Mixtral |
| **Cohere** | `COHERE_API_KEY` | Command R, Command R+ |
| **Together AI** | `TOGETHER_API_KEY` | Llama, Mixtral (open source) |
| **Groq** | `GROQ_API_KEY` | Llama 3.3, Mixtral (fast inference) |
| **DeepSeek** | `DEEPSEEK_API_KEY` | DeepSeek Chat, DeepSeek Reasoner |
| **Perplexity** | `PERPLEXITY_API_KEY` | Sonar, Sonar Pro (with search) |

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Mac/Windows)
- API keys from at least one LLM provider

### 1. Clone and Setup

```bash
cd llm_council

# Create environment file
cp .env.example .env
```

### 2. Add Your API Keys

Edit `.env` and add your API keys:

```bash
# Add any combination of these - models auto-discover based on available keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxx

# Optional: Additional providers
MISTRAL_API_KEY=xxxxxxxxxxxxxxxxxxxx
COHERE_API_KEY=xxxxxxxxxxxxxxxxxxxx
TOGETHER_API_KEY=xxxxxxxxxxxxxxxxxxxx
GROQ_API_KEY=xxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_KEY=xxxxxxxxxxxxxxxxxxxx
PERPLEXITY_API_KEY=xxxxxxxxxxxxxxxxxxxx
```

### 3. Run with Docker Compose

```bash
# Start the app
docker-compose up --build

# Or for development with hot reload:
docker-compose -f docker-compose.dev.yml up --build
```

### 4. Open the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Running Without Docker

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                      │
│                                                                      │
│   ┌──────────────┐    ┌─────────────────────────────────────────┐   │
│   │   History    │    │              Response Grid               │   │
│   │   Sidebar    │    │   ┌──────────┐ ┌──────────┐ ┌─────────┐ │   │
│   │              │    │   │  GPT-4o  │ │  Claude  │ │ Gemini  │ │   │
│   │   + Models   │    │   └──────────┘ └──────────┘ └─────────┘ │   │
│   └──────────────┘    │   ┌────────────────────────────────────┐│   │
│                       │   │          Chat Input                 ││   │
│                       │   └────────────────────────────────────┘│   │
│                       └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI + LiteLLM)                      │
│                                                                      │
│   • WebSocket /ws/chat  → Streams responses from all models         │
│   • GET /history        → List conversations                        │
│   • GET /history/{id}   → Get conversation                          │
│   • Auto-saves to SQLite                                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
            ┌───────────┬───────────┬───────────┬───────────┐
            │  OpenAI   │ Anthropic │  Google   │    xAI    │
            └───────────┴───────────┴───────────┴───────────┘
```

## Project Structure

```
llm_council/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── config.py         # Settings & API keys
│   │   ├── db/
│   │   │   ├── database.py   # SQLite connection
│   │   │   └── models.py     # SQLAlchemy models
│   │   ├── routers/
│   │   │   ├── chat.py       # WebSocket endpoint
│   │   │   └── history.py    # REST API for history
│   │   └── services/
│   │       ├── llm_service.py    # LiteLLM wrapper
│   │       └── history_service.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatInput.tsx
│   │   │   ├── HistorySidebar.tsx
│   │   │   ├── ModelCard.tsx
│   │   │   ├── ModelSelector.tsx
│   │   │   └── ResponseGrid.tsx
│   │   ├── stores/
│   │   │   └── chatStore.ts  # Zustand state
│   │   └── services/
│   │       └── api.ts
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
└── README.md
```

## API Reference

### WebSocket: `/chat/ws`

Send a chat message:
```json
{
  "type": "chat",
  "conversation_id": "uuid-or-null",
  "message": "Hello!",
  "models": ["gpt-4o", "claude-3-5-sonnet-20240620"]
}
```

Receive streamed responses:
```json
{"type": "conversation_started", "conversation_id": "uuid"}
{"type": "token", "model_id": "gpt-4o", "token": "Hello"}
{"type": "model_complete", "model_id": "gpt-4o", "content": "...", "latency_ms": 1234}
{"type": "chat_complete", "conversation_id": "uuid"}
```

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/chat/models` | GET | List available models |
| `/history` | GET | List conversations |
| `/history/{id}` | GET | Get conversation |
| `/history/{id}` | DELETE | Delete conversation |

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | At least one |
| `ANTHROPIC_API_KEY` | Anthropic API key | API key |
| `GEMINI_API_KEY` | Google Gemini API key | required |
| `XAI_API_KEY` | xAI (Grok) API key | |
| `DATABASE_URL` | SQLite connection string | No (default provided) |
| `DEBUG` | Enable debug mode | No (default: true) |

### Getting API Keys

| Provider | URL |
|----------|-----|
| OpenAI | https://platform.openai.com/api-keys |
| Anthropic | https://console.anthropic.com/ |
| Google Gemini | https://aistudio.google.com/apikey |
| xAI | https://console.x.ai/ |

## Development

### Running Tests

```bash
cd backend
pytest
```

### Building for Production

```bash
docker-compose -f docker-compose.yml build
```

## License

MIT
