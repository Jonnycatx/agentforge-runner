import { useState, useEffect, useRef } from 'react';
import { Send, Settings, Bot, User, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AgentConfig {
  name: string;
  goal: string;
  personality: string;
  avatar?: string;
  provider: string;
  model: string;
  apiKey?: string;
  temperature: number;
  tools: string[];
}

const DEFAULT_CONFIG: AgentConfig = {
  name: 'AI Assistant',
  goal: 'Help users with various tasks',
  personality: 'You are a helpful, friendly AI assistant.',
  provider: 'ollama',
  model: 'llama3.2',
  temperature: 0.7,
  tools: [],
};

const BACKEND_URL = 'http://127.0.0.1:8765';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [apiKey, setApiKey] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkBackend();
    loadConfig();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkBackend = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
      }
    } catch {
      setBackendStatus('error');
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig({ ...DEFAULT_CONFIG, ...data });
      }
    } catch {
      console.log('Using default config');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          config: { ...config, apiKey },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error connecting to the AI. Please check your settings.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const saveSettings = async () => {
    try {
      await fetch(`${BACKEND_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, apiKey }),
      });
      setShowSettings(false);
    } catch {
      console.error('Failed to save settings');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white" data-testid="app-container">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800" data-testid="header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center" data-testid="agent-avatar">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold" data-testid="agent-name">{config.name}</h1>
            <div className="flex items-center gap-1 text-xs">
              {backendStatus === 'connected' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                  <span className="text-green-400" data-testid="status-connected">Connected</span>
                </>
              ) : backendStatus === 'error' ? (
                <>
                  <AlertCircle className="w-3 h-3 text-red-400" />
                  <span className="text-red-400" data-testid="status-error">Not connected</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
                  <span className="text-yellow-400" data-testid="status-checking">Checking...</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          data-testid="button-settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-gray-800 bg-gray-800/50 space-y-4" data-testid="settings-panel">
          <div>
            <label className="block text-sm font-medium mb-1">Provider</label>
            <select
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
              data-testid="select-provider"
            >
              <option value="ollama">Ollama (Local)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="google">Google AI</option>
              <option value="xai">xAI (Grok)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., llama3.2, gpt-4o, claude-3-sonnet"
              data-testid="input-model"
            />
          </div>

          {config.provider !== 'ollama' && (
            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                placeholder="Enter your API key"
                data-testid="input-api-key"
              />
            </div>
          )}

          <button
            onClick={saveSettings}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
            data-testid="button-save-settings"
          >
            Save Settings
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-container">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8" data-testid="welcome-message">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{config.name}</p>
            <p className="text-sm mt-1">{config.personality}</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              'flex gap-3',
              message.role === 'user' ? 'flex-row-reverse' : ''
            )}
            data-testid={`message-${message.role}-${message.id}`}
          >
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                message.role === 'user'
                  ? 'bg-blue-600'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600'
              )}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div
              className={clsx(
                'max-w-[80%] rounded-2xl px-4 py-2',
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3" data-testid="loading-indicator">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800" data-testid="input-container">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors"
            rows={1}
            disabled={isLoading || backendStatus !== 'connected'}
            data-testid="input-message"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || backendStatus !== 'connected'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl px-4 transition-colors"
            data-testid="button-send"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
