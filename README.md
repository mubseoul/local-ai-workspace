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

### MVP (v0.1) — Released
- [x] Chat with local LLMs via Ollama
- [x] Document ingestion (PDF, TXT, MD, DOCX)
- [x] RAG with source citations (file + page + relevance)
- [x] Multi-workspace support with isolated vector indices
- [x] Streaming responses with markdown rendering
- [x] Guided onboarding wizard with Ollama detection
- [x] Settings panel (model, temperature, top-K, chunk size)
- [x] SQLite conversation persistence (WAL mode)
- [x] ChromaDB vector storage (cosine similarity)
- [x] File deduplication by SHA-256 hash
- [x] System prompt editor per conversation
- [x] General Chat vs. Workspace Chat mode toggle
- [x] MIT license + GitHub issue templates

---

### v0.2 — Stability & Polish — Released

**Goal**: Make the MVP rock-solid and production-ready for daily use.

- [x] Error boundaries in all React pages (graceful crash recovery)
- [x] Backend health check endpoint with Ollama + DB status
- [x] Retry logic for Ollama calls (3 retries with exponential backoff)
- [x] Loading skeletons for conversations, documents, settings
- [x] Toast notification system (success/error/info)
- [x] Confirmation dialogs for destructive actions (delete workspace, doc, conversation)
- [x] Responsive layout for smaller windows (min 900px graceful)
- [x] Auto-scroll lock/unlock during streaming (don't hijack user scroll)
- [x] Backend request validation + consistent error response format
- [x] Comprehensive logging with log rotation
- [x] CI pipeline: lint + type-check on PR (GitHub Actions)
- [x] Unit tests for chunking, text extraction, and vector store

---

### v1.0 — Enhanced UX — Current Release

**Goal**: A polished daily-driver experience with quality-of-life features.

#### Theming & Appearance
- [x] Light / dark theme toggle with system preference detection
- [x] Persist theme choice in settings
- [x] Smooth theme transitions

#### Keyboard Shortcuts
- [x] `Ctrl/Cmd + N` — New conversation
- [x] `Ctrl/Cmd + K` — Command palette (search conversations, switch workspace, navigate)
- [x] `Ctrl/Cmd + Shift + S` — Toggle sidebar
- [x] `Ctrl/Cmd + /` — Focus chat input
- [x] `Escape` — Close modals/dropdowns
- [x] Shortcut help overlay (`Ctrl/Cmd + ?`)

#### Chat Enhancements
- [x] Edit sent messages (re-send with modification)
- [x] Regenerate last assistant response
- [x] Copy message to clipboard (one-click)
- [x] Markdown export of full conversation
- [x] Conversation search (full-text across all chats)
- [x] Pin important conversations to top
- [x] Conversation folders/tags for organization

#### Document Management
- [ ] Folder watch mode (auto-ingest new/changed files in a directory)
- [x] Re-ingest button per document (if you change chunk settings)
- [x] Document preview (show extracted text before ingesting)
- [x] Batch upload progress bar
- [x] File type icons in document list

#### Prompt Templates
- [x] Built-in template library (summarize, explain, compare, extract)
- [x] Custom user templates with variables (`{{document}}`, `{{question}}`)
- [x] Quick-insert from chat input
- [x] Import/export templates as JSON

---

### v1.5 — Advanced RAG _(✅ COMPLETE — 2026-02-22)_

**Goal**: Smarter retrieval and better answers from documents.

#### Retrieval Improvements
- [x] Hybrid search: vector similarity + BM25 keyword search
- [x] Re-ranking with cross-encoder (local model)
- [x] Recursive retrieval: if first pass is low-confidence, expand search
- [x] Chunk metadata enrichment (headings, section titles, table of contents)
- [x] Configurable retrieval strategy per workspace

#### Chunking Improvements
- [x] Semantic chunking (split by topic/meaning, not just size)
- [x] Table-aware chunking for PDFs (don't split tables)
- [x] Hierarchical chunks (parent-child for context expansion)
- [x] Chunk quality scoring (skip low-signal chunks like headers-only)

#### Citation & Transparency
- [x] Inline citations in response text (clickable `[1]` links)
- [x] "Show retrieved context" debug view (see exactly what the model received)
- [x] Confidence indicator per answer (based on retrieval scores)
- [x] Source highlighting: click citation → show original text highlighted in document

#### New File Formats
- [x] EPUB (e-books)
- [x] HTML (web pages, saved articles)
- [x] CSV / Excel (structured data with column awareness)
- [x] Source code files (.py, .js, .ts, .rs, .go, etc.)
- [x] Markdown with frontmatter parsing

---

### v2.0 — Multimodal & Intelligence _(Target: +14 weeks)_

**Goal**: Go beyond text — images, voice, and smarter AI interactions.

#### Multimodal Support
- [ ] Image understanding via multimodal models (LLaVA, Llama 3.2 Vision)
- [ ] Drag-and-drop images into chat
- [ ] OCR for scanned PDFs (Tesseract integration, runs locally)
- [ ] Image extraction from documents (figures, charts, diagrams)
- [ ] Describe/summarize images in workspace context

#### Voice
- [ ] Voice input via local Whisper model (speech-to-text)
- [ ] Voice output via local TTS model (text-to-speech)
- [ ] Push-to-talk mode
- [ ] Transcribe audio files and add to workspace

#### Smart Features
- [ ] Auto-title conversations using LLM summary
- [ ] Suggested follow-up questions after each response
- [ ] Document summarization (one-click summary of any uploaded file)
- [ ] Compare documents ("What are the differences between doc A and doc B?")
- [ ] Timeline/changelog view for workspace (what was added/changed when)

#### Model Management
- [ ] In-app model browser (browse Ollama library, one-click pull)
- [ ] Model download progress indicator
- [ ] Model benchmarking (test speed on your hardware)
- [ ] Per-workspace model override (use different models for different projects)
- [ ] Model memory/VRAM usage display

---

### v2.5 — Agents & Tools _(Target: +20 weeks)_

**Goal**: Let the AI take actions, not just answer questions.

#### Agent Framework
- [ ] Tool-calling support (models that support function calling)
- [ ] Built-in tools: calculator, date/time, web search (optional, user-enabled)
- [ ] Code execution sandbox (run Python/JS snippets locally)
- [ ] Multi-step reasoning with chain-of-thought display

#### Plugin System
- [ ] Plugin API specification (TypeScript SDK)
- [ ] Plugin marketplace (community-contributed plugins)
- [ ] Built-in plugins: note-taking, task extraction, calendar parsing
- [ ] Plugin sandboxing (plugins can't access data outside their scope)

#### Workflow Automation
- [ ] Scheduled tasks (e.g., "summarize new files every morning")
- [ ] Custom pipelines: ingest → summarize → extract action items → save
- [ ] Webhook integration (trigger workflows from external events)
- [ ] Batch processing mode (run a prompt against all documents)

---

### v3.0 — Collaboration & Sharing _(Target: +28 weeks)_

**Goal**: Multi-user support while keeping everything local.

#### Local Network Sharing
- [ ] Share workspaces over local network (LAN only, no internet)
- [ ] Role-based access: owner, editor, viewer
- [ ] Real-time sync via mDNS/Bonjour discovery
- [ ] Conflict resolution for simultaneous edits

#### Export & Portability
- [ ] Export workspace as portable archive (.law file)
- [ ] Import workspace from archive
- [ ] Export conversations as PDF, Markdown, or HTML
- [ ] Export/import app settings and prompt templates
- [ ] Workspace migration tool (move between machines via USB/network)

#### Knowledge Graph
- [ ] Entity extraction from documents (people, places, concepts)
- [ ] Visual knowledge graph (interactive node-link diagram)
- [ ] Cross-document relationship discovery
- [ ] "What do my documents say about X?" aggregate query

---

### v3.5 — Performance & Scale _(Target: +34 weeks)_

**Goal**: Handle large document collections and power-user workloads.

#### Performance
- [ ] Background ingestion queue (non-blocking uploads)
- [ ] Incremental re-indexing (only re-embed changed chunks)
- [ ] Embedding cache (don't re-embed identical text)
- [ ] Lazy loading for conversation history (paginate messages)
- [ ] Virtual scrolling for long chat threads
- [ ] GPU acceleration detection and optimization hints

#### Scale
- [ ] Support 10,000+ documents per workspace
- [ ] Workspace size analytics (storage, chunk count, index health)
- [ ] Prune old/unused chunks to save space
- [ ] Compressed vector storage option
- [ ] Database vacuum and optimization tools

#### Developer Experience
- [ ] REST API documentation (Swagger/OpenAPI auto-generated)
- [ ] CLI tool (`law-cli`) for headless operations (ingest, query, export)
- [ ] Python SDK for scripting custom workflows
- [ ] Docker Compose setup (one-command backend + Ollama)

---

### v4.0 — Enterprise & Security _(Target: +42 weeks)_

**Goal**: Ready for teams, researchers, and security-conscious organizations.

#### Security
- [ ] Encrypted local storage (AES-256 at rest)
- [ ] Password-protected workspaces
- [ ] Audit log (who accessed what, when)
- [ ] Secure wipe (cryptographic erasure of deleted data)
- [ ] Data retention policies per workspace

#### Research Features
- [ ] BibTeX/citation generation from document metadata
- [ ] Annotation layer (highlight + comment on retrieved chunks)
- [ ] Research notebook mode (structured notes linked to sources)
- [ ] PDF annotation sync (highlight in PDF → linked to workspace)
- [ ] Export research report with inline citations

#### Administration
- [ ] Workspace usage dashboard (storage, queries, tokens used)
- [ ] System health monitor (Ollama status, disk space, memory)
- [ ] Auto-update mechanism (check for new releases)
- [ ] Backup & restore with scheduler

---

### v5.0 — Platform _(Long-term vision)_

**Goal**: The definitive local AI platform.

- [ ] Mobile companion app (React Native, sync over local Wi-Fi)
- [ ] Browser extension (save web pages directly to workspace)
- [ ] Email integration (ingest emails, search across inbox locally)
- [ ] Calendar integration (local .ics parsing)
- [ ] Unified search across all workspaces
- [ ] Custom model fine-tuning on your documents (LoRA, locally)
- [ ] Local AI assistant that learns your preferences over time
- [ ] App store / marketplace for community extensions
- [ ] Self-hosted web UI option (for NAS/home server deployment)
- [ ] Offline-first sync protocol (CRDTs for multi-device without cloud)

---

### Milestone Summary

| Version | Theme | Target | Key Deliverable |
|---------|-------|--------|-----------------|
| **v0.1** | MVP | **Now** | Chat + RAG + Workspaces |
| **v0.2** | Stability | +2 weeks | Error handling, tests, CI |
| **v1.0** | Polish | **Now** | Themes, shortcuts, templates, search |
| **v1.5** | Smart RAG | +8 weeks | Hybrid search, new formats, semantic chunking |
| **v2.0** | Multimodal | +14 weeks | Images, voice, OCR, model management |
| **v2.5** | Agents | +20 weeks | Tool calling, plugins, workflows |
| **v3.0** | Collaboration | +28 weeks | LAN sharing, export, knowledge graph |
| **v3.5** | Scale | +34 weeks | Performance, 10K+ docs, CLI, Docker |
| **v4.0** | Enterprise | +42 weeks | Encryption, audit, research tools |
| **v5.0** | Platform | Long-term | Mobile, browser ext, fine-tuning, marketplace |

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
