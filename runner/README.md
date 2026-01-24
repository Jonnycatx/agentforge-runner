# AgentForge Runner

Native desktop app for running AgentForge agents.

## Development

### Prerequisites

- Node.js 18+
- Rust (install from [rustup.rs](https://rustup.rs))
- Python 3.8+

### Setup

```bash
cd runner
npm install
```

### Run in development

```bash
# Start Python backend
python3 src-tauri/resources/python/agent_server.py &

# Start Tauri dev
npm run tauri dev
```

### Build for production

```bash
npm run tauri build
```

Outputs will be in `src-tauri/target/release/bundle/`

## Architecture

```
┌─────────────────────────────────────┐
│         Tauri Window (Rust)         │
│  ┌─────────────────────────────┐    │
│  │    React Frontend (Chat UI) │    │
│  │    - Avatar display         │    │
│  │    - Message history        │    │
│  │    - Input field            │    │
│  └─────────────────────────────┘    │
│            ↕ HTTP                   │
│  ┌─────────────────────────────┐    │
│  │    Python Backend (FastAPI) │    │
│  │    - Ollama integration     │    │
│  │    - OpenAI/Anthropic       │    │
│  │    - Config management      │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## Supported Providers

- **Ollama** (local, free)
- **OpenAI**
- **Anthropic**
- **xAI** (Grok)
- **Groq**
- **Google AI**

## How to Release

1. Push your changes to GitHub
2. Create a new tag: `git tag v1.0.0 && git push --tags`
3. GitHub Actions will automatically build:
   - `AgentForge-Runner.dmg` (macOS)
   - `AgentForge-Runner.msi` (Windows)
   - `AgentForge-Runner.AppImage` (Linux)
4. Find the installers in the GitHub Releases page

## .agentforge File Format

```json
{
  "name": "My Agent",
  "goal": "Help with coding",
  "personality": "You are a friendly coding assistant...",
  "provider": "ollama",
  "model": "llama3.2",
  "temperature": 0.7,
  "tools": ["code_interpreter", "web_search"]
}
```

Double-click a `.agentforge` file to open it in the Runner.
