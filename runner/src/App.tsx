import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { Send, Settings, User, Loader2, Sparkles, X, Zap, Volume2, VolumeX } from 'lucide-react';
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
  const [isListening, setIsListening] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
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

  const applyAgentConfig = (rawConfig: unknown) => {
    if (!rawConfig) return;

    try {
      const parsedConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
      const loadedConfig = { ...DEFAULT_CONFIG, ...(parsedConfig as Partial<AgentConfig>) };

      if (!loadedConfig.avatarColor) {
        loadedConfig.avatarColor = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
      }

      setConfig(loadedConfig);
      setApiKey(loadedConfig.apiKey || '');
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Hi! I'm ${loadedConfig.name}. ${loadedConfig.goal ? loadedConfig.goal : 'How can I help you today?'}`,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Failed to apply agent config', error);
    }
  };

  const handleDeepLink = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'agentforge:') return;

      const encodedConfig = parsedUrl.searchParams.get('config');
      if (!encodedConfig) return;

      const decoded = atob(decodeURIComponent(encodedConfig));
      applyAgentConfig(decoded);
    } catch (error) {
      console.error('Failed to parse deep link', error);
    }
  };

  useEffect(() => {
    let unlistenConfig: UnlistenFn | undefined;
    let unlistenDeepLink: UnlistenFn | undefined;

    (async () => {
      unlistenConfig = await listen<string>('agentforge://config', (event) => {
        applyAgentConfig(event.payload);
      });

      unlistenDeepLink = await listen<string>('agentforge://deeplink', (event) => {
        if (event.payload) {
          handleDeepLink(event.payload);
        }
      });
    })();

    return () => {
      unlistenConfig?.();
      unlistenDeepLink?.();
    };
  }, []);

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

  // Animated AI Avatar component
  const AgentAvatar = ({ size = 'md', animated = false }: { size?: 'sm' | 'md' | 'lg' | 'xl'; animated?: boolean }) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-12 h-12 text-base',
      lg: 'w-20 h-20 text-xl',
      xl: 'w-28 h-28 text-3xl',
    };
    
    const glowSizes = {
      sm: 'shadow-lg',
      md: 'shadow-xl',
      lg: 'shadow-2xl',
      xl: 'shadow-2xl',
    };
    
    if (config.avatar) {
      return (
        <div className={clsx('relative', animated && isLoading && 'animate-pulse')}>
          {animated && isLoading && (
            <div className={clsx(
              'absolute inset-0 rounded-full animate-ping opacity-30',
              'bg-gradient-to-br',
              config.avatarColor
            )} />
          )}
          <img 
            src={config.avatar} 
            alt={config.name}
            className={clsx(
              sizeClasses[size], 
              'rounded-full object-cover ring-2 ring-white/20',
              animated && 'transition-transform hover:scale-105'
            )}
          />
        </div>
      );
    }
    
    return (
      <div className={clsx('relative', animated && isLoading && 'animate-pulse')}>
        {/* Glow effect when thinking */}
        {animated && isLoading && (
          <>
            <div className={clsx(
              'absolute inset-[-4px] rounded-full animate-spin-slow opacity-50',
              'bg-gradient-to-r from-transparent via-white/30 to-transparent'
            )} />
            <div className={clsx(
              'absolute inset-[-8px] rounded-full animate-pulse opacity-30',
              'bg-gradient-to-br blur-md',
              config.avatarColor
            )} />
          </>
        )}
        <div className={clsx(
          sizeClasses[size],
          'rounded-full flex items-center justify-center font-bold text-white relative',
          'bg-gradient-to-br ring-2 ring-white/20',
          glowSizes[size],
          config.avatarColor || 'from-violet-500 to-purple-600',
          animated && 'transition-all duration-300 hover:scale-105 hover:ring-white/40'
        )}
        style={{
          boxShadow: animated ? `0 0 ${isLoading ? '30px' : '20px'} rgba(139, 92, 246, 0.3)` : undefined
        }}
        >
          {getInitials(config.name)}
          
          {/* Inner shine effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/20" />
        </div>
      </div>
    );
  };

  // Status indicator component
  const StatusBadge = () => (
    <div className={clsx(
      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium',
      backendStatus === 'connected' 
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
        : backendStatus === 'error'
        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    )}>
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full',
        backendStatus === 'connected' ? 'bg-emerald-400' : 
        backendStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
      )} />
      {backendStatus === 'connected' ? 'Online' : backendStatus === 'error' ? 'Offline' : 'Connecting'}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] text-white overflow-hidden">
      {/* Native-style draggable title bar */}
      <div 
        className="h-11 flex items-center justify-between px-4 bg-[#1a1a1a]/80 backdrop-blur-xl border-b border-white/5 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Traffic lights (macOS) */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 cursor-pointer transition-all active:scale-90" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 cursor-pointer transition-all active:scale-90" />
          <div className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 cursor-pointer transition-all active:scale-90" />
        </div>

        {/* Center - Agent name */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="text-sm font-medium text-white/80">{config.name}</span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-white/40" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-white/40" />
            )}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border-b border-white/5 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white/90">Settings</h3>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Provider</label>
              <select
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
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
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Model</label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                placeholder="llama3.2, gpt-4o..."
              />
            </div>
          </div>

          {config.provider !== 'ollama' && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                placeholder="Enter your API key"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={saveSettings}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 rounded-lg transition-all text-sm active:scale-[0.98]"
            >
              Save Changes
            </button>
            <button
              onClick={checkBackend}
              className="px-4 bg-white/5 hover:bg-white/10 text-white/70 font-medium py-2 rounded-lg transition-all text-sm active:scale-[0.98]"
            >
              Test
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.length === 0 ? (
          // Beautiful welcome screen with animated avatar
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            {/* Animated avatar with glow */}
            <div className="mb-6 relative">
              <AgentAvatar size="xl" animated />
              
              {/* Status indicator */}
              <div className="absolute -bottom-1 -right-1">
                <div className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center',
                  'bg-gradient-to-br from-emerald-400 to-emerald-600',
                  'ring-4 ring-[#1a1a1a] shadow-lg'
                )}>
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>

            {/* Agent info */}
            <h1 className="text-2xl font-bold text-white mb-1">{config.name}</h1>
            <p className="text-white/50 text-sm max-w-xs mb-4">{config.goal}</p>
            
            {/* Status badges */}
            <div className="flex items-center gap-2 mb-6">
              <StatusBadge />
              <div className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 text-white/40 border border-white/10">
                {config.provider} / {config.model}
              </div>
            </div>

            {/* Capabilities */}
            {config.tools.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-white/30">Capabilities</p>
                <div className="flex flex-wrap justify-center gap-1.5 max-w-sm">
                  {config.tools.slice(0, 6).map(tool => (
                    <span key={tool} className="text-[10px] px-2.5 py-1 bg-white/5 rounded-full text-white/50 border border-white/5">
                      {tool.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {config.tools.length > 6 && (
                    <span className="text-[10px] px-2.5 py-1 bg-white/5 rounded-full text-white/30">
                      +{config.tools.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick start hint */}
            <div className="mt-8 text-white/30 text-xs">
              Type a message to start chatting
            </div>
          </div>
        ) : (
          // Messages list
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  'flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
                  message.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                {/* Avatar */}
                {message.role === 'assistant' ? (
                  <div className="flex-shrink-0">
                    <AgentAvatar size="sm" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 ring-2 ring-white/10">
                    <User className="w-4 h-4" />
                  </div>
                )}
                
                {/* Message bubble */}
                <div className={clsx(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 shadow-lg',
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-br-md'
                    : 'bg-white/5 backdrop-blur text-white/90 rounded-bl-md border border-white/5'
                )}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-[9px] mt-1.5 opacity-40">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2">
                <div className="flex-shrink-0">
                  <AgentAvatar size="sm" animated />
                </div>
                <div className="bg-white/5 backdrop-blur rounded-2xl rounded-bl-md px-4 py-3 border border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-white/30">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Floating style */}
      <div className="p-4 bg-gradient-to-t from-[#0f0f0f] to-transparent">
        <div className={clsx(
          'flex items-end gap-3 bg-white/5 backdrop-blur-xl rounded-2xl px-4 py-2',
          'border border-white/10 transition-all duration-200',
          'focus-within:border-violet-500/30 focus-within:bg-white/[0.07]',
          'shadow-lg shadow-black/20'
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={backendStatus === 'connected' ? "Ask me anything..." : "Connecting..."}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder:text-white/30 max-h-[150px] py-1.5 text-white/90"
            rows={1}
            disabled={isLoading || backendStatus !== 'connected'}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || backendStatus !== 'connected'}
            className={clsx(
              'p-2.5 rounded-xl transition-all duration-200 flex-shrink-0',
              input.trim() && !isLoading && backendStatus === 'connected'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25 scale-100 active:scale-95'
                : 'bg-white/5 text-white/20 scale-95 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Connection status */}
        {backendStatus === 'error' && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-red-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Cannot connect. Make sure Ollama is running or configure an API key.
          </div>
        )}
      </div>
    </div>
  );
}
