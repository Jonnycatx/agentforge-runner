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
- **Storage**: In-memory storage (MemStorage)
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
- **Deployment Modal**: Post-build modal with 3 options - Run in Browser, Download & Run Locally, Share
- **Export Package**: Complete .zip download with Python script, config, requirements.txt, run scripts, and README
- **Ollama Setup Guide**: Built-in tips for setting up free local inference with Ollama
