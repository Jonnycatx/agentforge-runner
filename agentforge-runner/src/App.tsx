import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Settings, Moon, Sun, Loader2, AlertCircle, X, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentConfig {
  version: string;
  agent: {
    id: string;
    name: string;
    goal: string;
    personality: string;
    tools: string[];
    systemPrompt: string;
  };
  avatar: string;
  createdAt: string;
}

interface BackendInfo {
  port: number;
  config_path: string | null;
}

const PROVIDERS = [
  { id: "ollama", name: "Ollama (Local)", needsKey: false },
  { id: "openai", name: "OpenAI", needsKey: true },
  { id: "anthropic", name: "Anthropic", needsKey: true },
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendUrl, setBackendUrl] = useState("http://127.0.0.1:8765");
  const [pythonMissing, setPythonMissing] = useState(false);
  
  // Settings state
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [apiKey, setApiKey] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const checkBackendConnection = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${backendUrl}/health`, { 
        method: "GET",
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        setIsConnected(true);
        setError(null);
        return true;
      }
    } catch {
      // Connection failed
    }
    return false;
  }, [backendUrl]);

  const loadAgentConfig = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/config`);
      if (res.ok) {
        const config = await res.json();
        setAgentConfig(config);
      }
    } catch {
      setAgentConfig({
        version: "1.0",
        agent: {
          id: "default",
          name: "AI Assistant",
          goal: "Help users with their questions",
          personality: "Friendly and helpful",
          tools: [],
          systemPrompt: "You are a helpful AI assistant.",
        },
        avatar: "bot",
        createdAt: new Date().toISOString(),
      });
    }
  }, [backendUrl]);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add("dark");
    }

    // Get backend info from Tauri
    const initBackend = async () => {
      try {
        const info = await invoke<BackendInfo>("get_backend_info");
        if (info.port) {
          setBackendUrl(`http://127.0.0.1:${info.port}`);
        }
      } catch {
        // Running outside Tauri, use default
      }

      // Retry connection with backoff
      setIsConnecting(true);
      let connected = false;
      for (let i = 0; i < 10; i++) {
        connected = await checkBackendConnection();
        if (connected) break;
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      }
      
      setIsConnecting(false);
      if (connected) {
        loadAgentConfig();
      } else {
        setError("Could not connect to backend. Make sure Python is installed.");
      }
    };

    initBackend();

    // Listen for Tauri events
    const unlisten1 = listen("python-missing", () => {
      setPythonMissing(true);
      setError("Python 3 is not installed. Please install Python from python.org");
      setIsConnecting(false);
    });

    const unlisten2 = listen<string>("backend-error", (event) => {
      setError(event.payload);
      setIsConnecting(false);
    });

    return () => {
      unlisten1.then(fn => fn());
      unlisten2.then(fn => fn());
    };
  }, [checkBackendConnection, loadAgentConfig]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const saveModelConfig = async () => {
    try {
      await fetch(`${backendUrl}/config/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          api_key: apiKey || null,
        }),
      });
      setShowSettings(false);
    } catch (err) {
      setError("Failed to save settings");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage.content }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError("Failed to send message. Check backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">
              {agentConfig?.agent.name || "AI Assistant"}
            </h1>
            <div className="flex items-center gap-2">
              {isConnecting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Connecting...</span>
                </>
              ) : (
                <>
                  <span
                    className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isConnecting && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {agentConfig?.agent.name || "AI Assistant"}
            </h2>
            <p className="text-muted-foreground max-w-md">
              {agentConfig?.agent.personality || "Ready to help you with anything!"}
            </p>
            {!isConnected && (
              <p className="text-sm text-muted-foreground mt-4">
                Make sure Ollama is running or configure an API key in settings.
              </p>
            )}
          </div>
        )}

        {isConnecting && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Starting up...</p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            {pythonMissing && (
              <a 
                href="https://python.org/downloads" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline ml-2"
              >
                Download Python
              </a>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={!isConnected || isLoading || isConnecting}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || !isConnected || isConnecting}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Model Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Provider</label>
                  <div className="space-y-2">
                    {PROVIDERS.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          selectedProvider === provider.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <span>{provider.name}</span>
                        {selectedProvider === provider.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {PROVIDERS.find(p => p.id === selectedProvider)?.needsKey && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key..."
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                )}

                <button
                  onClick={saveModelConfig}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
