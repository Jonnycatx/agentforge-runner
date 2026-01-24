import type { AgentConfig } from "@shared/schema";
import JSZip from "jszip";

export interface PWAAgentConfig extends Partial<AgentConfig> {
  avatar?: string;
  voiceEnabled?: boolean;
}

export async function generatePWAPackage(agent: PWAAgentConfig): Promise<void> {
  const zip = new JSZip();
  const agentName = agent.name?.replace(/\s+/g, "_").toLowerCase() || "my_agent";
  const avatarSvgPath = getAvatarSvgPath(agent.avatar || "bot");

  // index.html - Main PWA page with multi-provider support
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#2563eb">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${agent.name || "AI Agent"}">
  <title>${agent.name || "AI Agent"}</title>
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="icon-192.svg">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --primary: #2563eb;
      --bg: #ffffff;
      --text: #1f2937;
      --muted: #6b7280;
      --border: #e5e7eb;
      --card: #f9fafb;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827;
        --text: #f9fafb;
        --muted: #9ca3af;
        --border: #374151;
        --card: #1f2937;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: linear-gradient(135deg, var(--primary), #1d4ed8);
      padding: 24px 20px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .avatar-container {
      width: 80px;
      height: 80px;
      margin: 0 auto 12px;
      background: rgba(255,255,255,0.2);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      animation: float 3s ease-in-out infinite;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    @keyframes float {
      0%, 100% { transform: translateY(0) rotateY(0); }
      50% { transform: translateY(-8px) rotateY(10deg); }
    }
    .header h1 {
      color: white;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .header p {
      color: rgba(255,255,255,0.8);
      font-size: 13px;
    }
    .chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      line-height: 1.5;
      font-size: 15px;
    }
    .message.user {
      background: var(--primary);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .message.assistant {
      background: var(--card);
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      border: 1px solid var(--border);
    }
    .input-container {
      padding: 12px 16px 24px;
      background: var(--bg);
      border-top: 1px solid var(--border);
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }
    .input-container textarea {
      flex: 1;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 12px 16px;
      font-size: 16px;
      resize: none;
      max-height: 120px;
      background: var(--card);
      color: var(--text);
    }
    .input-container textarea:focus {
      outline: none;
      border-color: var(--primary);
    }
    .send-btn, .voice-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: var(--primary);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .send-btn:hover, .voice-btn:hover { opacity: 0.9; }
    .voice-btn { background: var(--card); color: var(--text); border: 1px solid var(--border); }
    .voice-btn.listening { background: #ef4444; color: white; animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
    .typing-indicator { display: flex; gap: 4px; padding: 12px 16px; }
    .typing-indicator span {
      width: 8px; height: 8px; background: var(--muted); border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .setup-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .setup-content {
      background: var(--bg); padding: 24px; border-radius: 16px;
      max-width: 400px; width: 100%;
    }
    .setup-content h2 { margin-bottom: 12px; }
    .setup-content input {
      width: 100%; padding: 12px; border: 1px solid var(--border);
      border-radius: 8px; margin-bottom: 12px; font-size: 14px;
      background: var(--card); color: var(--text);
    }
    .setup-content button {
      width: 100%; padding: 12px; background: var(--primary);
      color: white; border: none; border-radius: 8px; cursor: pointer;
      font-size: 16px; font-weight: 500;
    }
    .avatar-svg { width: 40px; height: 40px; fill: white; }
    .icon-btn svg { width: 20px; height: 20px; }
    .provider-select { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; font-size: 14px; background: var(--card); color: var(--text); }
  </style>
</head>
<body>
  <div class="header">
    <div class="avatar-container" id="avatar">
      <svg class="avatar-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="${avatarSvgPath}"/>
      </svg>
    </div>
    <h1>${agent.name || "AI Agent"}</h1>
    <p>${agent.goal || "Your AI Assistant"}</p>
  </div>

  <div class="chat-container" id="chat"></div>

  <div class="input-container">
    ${agent.voiceEnabled ? '<button class="voice-btn icon-btn" id="voiceBtn"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3m7 9c0 3.53-2.61 6.44-6 6.93V21h-2v-3.07c-3.39-.49-6-3.4-6-6.93h2a5 5 0 0 0 5 5a5 5 0 0 0 5-5z"/></svg></button>' : ''}
    <textarea id="input" placeholder="Type your message..." rows="1"></textarea>
    <button class="send-btn icon-btn" id="sendBtn"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 21l21-9L2 3v7l15 2l-15 2z"/></svg></button>
  </div>

  <div class="setup-modal" id="setupModal">
    <div class="setup-content">
      <h2>Setup API Connection</h2>
      <p style="margin-bottom: 16px; color: var(--muted); font-size: 14px;">
        Select your AI provider and enter your API key. Your key is stored locally only.
      </p>
      <select id="providerSelect" class="provider-select">
        <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
        <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
        <option value="groq">Groq (Llama 3.1, Mixtral)</option>
        <option value="google">Google (Gemini 1.5)</option>
        <option value="xai">xAI (Grok)</option>
        <option value="ollama">Ollama (Local - no key needed)</option>
      </select>
      <input type="password" id="apiKeyInput" placeholder="API Key (leave empty for Ollama)">
      <input type="text" id="baseUrlInput" placeholder="Custom Base URL (optional)">
      <button onclick="saveApiKey()">Save and Start</button>
    </div>
  </div>

  <script>
    const AGENT_CONFIG = ${JSON.stringify({
      name: agent.name || "AI Agent",
      goal: agent.goal || "",
      personality: agent.personality || "You are a helpful AI assistant.",
      tools: agent.tools || [],
      model: agent.modelId || "gpt-4o",
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 4096,
      voiceEnabled: agent.voiceEnabled || false,
    })};

    let config = JSON.parse(localStorage.getItem('agent_config') || 'null');
    let chatHistory = [];

    const PROVIDER_ENDPOINTS = {
      openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
      anthropic: { url: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20241022' },
      groq: { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-70b-versatile' },
      google: { url: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-1.5-flash' },
      xai: { url: 'https://api.x.ai/v1/chat/completions', model: 'grok-4' },
      ollama: { url: 'http://localhost:11434/api/chat', model: 'llama3.1' }
    };

    // Check config on load
    if (config && (config.apiKey || config.provider === 'ollama')) {
      document.getElementById('setupModal').style.display = 'none';
    }

    function saveApiKey() {
      const provider = document.getElementById('providerSelect').value;
      const key = document.getElementById('apiKeyInput').value.trim();
      const baseUrl = document.getElementById('baseUrlInput').value.trim();
      
      if (provider === 'ollama' || key) {
        config = { provider, apiKey: key, baseUrl: baseUrl || null };
        localStorage.setItem('agent_config', JSON.stringify(config));
        document.getElementById('setupModal').style.display = 'none';
      }
    }

    function addMessage(content, role) {
      const chat = document.getElementById('chat');
      const msg = document.createElement('div');
      msg.className = 'message ' + role;
      msg.textContent = content;
      chat.appendChild(msg);
      chat.scrollTop = chat.scrollHeight;
    }

    function showTyping() {
      const chat = document.getElementById('chat');
      const typing = document.createElement('div');
      typing.className = 'message assistant typing-indicator';
      typing.id = 'typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;
    }

    function hideTyping() {
      const el = document.getElementById('typing');
      if (el) el.remove();
    }

    async function sendMessage() {
      const input = document.getElementById('input');
      const message = input.value.trim();
      if (!message || !config) return;

      input.value = '';
      addMessage(message, 'user');
      chatHistory.push({ role: 'user', content: message });
      showTyping();

      try {
        const systemPrompt = AGENT_CONFIG.personality + '\\n\\nYour goal: ' + AGENT_CONFIG.goal;
        const providerConfig = PROVIDER_ENDPOINTS[config.provider] || PROVIDER_ENDPOINTS.openai;
        const baseUrl = config.baseUrl || providerConfig.url;
        
        let response, data;
        
        if (config.provider === 'anthropic') {
          response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model: providerConfig.model,
              system: systemPrompt,
              messages: chatHistory,
              max_tokens: AGENT_CONFIG.maxTokens,
            }),
          });
          data = await response.json();
          hideTyping();
          if (data.content && data.content[0]) {
            const reply = data.content[0].text;
            addMessage(reply, 'assistant');
            chatHistory.push({ role: 'assistant', content: reply });
            ${agent.voiceEnabled ? "speak(reply);" : ""}
          } else if (data.error) {
            addMessage('Error: ' + (data.error.message || JSON.stringify(data.error)), 'assistant');
          }
        } else if (config.provider === 'ollama') {
          response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: providerConfig.model,
              messages: [{ role: 'system', content: systemPrompt }, ...chatHistory],
              stream: false,
            }),
          });
          data = await response.json();
          hideTyping();
          if (data.message) {
            const reply = data.message.content;
            addMessage(reply, 'assistant');
            chatHistory.push({ role: 'assistant', content: reply });
            ${agent.voiceEnabled ? "speak(reply);" : ""}
          } else if (data.error) {
            addMessage('Error: ' + data.error, 'assistant');
          }
        } else if (config.provider === 'google') {
          const googleUrl = baseUrl + '/' + providerConfig.model + ':generateContent?key=' + config.apiKey;
          const googleContents = [];
          googleContents.push({ role: 'user', parts: [{ text: 'System: ' + systemPrompt }] });
          googleContents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
          for (const msg of chatHistory) {
            googleContents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
          }
          response = await fetch(googleUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: googleContents }),
          });
          data = await response.json();
          hideTyping();
          if (data.candidates && data.candidates[0]) {
            const reply = data.candidates[0].content.parts[0].text;
            addMessage(reply, 'assistant');
            chatHistory.push({ role: 'assistant', content: reply });
            ${agent.voiceEnabled ? "speak(reply);" : ""}
          } else if (data.error) {
            addMessage('Error: ' + data.error.message, 'assistant');
          }
        } else {
          // OpenAI-compatible (OpenAI, Groq, xAI)
          response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + config.apiKey,
            },
            body: JSON.stringify({
              model: providerConfig.model,
              messages: [{ role: 'system', content: systemPrompt }, ...chatHistory],
              temperature: AGENT_CONFIG.temperature,
              max_tokens: AGENT_CONFIG.maxTokens,
            }),
          });
          data = await response.json();
          hideTyping();
          if (data.choices && data.choices[0]) {
            const reply = data.choices[0].message.content;
            addMessage(reply, 'assistant');
            chatHistory.push({ role: 'assistant', content: reply });
            ${agent.voiceEnabled ? "speak(reply);" : ""}
          } else if (data.error) {
            addMessage('Error: ' + data.error.message, 'assistant');
          }
        }
      } catch (err) {
        hideTyping();
        addMessage('Connection error. Please try again.', 'assistant');
      }
    }

    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    document.getElementById('input').addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    ${agent.voiceEnabled ? `
    // Voice interaction
    let recognition;
    let isListening = false;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('input').value = transcript;
        sendMessage();
      };

      recognition.onend = () => {
        isListening = false;
        document.getElementById('voiceBtn').classList.remove('listening');
      };

      document.getElementById('voiceBtn').addEventListener('click', () => {
        if (isListening) {
          recognition.stop();
        } else {
          recognition.start();
          isListening = true;
          document.getElementById('voiceBtn').classList.add('listening');
        }
      });
    }

    function speak(text) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
      }
    }
    ` : ""}

    // Add welcome message
    setTimeout(() => {
      addMessage("Hi! I'm ${agent.name || "your AI assistant"}. ${agent.goal ? "I'm here to " + agent.goal.toLowerCase() + "." : "How can I help you today?"}", 'assistant');
    }, 500);

    // Service Worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js');
    }
  </script>
</body>
</html>`;

  zip.file("index.html", indexHtml);

  // manifest.json - using SVG icons which are widely supported
  const manifest = {
    name: agent.name || "AI Agent",
    short_name: agent.name?.slice(0, 12) || "Agent",
    description: agent.goal || "AI Assistant powered by AgentForge",
    start_url: ".",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // Service Worker
  const sw = `const CACHE_NAME = '${agentName}-v1';
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});`;
  zip.file("sw.js", sw);

  // Generate SVG icons
  const iconSvg192 = generateIconSvg(192, agent.avatar || "bot");
  const iconSvg512 = generateIconSvg(512, agent.avatar || "bot");
  zip.file("icon-192.svg", iconSvg192);
  zip.file("icon-512.svg", iconSvg512);

  // One-click run scripts
  const runBat = `@echo off
title ${agent.name || "AI Agent"}
echo.
echo  ========================================
echo   ${agent.name || "AI Agent"}
echo  ========================================
echo.
echo  Starting your AI agent...
echo.

:: Check for Python
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [OK] Python found
    start "" http://localhost:8000
    python -m http.server 8000
    goto :end
)

:: Check for Python3
where python3 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [OK] Python3 found
    start "" http://localhost:8000
    python3 -m http.server 8000
    goto :end
)

:: No Python - try opening directly
echo  [!] Python not found - opening directly in browser
echo  [!] For best experience, install Python from python.org
start "" "%~dp0index.html"

:end
`;
  zip.file("run.bat", runBat);

  const runSh = `#!/bin/bash
echo ""
echo "  ========================================"
echo "   ${agent.name || "AI Agent"}"
echo "  ========================================"
echo ""
echo "  Starting your AI agent..."
echo ""

# Get the directory where this script is located
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Check for Python
if command -v python3 &> /dev/null; then
    echo "  [OK] Python3 found"
    echo "  Opening browser..."
    sleep 1
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:8000" &
    elif command -v open &> /dev/null; then
        open "http://localhost:8000" &
    fi
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "  [OK] Python found"
    echo "  Opening browser..."
    sleep 1
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:8000" &
    elif command -v open &> /dev/null; then
        open "http://localhost:8000" &
    fi
    python -m http.server 8000
else
    echo "  [!] Python not found - opening file directly"
    echo "  [!] For best experience, install Python"
    if command -v xdg-open &> /dev/null; then
        xdg-open "index.html"
    elif command -v open &> /dev/null; then
        open "index.html"
    fi
fi
`;
  zip.file("run.sh", runSh);

  // README - simplified
  const readme = `# ${agent.name || "AI Agent"}

## Quick Start (One Click!)

**Windows:** Double-click \`run.bat\`
**Mac/Linux:** Double-click \`run.sh\` (or run \`./run.sh\` in terminal)

That's it! Your browser will open automatically.

## First Time Setup

1. Pick your AI provider (OpenAI, Anthropic, Groq, Google, xAI, or Ollama)
2. Enter your API key (Ollama is free - no key needed!)
3. Start chatting!

## Install as Desktop App

Once it opens in your browser, you can install it as a real app:
- Look for the install icon in your browser's address bar
- Or use your browser's menu: "Install app" / "Add to Home Screen"

## Free Option: Ollama

Don't want to pay for API keys? Use Ollama for free local AI:
1. Download from ollama.com
2. Run: ollama pull llama3.1
3. Select "Ollama" in the app - no API key needed!

---
Built with AgentForge
`;
  zip.file("README.md", readme);

  // Download
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${agentName}_pwa.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

function getAvatarSvgPath(avatar: string): string {
  const avatars: Record<string, string> = {
    bot: "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5",
    cat: "M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 21v1h2l2-2h4l2 2h2v-1l-1.5-2c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4M8.5 8A1.5 1.5 0 0 1 10 9.5a1.5 1.5 0 0 1-1.5 1.5A1.5 1.5 0 0 1 7 9.5A1.5 1.5 0 0 1 8.5 8m7 0a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 15.5 8m-5 5h3l-1.5 3z",
    dog: "M18 4c2 1 3 3 3 5s-1 4-2 5l1 6h-3l-1-5c-1 1-3 1-4 1s-3 0-4-1l-1 5H4l1-6c-1-1-2-3-2-5s1-4 3-5c0 0 0 3 3 3s4-3 4-3c0 0 1 3 4 3s4-3 4-3",
    bird: "M16 5a4 4 0 0 0-4 4 4 4 0 0 0 4 4h1.5l5.5 4v-2l-3-2h1a4 4 0 0 0 0-8h-5m0 2a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2m-1.5 0a.5.5 0 0 0-.5.5.5.5 0 0 0 .5.5.5.5 0 0 0 .5-.5.5.5 0 0 0-.5-.5M2 13l5 3 1-1 3 3 4-5-3-3-5 1z",
    rabbit: "M18 8a2 2 0 0 1-2-2c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2m-6-4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m-6 4c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2m6 4c2.76 0 5 2.24 5 5v5H7v-5c0-2.76 2.24-5 5-5m0-2a7 7 0 0 0-7 7v7h14v-7a7 7 0 0 0-7-7",
    fish: "M12 20L12.76 17C9.5 16.79 6.59 15.4 5.75 13.58C3.66 15.13 2 18 2 18C2 18 5.5 14.5 7.67 14.97C9 18 12 20 12 20M12 4C13.66 4 15.14 4.96 15.76 6.41L17.76 5.41C16.76 3.36 14.56 2 12 2C8.13 2 5 5.13 5 9S8.13 16 12 16C14.56 16 16.76 14.64 17.76 12.59L15.76 11.59C15.14 13.04 13.66 14 12 14C9.24 14 7 11.76 7 9S9.24 4 12 4M20.41 9L22 7.41C22 7.41 20.59 6 19 6S16 7.41 16 7.41L17.59 9C17.59 9 18.27 8 19 8S20.41 9 20.41 9",
    squirrel: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2m4.5 14c-1.25 0-2.25-1-2.25-2.25S15.25 11.5 16.5 11.5s2.25 1 2.25 2.25S17.75 16 16.5 16m-4-3.75c0-.69-.56-1.25-1.25-1.25s-1.25.56-1.25 1.25.56 1.25 1.25 1.25 1.25-.56 1.25-1.25M7.5 16c-1.25 0-2.25-1-2.25-2.25S6.25 11.5 7.5 11.5s2.25 1 2.25 2.25S8.75 16 7.5 16",
  };
  return avatars[avatar] || avatars.bot;
}

function generateIconSvg(size: number, avatar: string): string {
  const svgPath = getAvatarSvgPath(avatar);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="4" fill="#2563eb"/>
  <path d="${svgPath}" fill="white" transform="translate(2,2) scale(0.83)"/>
</svg>`;
}

export async function generateExportPackage(agent: Partial<AgentConfig>): Promise<void> {
  const zip = new JSZip();
  const agentName = agent.name?.replace(/\s+/g, "_").toLowerCase() || "my_agent";

  // Agent config JSON
  const configJson = JSON.stringify(
    {
      name: agent.name || "AI Assistant",
      goal: agent.goal || "",
      personality: agent.personality || "",
      tools: agent.tools || [],
      model: agent.modelId || "gpt-4o",
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 4096,
    },
    null,
    2
  );
  zip.file(`${agentName}/config.json`, configJson);

  // Python agent script
  const pythonScript = generatePythonScript(agent);
  zip.file(`${agentName}/agent.py`, pythonScript);

  // Requirements file
  const requirements = `langchain>=0.1.0
langchain-openai>=0.0.5
langchain-anthropic>=0.1.0
langchain-community>=0.0.20
python-dotenv>=1.0.0
`;
  zip.file(`${agentName}/requirements.txt`, requirements);

  // .env template
  const envTemplate = `# Add your API keys here
# Uncomment the one you want to use

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic (Claude)
# ANTHROPIC_API_KEY=your_anthropic_api_key_here

# For Ollama (local models), no API key needed
# Just make sure Ollama is running: ollama serve
`;
  zip.file(`${agentName}/.env.example`, envTemplate);

  // Run script for Windows
  const runBat = `@echo off
echo ========================================
echo   ${agent.name || "AI Agent"} - AgentForge
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python 3.8+ from python.org
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\\Scripts\\activate.bat

REM Install requirements
echo Installing dependencies...
pip install -r requirements.txt -q

REM Check for .env file
if not exist ".env" (
    echo.
    echo NOTE: Please copy .env.example to .env and add your API key
    copy .env.example .env
    echo.
)

REM Run the agent
echo.
echo Starting ${agent.name || "AI Agent"}...
echo Type 'exit' or 'quit' to stop.
echo.
python agent.py

pause
`;
  zip.file(`${agentName}/run.bat`, runBat);

  // Run script for Mac/Linux
  const runSh = `#!/bin/bash

echo "========================================"
echo "  ${agent.name || "AI Agent"} - AgentForge"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
echo "Installing dependencies..."
pip install -r requirements.txt -q

# Check for .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "NOTE: Please copy .env.example to .env and add your API key"
    cp .env.example .env
    echo ""
fi

# Run the agent
echo ""
echo "Starting ${agent.name || "AI Agent"}..."
echo "Type 'exit' or 'quit' to stop."
echo ""
python agent.py
`;
  zip.file(`${agentName}/run.sh`, runSh);

  // README
  const readme = generateReadme(agent);
  zip.file(`${agentName}/README.md`, readme);

  // Generate and download the zip
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${agentName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

function generatePythonScript(agent: Partial<AgentConfig>): string {
  const tools = agent.tools || [];
  const modelId = agent.modelId || "gpt-4o";
  const isOllama = modelId.includes("ollama") || modelId.includes("llama");
  const isAnthropic = modelId.includes("claude");

  return `"""
${agent.name || "AI Assistant"} - Generated by AgentForge
${agent.goal ? `Goal: ${agent.goal}` : ""}

Run this agent:
  1. Copy .env.example to .env and add your API key
  2. Run: python agent.py
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

${isOllama ? `
from langchain_community.llms import Ollama

# Initialize Ollama (make sure Ollama is running: ollama serve)
llm = Ollama(
    model="${modelId.replace("ollama-", "")}",
    temperature=${agent.temperature || 0.7}
)
` : isAnthropic ? `
from langchain_anthropic import ChatAnthropic

# Initialize Anthropic
llm = ChatAnthropic(
    model="${modelId}",
    temperature=${agent.temperature || 0.7},
    max_tokens=${agent.maxTokens || 4096}
)
` : `
from langchain_openai import ChatOpenAI

# Initialize OpenAI
llm = ChatOpenAI(
    model="${modelId}",
    temperature=${agent.temperature || 0.7},
    max_tokens=${agent.maxTokens || 4096}
)
`}

from langchain.agents import AgentExecutor, create_react_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import Tool
from langchain_core.messages import HumanMessage, AIMessage

# System prompt
SYSTEM_PROMPT = """${agent.personality || "You are a helpful AI assistant."}

Your primary goal: ${agent.goal || "Help users with their tasks."}

Be thorough, accurate, and helpful in all your responses.
When using tools, think step by step about what you need to accomplish.
"""

# Define tools
def web_search(query: str) -> str:
    """Search the web for information."""
    return f"[Web Search] Results for: {query}"

def code_interpreter(code: str) -> str:
    """Execute Python code and return the result."""
    try:
        # Note: In production, use a proper sandboxed environment
        exec_globals = {}
        exec(code, exec_globals)
        return f"Code executed successfully. Result: {exec_globals.get('result', 'No result variable defined')}"
    except Exception as e:
        return f"Error executing code: {str(e)}"

def file_reader(filepath: str) -> str:
    """Read contents of a file."""
    try:
        with open(filepath, 'r') as f:
            return f.read()[:2000]  # Limit output
    except Exception as e:
        return f"Error reading file: {str(e)}"

def calculator(expression: str) -> str:
    """Calculate a mathematical expression."""
    try:
        result = eval(expression)
        return f"Result: {result}"
    except Exception as e:
        return f"Error: {str(e)}"

# Map tool names to functions
TOOL_MAP = {
    "web_search": Tool(name="web_search", description="Search the web for information", func=web_search),
    "code_interpreter": Tool(name="code_interpreter", description="Execute Python code", func=code_interpreter),
    "file_reader": Tool(name="file_reader", description="Read contents of a file", func=file_reader),
    "calculator": Tool(name="calculator", description="Calculate mathematical expressions", func=calculator),
    "html_generator": Tool(name="html_generator", description="Generate HTML code", func=lambda x: f"[HTML] Generated: {x}"),
    "css_generator": Tool(name="css_generator", description="Generate CSS code", func=lambda x: f"[CSS] Generated: {x}"),
    "api_caller": Tool(name="api_caller", description="Make API requests", func=lambda x: f"[API] Called: {x}"),
    "image_analysis": Tool(name="image_analysis", description="Analyze images", func=lambda x: f"[Image] Analyzed: {x}"),
}

# Get tools for this agent
tools = [TOOL_MAP.get(t, Tool(name=t, description=f"Tool: {t}", func=lambda x: f"[{t}] {x}")) for t in ${JSON.stringify(tools)}]

# Create prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

# Create agent
if tools:
    from langchain.agents import create_openai_functions_agent
    agent = create_openai_functions_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)
else:
    agent_executor = None

def chat(message: str, chat_history: list = None) -> str:
    """Send a message to the agent and get a response."""
    if chat_history is None:
        chat_history = []
    
    if agent_executor:
        response = agent_executor.invoke({
            "input": message,
            "chat_history": chat_history
        })
        return response["output"]
    else:
        # Simple chat without tools
        messages = [("system", SYSTEM_PROMPT)]
        for h in chat_history:
            messages.append(h)
        messages.append(("human", message))
        
        from langchain_core.prompts import ChatPromptTemplate
        simple_prompt = ChatPromptTemplate.from_messages(messages)
        chain = simple_prompt | llm
        response = chain.invoke({})
        return response.content if hasattr(response, 'content') else str(response)

def main():
    """Main chat loop."""
    print(f"\\n🤖 {agent.name or "AI Assistant"} is ready!")
    print("=" * 50)
    print(f"Goal: ${agent.goal || "Help you with your tasks"}")
    print("=" * 50)
    print("\\nType your message and press Enter. Type 'exit' to quit.\\n")
    
    chat_history = []
    
    while True:
        try:
            user_input = input("You: ").strip()
            
            if not user_input:
                continue
                
            if user_input.lower() in ["exit", "quit", "bye"]:
                print("\\nGoodbye! 👋")
                break
            
            response = chat(user_input, chat_history)
            print(f"\\n🤖 Agent: {response}\\n")
            
            # Update chat history
            chat_history.append(("human", user_input))
            chat_history.append(("ai", response))
            
        except KeyboardInterrupt:
            print("\\n\\nGoodbye! 👋")
            break
        except Exception as e:
            print(f"\\nError: {str(e)}\\n")

if __name__ == "__main__":
    main()
`;
}

function generateReadme(agent: Partial<AgentConfig>): string {
  return `# ${agent.name || "AI Agent"}

> Generated by [AgentForge](https://agentforge.dev)

${agent.goal ? `**Goal:** ${agent.goal}` : ""}

${agent.personality ? `**Personality:** ${agent.personality}` : ""}

## Quick Start

### Option 1: One-Click Run (Easiest)

**Windows:**
\`\`\`
Double-click run.bat
\`\`\`

**Mac/Linux:**
\`\`\`bash
chmod +x run.sh
./run.sh
\`\`\`

### Option 2: Manual Setup

1. **Create a virtual environment:**
   \`\`\`bash
   python -m venv venv
   source venv/bin/activate  # Mac/Linux
   # or
   venv\\Scripts\\activate  # Windows
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

3. **Set up your API key:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env and add your API key
   \`\`\`

4. **Run the agent:**
   \`\`\`bash
   python agent.py
   \`\`\`

## Using Ollama (Free Local AI)

Want to run this agent completely free and offline? Use Ollama!

1. Install Ollama: https://ollama.ai
2. Pull a model: \`ollama pull llama3.1\`
3. Start Ollama: \`ollama serve\`
4. Update the model in \`agent.py\` to use Ollama

## Configuration

Edit \`config.json\` to customize:
- Agent name and goal
- Available tools
- Model settings (temperature, max tokens)

## Tools Available

${(agent.tools || []).map(t => `- **${t.replace(/_/g, " ")}**`).join("\n")}

## Need Help?

- Visit [AgentForge](https://agentforge.dev) to build more agents
- Check the [LangChain docs](https://python.langchain.com/) for advanced customization

---
Built with AgentForge - Zero platform fees, powered by your models.
`;
}
