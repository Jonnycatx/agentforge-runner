import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
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
const SETTINGS_STORAGE_KEY = 'agentforge:settings';

type StoredSettings = {
  provider?: string;
  model?: string;
  models?: Record<string, string>;
  temperature?: number;
  apiKey?: string;
  apiKeys?: Record<string, string>;
};

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o1', 'o1-mini'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
  xai: ['grok-4', 'grok-4-latest', 'grok-3', 'grok-3-latest', 'grok-2-latest'],
  ollama: ['llama3.2', 'llama3.2:1b', 'llama3.1', 'qwen2.5', 'deepseek-r1'],
};
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
  const [providerStatus, setProviderStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [apiKey, setApiKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const promptedMissingKeyRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const missingApiKey = config.provider !== 'ollama' && !(apiKey || '').trim();

  const readStoredSettings = (): StoredSettings => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as StoredSettings;
      return {
        provider: typeof parsed.provider === 'string' ? parsed.provider : undefined,
        model: typeof parsed.model === 'string' ? parsed.model : undefined,
        models: typeof parsed.models === 'object' && parsed.models ? parsed.models : undefined,
        temperature: typeof parsed.temperature === 'number' ? parsed.temperature : undefined,
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : undefined,
        apiKeys: typeof parsed.apiKeys === 'object' && parsed.apiKeys ? parsed.apiKeys : undefined,
      };
    } catch {
      return {};
    }
  };

  const writeStoredSettings = (settings: StoredSettings) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors (e.g., private mode)
    }
  };

  const mergeConfigWithSettings = (incoming: Partial<AgentConfig>): AgentConfig => {
    const stored = readStoredSettings();
    const resolvedProvider = incoming.provider ?? stored.provider ?? DEFAULT_CONFIG.provider;
    const storedModel = stored.models?.[resolvedProvider] || stored.model;
    const storedApiKey =
      stored.apiKeys?.[resolvedProvider] ||
      stored.apiKey ||
      '';
    const incomingApiKey = (incoming.apiKey || '').trim();
    const mergedApiKey = incomingApiKey || storedApiKey || '';
    const merged: AgentConfig = {
      ...DEFAULT_CONFIG,
      ...incoming,
      provider: resolvedProvider,
      model: incoming.model ?? storedModel ?? DEFAULT_CONFIG.model,
      temperature: incoming.temperature ?? stored.temperature ?? DEFAULT_CONFIG.temperature,
      apiKey: mergedApiKey,
      tools: incoming.tools ?? DEFAULT_CONFIG.tools,
    };

    if (!merged.avatarColor) {
      merged.avatarColor = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
    }

    return merged;
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (missingApiKey && !showSettings && !promptedMissingKeyRef.current) {
      setShowSettings(true);
      promptedMissingKeyRef.current = true;
    }
  }, [missingApiKey, showSettings]);

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

  const buildSystemPrompt = () => {
    let content = config.personality || 'You are a helpful assistant.';
    if (config.goal) {
      content += `\n\nYour goal: ${config.goal}`;
    }
    if (config.tools?.length) {
      content += '\n\nYou have access to the following tools:\n';
      content += config.tools.map((tool) => `- ${tool}`).join('\n');
    }
    return content;
  };

  const buildInferenceMessages = (userContent: string) => {
    const system = { role: 'system' as const, content: buildSystemPrompt() };
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
    return [system, ...history, { role: 'user' as const, content: userContent }];
  };

  const callOpenAICompatible = async (url: string, apiKeyValue: string, model: string, inferenceMessages: any[]) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKeyValue}`,
      },
      body: JSON.stringify({
        model,
        messages: inferenceMessages,
        temperature: config.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error (${response.status})`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
  };

  const callAnthropic = async (apiKeyValue: string, model: string, inferenceMessages: any[]) => {
    const systemMessage = inferenceMessages.find((m: any) => m.role === 'system');
    const chatMessages = inferenceMessages.filter((m: any) => m.role !== 'system');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyValue,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: config.temperature ?? 0.7,
        system: systemMessage?.content || '',
        messages: chatMessages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error (${response.status})`);
    }

    const data = await response.json();
    return data?.content?.[0]?.text || '';
  };

  const callGoogle = async (apiKeyValue: string, model: string, inferenceMessages: any[]) => {
    const systemMessage = inferenceMessages.find((m: any) => m.role === 'system');
    const chatMessages = inferenceMessages.filter((m: any) => m.role !== 'system');
    const contents = chatMessages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeyValue}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: 4096,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error (${response.status})`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  };

  const callOllama = async (model: string, inferenceMessages: any[]) => {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: inferenceMessages.map((m: any) => ({ role: m.role, content: m.content })),
        stream: false,
        options: { temperature: config.temperature ?? 0.7 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Ollama error');
    }

    const data = await response.json();
    return data?.message?.content || '';
  };

  const runInferenceDirect = async (userContent: string) => {
    const inferenceMessages = buildInferenceMessages(userContent);
    const key = (apiKey || '').trim();
    const model = config.model;

    if (config.provider !== 'ollama' && !key) {
      throw new Error('Missing API key.');
    }

    switch (config.provider) {
      case 'ollama':
        return await callOllama(model, inferenceMessages);
      case 'openai':
        return await callOpenAICompatible('https://api.openai.com/v1/chat/completions', key, model, inferenceMessages);
      case 'groq':
        return await callOpenAICompatible('https://api.groq.com/openai/v1/chat/completions', key, model, inferenceMessages);
      case 'xai':
        return await callOpenAICompatible('https://api.x.ai/v1/chat/completions', key, model, inferenceMessages);
      case 'anthropic':
        return await callAnthropic(key, model, inferenceMessages);
      case 'google':
        return await callGoogle(key, model, inferenceMessages);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  };

  const testProviderConnection = async () => {
    if (config.provider !== 'ollama' && !(apiKey || '').trim()) {
      setTestStatus('error');
      setTestMessage('Missing API key.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');
    setProviderStatus('checking');

    try {
      if (config.provider === 'ollama') {
        await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(5000) });
        setTestStatus('success');
        setTestMessage('Ollama is running.');
        setProviderStatus('connected');
        return;
      }

      const model = config.model;
      const key = (apiKey || '').trim();
      if (!key) {
        throw new Error('Missing API key.');
      }

      if (config.provider === 'openai') {
        await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(10000),
        });
      } else if (config.provider === 'groq') {
        await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(10000),
        });
      } else if (config.provider === 'xai') {
        await fetch('https://api.x.ai/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(10000),
        });
      } else if (config.provider === 'anthropic') {
        await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          signal: AbortSignal.timeout(10000),
        });
      } else if (config.provider === 'google') {
        await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
          signal: AbortSignal.timeout(10000),
        });
      } else {
        throw new Error(`Unsupported provider: ${config.provider}`);
      }

      setTestStatus('success');
      setTestMessage(`Connected to ${config.provider}.`);
      setProviderStatus('connected');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : `Failed to connect to ${config.provider}.`;
      setTestStatus('error');
      setTestMessage(errorMsg);
      setProviderStatus('error');
    }
  };

  const refreshSettingsFromStorage = () => {
    const stored = readStoredSettings();
    const provider = stored.provider ?? config.provider;
    const storedModel = stored.models?.[provider] || stored.model || config.model;
    const storedKey = stored.apiKeys?.[provider] || stored.apiKey || '';
    const nextModel = resolveProviderModel(provider, storedModel, config.model);

    setConfig((prev) => ({
      ...prev,
      provider,
      model: nextModel,
    }));
    setApiKey(storedKey);
    setTestStatus('idle');
    setTestMessage('');
    setProviderStatus('idle');
  };

  const loadConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/config`);
      if (response.ok) {
        const data = await response.json();
        const loadedConfig = mergeConfigWithSettings(data);
        setConfig(loadedConfig);
        setApiKey(loadedConfig.apiKey || '');
        writeStoredSettings({
          provider: loadedConfig.provider,
          model: loadedConfig.model,
          temperature: loadedConfig.temperature,
          models: {
            ...(readStoredSettings().models || {}),
            ...(loadedConfig.model ? { [loadedConfig.provider]: loadedConfig.model } : {}),
          },
          apiKeys: {
            ...(readStoredSettings().apiKeys || {}),
            ...(loadedConfig.apiKey ? { [loadedConfig.provider]: loadedConfig.apiKey } : {}),
          },
          apiKey: loadedConfig.apiKey || undefined,
        });
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
      const loadedConfig = mergeConfigWithSettings(parsedConfig as Partial<AgentConfig>);
      setConfig(loadedConfig);
      setApiKey(loadedConfig.apiKey || '');
      writeStoredSettings({
        provider: loadedConfig.provider,
        model: loadedConfig.model,
        temperature: loadedConfig.temperature,
        models: {
          ...(readStoredSettings().models || {}),
          ...(loadedConfig.model ? { [loadedConfig.provider]: loadedConfig.model } : {}),
        },
        apiKeys: {
          ...(readStoredSettings().apiKeys || {}),
          ...(loadedConfig.apiKey ? { [loadedConfig.provider]: loadedConfig.apiKey } : {}),
        },
        apiKey: loadedConfig.apiKey || undefined,
      });
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
    let unlistenOpenUrl: UnlistenFn | undefined;

    (async () => {
      unlistenConfig = await listen<string>('agentforge://config', (event) => {
        applyAgentConfig(event.payload);
      });

      // Legacy deep-link event (Rust emitter)
      unlistenDeepLink = await listen<string>('agentforge://deeplink', (event) => {
        if (event.payload) {
          handleDeepLink(event.payload);
        }
      });

      // Deep-link plugin events (agentforge://)
      try {
        const currentUrls = await getCurrent();
        currentUrls?.forEach((url) => handleDeepLink(url));
      } catch (error) {
        console.error('Failed to read current deep link', error);
      }

      try {
        unlistenOpenUrl = await onOpenUrl((urls) => {
          urls.forEach((url) => handleDeepLink(url));
        });
      } catch (error) {
        console.error('Failed to listen for deep links', error);
      }
    })();

    return () => {
      unlistenConfig?.();
      unlistenDeepLink?.();
      unlistenOpenUrl?.();
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
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: await runInferenceDirect(userMessage.content),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setProviderStatus('connected');
    } catch (error) {
      const rawError = error instanceof Error ? error.message : 'Connection failed';
      const errorMsg = rawError.includes('CERTIFICATE_VERIFY_FAILED')
        ? 'SSL certificates are missing. Run: /Applications/Python 3.x/Install Certificates.command'
        : rawError;
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ ${errorMsg}\n\nPlease check your connection and settings.`,
        timestamp: new Date(),
      };
      setTestStatus('error');
      setTestMessage(errorMsg);
      setProviderStatus('error');
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderModels = (provider: string) => PROVIDER_MODELS[provider] || [];

  const resolveProviderModel = (provider: string, storedModel?: string, currentModel?: string) => {
    const models = getProviderModels(provider);
    if (storedModel) return storedModel;
    if (currentModel && (models.length === 0 || models.includes(currentModel))) return currentModel;
    return models[0] || DEFAULT_CONFIG.model;
  };

  const handleProviderChange = (provider: string) => {
    const stored = readStoredSettings();
    const storedKey = stored.apiKeys?.[provider] || '';
    const storedModel = stored.models?.[provider];
    const nextModel = resolveProviderModel(provider, storedModel, config.model);
    setConfig({ ...config, provider, model: nextModel });
    setApiKey(storedKey);
    setTestStatus('idle');
    setTestMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const saveSettings = async () => {
    try {
      const updatedConfig = { ...config, apiKey };
      writeStoredSettings({
        provider: updatedConfig.provider,
        model: updatedConfig.model,
        temperature: updatedConfig.temperature,
        models: {
          ...(readStoredSettings().models || {}),
          ...(updatedConfig.model ? { [updatedConfig.provider]: updatedConfig.model } : {}),
        },
        apiKeys: {
          ...(readStoredSettings().apiKeys || {}),
          ...(apiKey ? { [updatedConfig.provider]: apiKey } : {}),
        },
        apiKey,
      });
      await fetch(`${BACKEND_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      setConfig(updatedConfig);
      setShowSettings(false);
      setTestStatus('idle');
      setTestMessage('');
      setProviderStatus('idle');
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
      providerStatus === 'connected' 
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
        : providerStatus === 'error'
        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    )}>
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full',
        providerStatus === 'connected' ? 'bg-emerald-400' : 
        providerStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
      )} />
      {providerStatus === 'connected' ? 'Online' : providerStatus === 'error' ? 'Offline' : 'Ready'}
    </div>
  );

  const providerModels = getProviderModels(config.provider);
  const modelIsCustom = providerModels.length > 0 && !providerModels.includes(config.model);
  const modelSelectValue = modelIsCustom
    ? '__custom__'
    : (config.model || providerModels[0] || '');

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
                onChange={(e) => handleProviderChange(e.target.value)}
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
              {providerModels.length > 0 ? (
                <>
                  <select
                    value={modelSelectValue}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setConfig({ ...config, model: '' });
                        return;
                      }
                      setConfig({ ...config, model: e.target.value });
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                  >
                    {providerModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                    <option value="__custom__">Custom model...</option>
                  </select>
                  {modelIsCustom && (
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                      placeholder="Enter custom model id"
                    />
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                  placeholder="Model id"
                />
              )}
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
              onClick={refreshSettingsFromStorage}
              className="px-3 bg-white/5 hover:bg-white/10 text-white/70 font-medium py-2 rounded-lg transition-all text-sm active:scale-[0.98]"
            >
              Refresh
            </button>
            <button
              onClick={testProviderConnection}
              className="px-4 bg-white/5 hover:bg-white/10 text-white/70 font-medium py-2 rounded-lg transition-all text-sm active:scale-[0.98] disabled:opacity-60"
              disabled={testStatus === 'testing'}
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test'}
            </button>
          </div>

          {testStatus !== 'idle' && (
            <div
              className={clsx(
                'text-xs px-3 py-2 rounded-lg border',
                testStatus === 'success'
                  ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                  : testStatus === 'error'
                    ? 'text-red-300 border-red-500/30 bg-red-500/10'
                    : 'text-white/60 border-white/10 bg-white/5'
              )}
            >
              {testMessage || (testStatus === 'testing' ? 'Testing connection...' : '')}
            </div>
          )}
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
            placeholder="Ask me anything..."
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder:text-white/30 max-h-[150px] py-1.5 text-white/90"
            rows={1}
            disabled={isLoading || missingApiKey}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || missingApiKey}
            className={clsx(
              'p-2.5 rounded-xl transition-all duration-200 flex-shrink-0',
              input.trim() && !isLoading && !missingApiKey
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
        {missingApiKey && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-amber-300/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Missing API key for {config.provider}. Open settings to add it.
            <button
              onClick={() => setShowSettings(true)}
              className="ml-2 underline underline-offset-2 text-amber-200 hover:text-amber-100"
            >
              Open settings
            </button>
          </div>
        )}

        {providerStatus === 'error' && testMessage && !missingApiKey && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-red-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            {testMessage}
          </div>
        )}
      </div>
    </div>
  );
}
