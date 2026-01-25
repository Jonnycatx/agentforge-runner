import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Send, Settings, Bot, User, Loader2, AlertCircle, CheckCircle2,
  Sparkles, Mic, Image, Paperclip, X, ChevronDown, MoreHorizontal
} from 'lucide-react';
import { clsx } from 'clsx';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AgentConfig {
  id?: string;
  name: string;
  goal: string;
  personality: string;
  avatar?: string;
  avatarColor?: string;
  provider: string;
  model: string;
  apiKey?: string;
  temperature: number;
  tools: string[];
}

const DEFAULT_CONFIG: AgentConfig = {
  name: 'AI Assistant',
  goal: 'Help you with anything you need',
  personality: 'You are a helpful, friendly AI assistant.',
  avatarColor: 'from-violet-500 to-purple-600',
  provider: 'ollama',
  model: 'llama3.2',
  temperature: 0.7,
  tools: [],
};

const BACKEND_URL = 'http://127.0.0.1:8765';

// Avatar gradient presets
const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-blue-500',
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [apiKey, setApiKey] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    checkBackend();
    loadConfig();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const checkBackend = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(5000) });
      setBackendStatus(response.ok ? 'connected' : 'error');
    } catch {
      setBackendStatus('error');
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/config`);
      if (response.ok) {
        const data = await response.json();
        const loadedConfig = { ...DEFAULT_CONFIG, ...data };
        // Assign a random gradient if none specified
        if (!loadedConfig.avatarColor) {
          loadedConfig.avatarColor = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
        }
        setConfig(loadedConfig);
        // Add welcome message
        if (data.name) {
          setMessages([{
            id: '1',
            role: 'assistant',
            content: `Hi! I'm ${data.name}. ${data.goal ? data.goal : 'How can I help you today?'}`,
            timestamp: new Date(),
          }]);
        }
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
        signal: AbortSignal.timeout(60000),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ ${errorMsg}\n\nPlease check your connection and settings.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
      checkBackend();
    } catch {
      console.error('Failed to save');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  // Avatar component
  const AgentAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-12 h-12 text-lg',
      lg: 'w-20 h-20 text-2xl',
    };
    
    if (config.avatar) {
      return (
        <img 
          src={config.avatar} 
          alt={config.name}
          className={clsx(sizeClasses[size], 'rounded-full object-cover ring-2 ring-white/10')}
        />
      );
    }
    
    return (
      <div className={clsx(
        sizeClasses[size],
        'rounded-full flex items-center justify-center font-semibold text-white',
        'bg-gradient-to-br shadow-lg ring-2 ring-white/10',
        config.avatarColor || 'from-violet-500 to-purple-600'
      )}>
        {getInitials(config.name)}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#1a1a1a] text-white overflow-hidden">
      {/* macOS-style draggable title bar */}
      <div 
        className="h-12 flex items-center justify-center px-4 bg-[#242424] border-b border-[#333] select-none"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Traffic lights space (left) */}
        <div className="absolute left-4 flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/80 cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 cursor-pointer" />
        </div>

        {/* Center title */}
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
            'bg-gradient-to-br',
            config.avatarColor || 'from-violet-500 to-purple-600'
          )}>
            {getInitials(config.name)}
          </div>
          <span className="text-sm font-medium text-gray-200">{config.name}</span>
          <span className={clsx(
            'w-2 h-2 rounded-full',
            backendStatus === 'connected' ? 'bg-green-400' : 
            backendStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
          )} />
        </div>

        {/* Settings button (right) */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute right-4 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <Settings className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Settings Panel (slide down) */}
      {showSettings && (
        <div className="bg-[#1f1f1f] border-b border-[#333] p-4 space-y-4 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-200">Settings</h3>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-white/5 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Provider</label>
              <select
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                className="w-full bg-[#2a2a2a] border border-[#444] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
              <label className="block text-xs text-gray-500 mb-1.5">Model</label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full bg-[#2a2a2a] border border-[#444] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="llama3.2, gpt-4o..."
              />
            </div>
          </div>

          {config.provider !== 'ollama' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-[#444] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Enter your API key"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={saveSettings}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors text-sm"
            >
              Save Changes
            </button>
            <button
              onClick={checkBackend}
              className="px-4 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 font-medium py-2 rounded-lg transition-colors text-sm"
            >
              Test
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          // Beautiful welcome screen
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-6 relative">
              <AgentAvatar size="lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#1a1a1a] flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{config.name}</h1>
            <p className="text-gray-400 max-w-sm mb-6">{config.goal}</p>
            
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className={clsx(
                'px-2 py-1 rounded-full',
                backendStatus === 'connected' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              )}>
                {backendStatus === 'connected' ? '● Connected' : '○ Not connected'}
              </span>
              <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-400">
                {config.provider} / {config.model}
              </span>
            </div>

            {config.tools.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
                {config.tools.slice(0, 6).map(tool => (
                  <span key={tool} className="text-xs px-3 py-1.5 bg-[#2a2a2a] rounded-full text-gray-400">
                    {tool.replace(/_/g, ' ')}
                  </span>
                ))}
                {config.tools.length > 6 && (
                  <span className="text-xs px-3 py-1.5 bg-[#2a2a2a] rounded-full text-gray-500">
                    +{config.tools.length - 6} more
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          // Messages list
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                {/* Avatar */}
                {message.role === 'assistant' ? (
                  <AgentAvatar size="sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
                
                {/* Message bubble */}
                <div className={clsx(
                  'max-w-[75%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-[#2a2a2a] text-gray-100 rounded-bl-md'
                )}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-[10px] mt-1.5 opacity-50">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <AgentAvatar size="sm" />
                <div className="bg-[#2a2a2a] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - macOS style */}
      <div className="p-4 bg-[#1f1f1f] border-t border-[#333]">
        <div className="flex items-end gap-3 bg-[#2a2a2a] rounded-2xl px-4 py-2 border border-[#3a3a3a] focus-within:border-blue-500/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={backendStatus === 'connected' ? "Message..." : "Connect to start chatting..."}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder:text-gray-500 max-h-[150px] py-1.5"
            rows={1}
            disabled={isLoading || backendStatus !== 'connected'}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || backendStatus !== 'connected'}
            className={clsx(
              'p-2 rounded-xl transition-all flex-shrink-0',
              input.trim() && !isLoading && backendStatus === 'connected'
                ? 'bg-blue-600 hover:bg-blue-700 text-white scale-100'
                : 'bg-gray-700 text-gray-500 scale-95 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Connection error hint */}
        {backendStatus === 'error' && (
          <p className="text-xs text-red-400 mt-2 text-center">
            Cannot connect. Make sure Ollama is running or add an API key in Settings.
          </p>
        )}
      </div>
    </div>
  );
}
