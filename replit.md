# AgentForge

A clean, minimalist, Apple.com-inspired web application for building AI agents through natural language conversations. The platform hosts no models or inference - all compute happens via models that users connect themselves.

## Overview

AgentForge allows users to:
- Build AI agents through guided conversations
- Connect their own model providers (OpenAI, Anthropic, Groq, Google, xAI, Ollama)
- Export generated agent code (Python/LangChain)
- Browse and fork community agents

## Architecture

### Frontend (client/)
- **Framework**: React with TypeScript
- **Routing**: wouter
- **State Management**: Zustand with localStorage persistence
- **UI Components**: shadcn/ui + Tailwind CSS
- **Animations**: Framer Motion

### Backend (server/)
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OIDC)
- **API**: RESTful endpoints for agent CRUD operations

### Shared (shared/)
- **Types**: Zod schemas for validation
- **Models**: AgentConfig, ModelProvider, ChatMessage, BuilderState

## Key Pages

1. **Landing Page** (`/`) - Apple-inspired hero with features showcase
2. **Builder Page** (`/builder`) - Split-view with chat interface and code preview
3. **Gallery Page** (`/gallery`) - Browse and fork community agents

## Design System

- **Colors**: Clean whites, subtle grays, primary blue (#2563eb)
- **Typography**: Inter font family
- **Spacing**: Consistent padding (p-4, p-6, p-8)
- **Components**: Cards, Badges, Buttons following Apple minimalism

## API Endpoints

- `GET /api/agents` - List all agents
- `GET /api/agents/public` - List public agents
- `GET /api/agents/:id` - Get single agent
- `POST /api/agents` - Create new agent
- `PATCH /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent
- `GET /api/health` - Health check

## Model Providers

Supported providers with pre-configured models:
- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Groq (Llama 3.1 70B, Mixtral 8x7B)
- Google (Gemini 1.5 Pro/Flash)
- xAI (Grok Beta)
- Ollama (Local models)

## Running the Project

```bash
npm run dev
```

The app runs on port 5000 with both frontend and backend served together.

## Recent Changes

- Initial MVP implementation
- Landing page with hero section and features
- Agent builder with conversational interface
- Code preview with JSON/Python export
- Model selector with API key configuration
- Gallery page with sample agents

### Latest Updates
- **Template Gallery**: 12 starter templates (Web Designer, Code Reviewer, Research Assistant, etc.) with one-click loading
- **Live Agent Testing Pane**: Test your agent directly in the builder with a dedicated Test tab
- **Featured Agents Section**: Landing page now shows 6 featured templates with click-to-build
- **Enhanced Gallery**: Category filters (Coding, Design, Research, etc.), sort options (Recent, Name, Tools)
- **One-Click Remix**: Fork button navigates directly to Builder with agent pre-loaded
- **Deployment Modal**: Browser-first design with "Run in Browser" (primary/instant), "Run on Desktop with Python" (3-step guide with OS detection), and "Native Desktop App Coming Soon" teaser
- **Export Package**: Complete .zip download with Python script, config, requirements.txt, run scripts, and README
- **Ollama Setup Guide**: Built-in tips for setting up free local inference with Ollama
- **Real Inference**: Client-side API calls to user-connected providers (OpenAI, Anthropic, Groq, Google, xAI, Ollama)
- **Ollama Auto-Detection**: Automatically detects and connects to local Ollama instances
- **Live/Demo Mode**: Test pane shows "Live Mode" when provider connected, "Demo Mode" otherwise
- **Connection Testing**: Validates API keys before marking providers as connected

### Authentication & Persistence
- **Replit Auth**: Users can sign in with Google, GitHub, X, Apple, or email/password via Replit's OIDC provider
- **PostgreSQL Database**: Agents are now stored in PostgreSQL with user ownership
- **User Accounts**: Header shows login/logout button and user avatar when authenticated
- **Agent Ownership**: Created agents are associated with the user's account
- **Cross-Device Sync**: Agents are stored server-side, accessible from any device when logged in
- **Authorization**: Only owners can update/delete their agents; public agents can be viewed by anyone

### UI Enhancements (Latest)
- **Progress Stepper**: Visual step indicator with icons (Goal, Personality, Tools, Model, Done) showing build progress
- **Model Provider Icons**: Provider-specific icons (Server, Sparkles, Brain, etc.) with green status dots for connected providers
- **Details Tab**: Preview pane shows personality, tools with icons, and model settings in card layout
- **Theme Toggle Dropdown**: Light/Dark/System options with OS preference auto-detection
- **Typing Animation**: Chat interface shows bouncing dots animation while assistant is responding

### Run Agent Web Interface (`/run-agent/:agentId`)
- **Standalone Chat Page**: Apple-inspired minimalist design for running agents in browser
- **Animated Header**: Agent avatar with pulse animation, name badge, model status indicator
- **Message Bubbles**: Clean user/assistant bubbles with Framer Motion transitions and copy button on hover
- **Welcome State**: Greeting message with agent personality and quick suggestion chips
- **Typing Indicator**: Animated bouncing dots when AI is responding
- **localStorage Persistence**: Chat history persists per agent across page refreshes
- **Settings Dropdown**: Theme toggle (Light/Dark/System) and model connection option
- **Model Connection Modal**: Prompts users to connect a model provider before first message
- **Voice Input Button**: Placeholder for speech-to-text functionality
- **Deployment Integration**: "Run in Browser Now" button opens agent in new tab from deployment modal

### Native Desktop App (AgentForge Runner)
Complete Tauri v2 + Python desktop app in `runner/` folder:
- **Tauri + Python Sidecar**: Small native shell (~15-30MB) that spawns Python agent server
- **File Association**: Register `.agentforge` files so they open directly in the Runner
- **Native Feel**: Beautiful chat window matching web design
- **GitHub Actions**: Auto-builds Mac (.dmg), Windows (.msi), Linux (.AppImage) on release

#### Runner Architecture
```
runner/
├── src/                         # React Frontend
│   ├── App.tsx                  # Chat UI with settings
│   ├── main.tsx                 # Entry point
│   └── index.css                # Tailwind styles
├── src-tauri/
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # File associations, bundle config
│   ├── src/main.rs              # Spawns Python, handles .agentforge files
│   └── resources/python/
│       └── agent_server.py      # HTTP server for AI inference
├── .github/workflows/
│   └── build.yml                # Auto-build on GitHub release
└── package.json
```

#### How to Release the Runner
1. Push the code to GitHub
2. Update `GITHUB_REPO` in `client/src/components/deployment-modal.tsx`
3. Create a release tag: `git tag v1.0.0 && git push --tags`
4. GitHub Actions auto-builds installers and creates a release
5. Users can then download from the deployment modal

#### Key Implementation Details
1. **File Association** (tauri.conf.json): Register `.agentforge` extension
2. **Python Sidecar**: Spawn `python3 agent_runner.py --config /path/to/file.agentforge` silently
3. **FastAPI Backend**: Local server on port 8765 for chat messages
4. **Frontend**: Fetch from `http://127.0.0.1:8765/chat` for responses

#### Build Commands
- Dev: `npm run tauri dev`
- macOS: `npm run tauri build --bundles dmg`
- Windows: `npm run tauri build --bundles msi`
- Linux: `npm run tauri build --bundles appimage`

#### User Flow
1. User builds agent in web app → Clicks "Deploy to Desktop"
2. First time: Downloads AgentForge Runner (.dmg/.msi)
3. Downloads `.agentforge` file (tiny JSON config)
4. Double-click `.agentforge` → Runner opens with avatar + chat

#### Estimated Timeline: ~2 weeks
- Phase 1: Fork Tauri + Python sidecar example (1 day)
- Phase 2: Integrate chat UI + agent logic (3-4 days)
- Phase 3: File association + .agentforge parsing (1 day)
- Phase 4: First-run setup dialog (1-2 days)
- Phase 5: Build pipeline + code signing (1-2 days)
- Phase 6: Testing + polish (2-3 days)
