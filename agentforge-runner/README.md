# AgentForge Runner

A native desktop application for running AgentForge agents with a beautiful chat interface.

## Features

- **Native Desktop App**: Lightweight Tauri-based application (~15-30MB)
- **File Association**: Double-click `.agentforge` files to open them
- **Multiple AI Providers**: Supports Ollama (local), OpenAI, and Anthropic
- **Beautiful UI**: Apple-inspired chat interface with dark/light mode
- **Silent Python Backend**: Python runs invisibly in the background

## Prerequisites

1. **Python 3.8+**: [Download Python](https://python.org/downloads)
2. **Node.js 18+**: [Download Node.js](https://nodejs.org)
3. **Rust**: [Install Rust](https://rustup.rs)
4. **Ollama** (optional): [Download Ollama](https://ollama.com/download)

## Development Setup

1. Install Python dependencies:
   ```bash
   cd src-tauri/resources/python
   pip install -r requirements.txt
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run tauri:dev
   ```

## Building for Production

### macOS (.dmg)
```bash
npm run tauri:build -- --bundles dmg
```

### Windows (.msi)
```bash
npm run tauri:build -- --bundles msi
```

### Linux (.AppImage)
```bash
npm run tauri:build -- --bundles appimage
```

## Architecture

```
agentforge-runner/
├── src/                    # React frontend (chat UI)
│   ├── App.tsx            # Main chat component
│   ├── main.tsx           # React entry point
│   └── index.css          # Tailwind styles
├── src-tauri/
│   ├── src/main.rs        # Tauri/Rust backend
│   ├── tauri.conf.json    # App configuration
│   └── resources/python/
│       ├── agent_runner.py    # FastAPI server
│       └── requirements.txt
└── package.json
```

## How It Works

1. **User opens app or .agentforge file**
2. **Tauri spawns Python backend** (FastAPI on port 8765)
3. **React frontend** connects to Python backend
4. **Chat messages** are sent to the AI provider (Ollama/OpenAI/Anthropic)
5. **Responses** are displayed in the native chat window

## File Format (.agentforge)

```json
{
  "version": "1.0",
  "agent": {
    "id": "unique-id",
    "name": "My Agent",
    "goal": "Help with tasks",
    "personality": "Friendly and helpful",
    "tools": [],
    "systemPrompt": "You are a helpful AI assistant."
  },
  "avatar": "bot",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## License

MIT
