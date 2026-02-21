# Local AI Workspace

**Privacy-first, offline RAG desktop app — chat with local LLMs and your documents.**

> All data stays on your device. No cloud. No API keys. No telemetry. Ever.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-brightgreen)]()
[![Ollama](https://img.shields.io/badge/Powered%20by-Ollama-orange)]()

---

## What Is This?

Local AI Workspace is a cross-platform desktop app that runs **100% locally** on your machine. It lets you:

- **Chat with local LLMs** (via Ollama) — like ChatGPT, but private
- **Chat with your documents** (PDF, TXT, MD, DOCX) using RAG
- **Search and cite sources** with page numbers and relevance scores
- **Manage multiple workspaces** — separate knowledge bases for different projects

No internet connection required after setup. No data ever leaves your device.

---

## Screenshots

> _Screenshots to capture for the repo:_

| Screen | Description |
|--------|-------------|
| **Onboarding** | Welcome screen with Ollama detection and model selection |
| **General Chat** | Clean chat UI with streaming responses and markdown rendering |
| **Workspace Chat** | Document-grounded chat with source citations below answers |
| **Document Manager** | Drag-and-drop upload with ingestion progress and file list |
| **Workspace Manager** | Create, rename, and switch between knowledge bases |
| **Settings** | Model selection, temperature slider, RAG tuning parameters |

---

## Features

### Core
- Chat with local AI models (llama3, mistral, qwen, phi, gemma, etc.)
- Streaming responses with markdown rendering
- RAG: chat with your documents with source citations
- Multi-workspace support (separate vector indices + chat history)
- Document ingestion (PDF, TXT, MD, DOCX) with chunking controls
- File deduplication by SHA-256 hash
- Conversation history stored in local SQLite
- System prompt editor per conversation
- General Chat vs. Workspace Chat mode toggle

### Privacy & Security
- 100% offline after initial setup
- Zero telemetry, zero cloud dependencies
- All data stored locally (~/.local-ai-workspace)
- No API keys required
- Clear privacy messaging throughout the UI

### UX
- Modern dark UI built with React + Tailwind CSS
- Guided onboarding flow
- Ollama connection detection with helpful setup guidance
- Drag-and-drop document upload
- Responsive sidebar with conversation management
- Configurable: model, temperature, context window, chunk size, top-K

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Tauri Desktop Shell           │
│  ┌───────────────────────────────────┐  │
│  │     React + TypeScript + Vite     │  │
│  │         (Frontend UI)             │  │
│  └──────────────┬────────────────────┘  │
│                 │ HTTP                   │
│  ┌──────────────▼────────────────────┐  │
│  │     FastAPI (Python Backend)      │  │
│  │  ┌──────────┐  ┌───────────────┐  │  │
│  │  │  SQLite  │  │  ChromaDB     │  │  │
│  │  │ (metadata│  │ (vectors)     │  │  │
│  │  │  + chat) │  │               │  │  │
│  │  └──────────┘  └───────────────┘  │  │
│  └──────────────┬────────────────────┘  │
│                 │ HTTP                   │
│  ┌──────────────▼────────────────────┐  │
│  │     Ollama (localhost:11434)      │  │
│  │     Local LLM + Embeddings       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Stack choices and rationale:**

| Layer | Choice | Why |
|-------|--------|-----|
| Desktop | **Tauri 2** | ~10MB binary (vs ~150MB Electron), native performance, Rust security |
| Frontend | **React + TypeScript + Vite** | Fast DX, type safety, huge ecosystem |
| Styling | **Tailwind CSS** | Rapid, consistent, no CSS-in-JS runtime cost |
| State | **Zustand** | Minimal boilerplate, no context provider hell |
| Backend | **FastAPI (Python)** | Best ML/RAG ecosystem, async streaming, great typing |
| Vector DB | **ChromaDB** | Embedded, no server, simple API, cosine similarity built-in |
| Metadata DB | **SQLite** (via aiosqlite) | Zero config, WAL mode, perfect for local desktop |
| LLM Runtime | **Ollama** | One binary, cross-platform, handles GPU/CPU automatically |
| Embeddings | **Ollama** (nomic-embed-text) | No separate Python ML dependencies needed |

---

## Prerequisites

- **Ollama** — [ollama.com](https://ollama.com)
- **Node.js** >= 18
- **Python** >= 3.10
- **Rust** (for Tauri builds) — [rustup.rs](https://rustup.rs)

---

## Quick Start

### 1. Install Ollama and pull models

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama
ollama serve

# Pull a chat model and an embedding model
ollama pull llama3
ollama pull nomic-embed-text
```

### 2. Clone and set up

```bash
git clone https://github.com/yourname/local-ai-workspace.git
cd local-ai-workspace

# Install frontend dependencies
npm install

# Set up Python backend
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Configure (optional)

```bash
cp .env.example .env
# Edit .env to customize settings
```

### 4. Run in development

```bash
# Terminal 1: Start the backend
cd backend && source .venv/bin/activate
python -m uvicorn main:app --reload --port 8187

# Terminal 2: Start the frontend
npm run dev
```

Open [http://localhost:1420](http://localhost:1420) in your browser, or run the Tauri desktop app:

```bash
npm run tauri dev
```

### 5. Build release binaries

```bash
npm run tauri build
```

Binaries are output to `src-tauri/target/release/bundle/`.

---

## Project Structure

```
local-ai-workspace/
├── backend/                    # Python FastAPI backend
│   ├── main.py                 # App entry point, CORS, routers
│   ├── config.py               # Settings (env vars + defaults)
│   ├── database.py             # SQLite schema + migrations
│   ├── models.py               # Pydantic models
│   ├── routers/
│   │   ├── chat.py             # Chat + streaming + RAG
│   │   ├── documents.py        # File upload + ingestion
│   │   ├── workspaces.py       # CRUD workspaces
│   │   ├── ollama.py           # Ollama status + model listing
│   │   └── app_settings.py     # Persist user settings
│   ├── services/
│   │   ├── ollama_service.py   # Ollama HTTP client (chat, embed)
│   │   ├── rag_service.py      # Query embeddings + vector search
│   │   ├── document_service.py # Extract → chunk → embed → store
│   │   └── vector_store.py     # ChromaDB wrapper
│   └── utils/
│       ├── text_extraction.py  # PDF, TXT, MD, DOCX extractors
│       └── chunking.py         # Sentence-aware text chunking
├── src/                        # React frontend
│   ├── App.tsx                 # Root app with routing
│   ├── main.tsx                # React entry point
│   ├── index.css               # Tailwind + global styles
│   ├── lib/
│   │   ├── types.ts            # TypeScript interfaces
│   │   └── api.ts              # API client with SSE streaming
│   ├── store/
│   │   └── appStore.ts         # Zustand global state
│   ├── hooks/
│   │   ├── useChat.ts          # Chat send logic
│   │   ├── useOllama.ts        # Ollama status polling
│   │   └── useWorkspace.ts     # Document + workspace management
│   ├── components/
│   │   ├── ChatMessage.tsx     # Message bubble with markdown
│   │   ├── ChatInput.tsx       # Auto-resize textarea + send
│   │   ├── Sidebar.tsx         # Navigation + conversation list
│   │   ├── WorkspaceSelector.tsx
│   │   ├── DocumentList.tsx    # Drag-and-drop upload + file list
│   │   └── SourceCitation.tsx  # Expandable source references
│   └── pages/
│       ├── ChatPage.tsx        # Main chat interface
│       ├── DocumentsPage.tsx   # Document management
│       ├── WorkspacesPage.tsx  # Workspace CRUD
│       ├── SettingsPage.tsx    # All settings controls
│       └── OnboardingPage.tsx  # First-run setup wizard
├── src-tauri/                  # Tauri desktop shell
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── lib.rs
│       └── main.rs
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## Troubleshooting

### Ollama not detected

1. Make sure Ollama is installed: `ollama --version`
2. Start it: `ollama serve`
3. Verify: `curl http://localhost:11434/api/tags`

### "No embedding model" error

Pull an embedding model:
```bash
ollama pull nomic-embed-text
```

### Slow responses on CPU

This is normal for large models on CPU-only machines. Try:
- Use a smaller model: `ollama pull phi` (2.7B) or `ollama pull tinyllama`
- Reduce context window in Settings
- Close other memory-heavy applications

### Backend won't start

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --port 8187
```

### Document ingestion fails

- Check file size is under 100MB
- Ensure the embedding model is pulled in Ollama
- Check backend logs for specific error messages

### Port conflicts

If port 8187 is in use, change it:
```bash
python -m uvicorn main:app --port 8188
```
Then update the Vite proxy in `vite.config.ts` to match.

---

## Demo Script (60-second video)

Use this script to record a compelling demo:

1. **[0-5s]** Show app launch with privacy badge: "100% offline"
2. **[5-15s]** Quick general chat: type "What is RAG?" → show streaming response
3. **[15-25s]** Switch to Workspace mode → create "Research" workspace
4. **[25-35s]** Upload a PDF → show ingestion progress → "Ready" status
5. **[35-50s]** Ask a question about the PDF → show answer with source citations
6. **[50-55s]** Expand citations to show file name, page number, relevance score
7. **[55-60s]** Flash the Settings page → highlight "All data stays on your device"

**Recording tips:**
- Use a screen recorder at 1920x1080
- Pre-pull models so there's no download wait
- Use a ~5 page PDF with clear, quotable content
- Convert to GIF for README (use `ffmpeg` or gifski)

---

## Roadmap

### MVP (v0.1) — Current
- [x] Chat with local LLMs via Ollama
- [x] Document ingestion (PDF, TXT, MD, DOCX)
- [x] RAG with source citations
- [x] Multi-workspace support
- [x] Streaming responses
- [x] Onboarding wizard
- [x] Settings panel
- [x] SQLite conversation persistence
- [x] ChromaDB vector storage

### v1.1 — Enhanced UX
- [ ] Light/dark theme toggle
- [ ] Keyboard shortcuts (Ctrl+N new chat, Ctrl+K command palette)
- [ ] Markdown export of chat history
- [ ] Prompt templates library
- [ ] Folder watch (auto-ingest new/changed files)
- [ ] Conversation search

### v2.0 — Power Features
- [ ] Multiple file format support (EPUB, HTML, CSV, code files)
- [ ] Image understanding (with multimodal models)
- [ ] Voice input/output
- [ ] Plugin system for custom tools
- [ ] Collaborative workspaces (local network sharing)
- [ ] Model fine-tuning interface

---

## Checklist: How to Hit 1k Stars

- [ ] **README quality**: Clear value prop in first 3 lines, badges, screenshots
- [ ] **Demo GIF**: 15-second GIF showing chat + RAG in action (autoplay in README)
- [ ] **One-command install**: `curl -fsSL ... | sh` or `brew install`
- [ ] **Release binaries**: GitHub Releases with .dmg, .msi, .AppImage
- [ ] **Landing page**: Simple GitHub Pages site with feature highlights
- [ ] **Show HN post**: Launch on Hacker News with honest title
- [ ] **Reddit posts**: r/selfhosted, r/LocalLLaMA, r/privacy
- [ ] **Video demo**: 60-second YouTube video linked in README
- [ ] **Comparison table**: vs. ChatGPT, vs. AnythingLLM, vs. PrivateGPT
- [ ] **Contributing guide**: CONTRIBUTING.md with setup instructions
- [ ] **Good first issues**: Label easy bugs/features for new contributors
- [ ] **Social proof**: Tweet thread on launch day with screenshots
- [ ] **Regular updates**: Ship v1.1 within 2 weeks of launch
- [ ] **Respond to issues**: Reply to every issue within 24 hours

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please keep the **privacy-first principle** — no features that send data externally.

---

## License

[MIT](LICENSE) — do whatever you want with it.

---

<p align="center">
  <strong>Built with privacy in mind.</strong><br>
  Your data. Your device. Your AI.
</p>
