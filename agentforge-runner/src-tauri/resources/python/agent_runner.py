#!/usr/bin/env python3
"""
AgentForge Runner - Python Backend
FastAPI server that handles chat requests and communicates with AI models.
"""

import argparse
import json
import os
from typing import Optional

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AgentForge Runner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global agent config
agent_config: dict = {}


class ChatMessage(BaseModel):
    content: str


class ConfigLoad(BaseModel):
    path: str


class ProviderConfig(BaseModel):
    provider: str
    api_key: Optional[str] = None
    model: Optional[str] = None


def load_config_from_file(path: str) -> dict:
    """Load agent configuration from .agentforge file."""
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading config from {path}: {e}")
        return get_default_config()


def get_default_config() -> dict:
    """Return default agent configuration."""
    return {
        "name": "AI Assistant",
        "goal": "Help users with their questions",
        "personality": "You are a friendly and helpful AI assistant.",
        "avatar": "",
        "provider": "ollama",
        "model": "llama3.2",
        "apiKey": "",
        "temperature": 0.7,
    }


async def call_ollama(message: str, system_prompt: str, model: str = "llama3.2") -> str:
    """Call Ollama for local inference."""
    import httpx
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message}
                    ],
                    "stream": False
                }
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("message", {}).get("content", "I couldn't generate a response.")
            else:
                return f"Ollama error: {response.status_code}"
    except httpx.ConnectError:
        return "Could not connect to Ollama. Please make sure Ollama is running (ollama serve)."
    except Exception as e:
        return f"Error: {str(e)}"


async def call_openai(message: str, system_prompt: str, api_key: str, model: str = "gpt-4o-mini") -> str:
    """Call OpenAI API."""
    import httpx
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message}
                    ]
                }
            )
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                return f"OpenAI error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error: {str(e)}"


async def call_anthropic(message: str, system_prompt: str, api_key: str, model: str = "claude-3-5-sonnet-20241022") -> str:
    """Call Anthropic Claude API."""
    import httpx
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "max_tokens": 4096,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": message}
                    ]
                }
            )
            if response.status_code == 200:
                data = response.json()
                return data["content"][0]["text"]
            else:
                return f"Anthropic error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error: {str(e)}"


async def run_agent(message: str) -> str:
    """Process a chat message and return the agent's response."""
    global agent_config
    
    if not agent_config:
        return "Agent not configured. Please load an agent configuration."
    
    system_prompt = agent_config.get("personality", "You are a helpful AI assistant.")
    provider = agent_config.get("provider", "ollama")
    model = agent_config.get("model", "llama3.2")
    api_key = agent_config.get("apiKey", "")
    
    if provider == "ollama":
        return await call_ollama(message, system_prompt, model)
    elif provider == "openai" and api_key:
        return await call_openai(message, system_prompt, api_key, model)
    elif provider == "anthropic" and api_key:
        return await call_anthropic(message, system_prompt, api_key, model)
    else:
        # Default to Ollama
        return await call_ollama(message, system_prompt)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "agent_loaded": bool(agent_config)}


@app.get("/config")
async def get_config():
    """Get current agent configuration."""
    if agent_config:
        return agent_config
    return get_default_config()


@app.post("/load-config")
async def load_config(data: ConfigLoad):
    """Load agent config from .agentforge file path."""
    global agent_config
    
    if os.path.exists(data.path):
        agent_config = load_config_from_file(data.path)
        return agent_config
    else:
        return {"error": f"Config file not found: {data.path}"}


@app.post("/config/provider")
async def set_provider(config: ProviderConfig):
    """Set the model provider configuration."""
    global agent_config
    agent_config["provider"] = config.provider
    if config.api_key:
        agent_config["apiKey"] = config.api_key
    if config.model:
        agent_config["model"] = config.model
    return {"status": "ok", "provider": config.provider}


@app.post("/chat")
async def chat(msg: ChatMessage):
    """Handle chat messages."""
    response = await run_agent(msg.content)
    return {"response": response}


def main():
    global agent_config
    
    parser = argparse.ArgumentParser(description="AgentForge Runner Backend")
    parser.add_argument("--config", type=str, help="Path to .agentforge config file")
    parser.add_argument("--port", type=int, default=8765, help="Port to run the server on")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to")
    args = parser.parse_args()
    
    # Load agent configuration
    if args.config and os.path.exists(args.config):
        agent_config = load_config_from_file(args.config)
        print(f"Loaded agent: {agent_config.get('name', 'Unknown')}")
    else:
        agent_config = get_default_config()
        print("Using default agent configuration")
    
    # Start the server
    print(f"Starting AgentForge Runner on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
