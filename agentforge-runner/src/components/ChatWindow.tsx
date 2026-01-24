import { useState, useEffect, useCallback } from "react";
import { Settings, Moon, Sun, Loader2, AlertCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { Avatar } from "./Avatar";
import { MessageList, Message } from "./MessageList";
import { InputBar } from "./InputBar";
import { SetupDialog } from "./SetupDialog";
import { api, AgentConfig } from "../lib/api";

interface ChatWindowProps {
  configPath?: string;
}

export function ChatWindow({ configPath }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pythonMissing, setPythonMissing] = useState(false);

  const initializeBackend = useCallback(async () => {
    setIsConnecting(true);
    
    const connected = await api.waitForBackend(15);
    
    if (!connected) {
      setError("Could not connect to backend. Make sure Python is installed.");
      setIsConnecting(false);
      return;
    }

    setIsConnected(true);
    setError(null);

    // Load config if path provided
    if (configPath) {
      try {
        const config = await api.loadConfig(configPath);
        setAgent(config);
      } catch {
        // Try getting default config
        const config = await api.getConfig();
        if (config) setAgent(config);
      }
    } else {
      const config = await api.getConfig();
      if (config) setAgent(config);
    }

    setIsConnecting(false);

    // Show setup if no provider configured
    if (!agent?.provider) {
      setShowSetup(true);
    }
  }, [configPath, agent?.provider]);

  useEffect(() => {
    // Theme detection
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add("dark");
    }

    initializeBackend();

    // Listen for Tauri events
    let cleanup1: (() => void) | undefined;
    let cleanup2: (() => void) | undefined;

    listen("python-missing", () => {
      setPythonMissing(true);
      setError("Python 3 is not installed. Please install Python from python.org");
      setIsConnecting(false);
    }).then((fn) => {
      cleanup1 = fn;
    });

    listen<string>("backend-error", (event) => {
      setError(event.payload);
      setIsConnecting(false);
    }).then((fn) => {
      cleanup2 = fn;
    });

    return () => {
      cleanup1?.();
      cleanup2?.();
    };
  }, [initializeBackend]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleSetupComplete = async (provider: string, apiKey?: string) => {
    try {
      await api.setProvider(provider, apiKey);
      setShowSetup(false);
      
      // Refresh config
      const config = await api.getConfig();
      if (config) setAgent(config);
    } catch (err) {
      setError("Failed to configure provider");
    }
  };

  const handleSendMessage = async (content: string) => {
    if (isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.chat(content);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError("Failed to send message. Check your AI connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Avatar src={agent?.avatar} name={agent?.name} size="md" />
          <div>
            <h1 className="font-semibold text-foreground">
              {agent?.name || "AI Assistant"}
            </h1>
            <div className="flex items-center gap-2">
              {isConnecting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Connecting...</span>
                </>
              ) : (
                <>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? `${agent?.provider || "Ready"}` : "Disconnected"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSetup(true)}
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
            {isDark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>
      </header>

      {/* Welcome state or messages */}
      {messages.length === 0 && !isConnecting ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <Avatar src={agent?.avatar} name={agent?.name} size="lg" />
          <h2 className="text-xl font-semibold mt-4 mb-2">{agent?.name || "AI Assistant"}</h2>
          <p className="text-muted-foreground max-w-md">{agent?.personality || "Ready to help you!"}</p>
        </div>
      ) : isConnecting ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Starting up...</p>
        </div>
      ) : (
        <MessageList messages={messages} isLoading={isLoading} avatarSrc={agent?.avatar} />
      )}

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            {pythonMissing && (
              <a href="https://python.org/downloads" target="_blank" rel="noopener noreferrer" className="underline ml-2">
                Download Python
              </a>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <InputBar
        onSend={handleSendMessage}
        disabled={!isConnected || isConnecting}
        isLoading={isLoading}
      />

      {/* Setup dialog */}
      <AnimatePresence>
        {showSetup && (
          <SetupDialog
            agentName={agent?.name}
            avatarSrc={agent?.avatar}
            onComplete={handleSetupComplete}
            onClose={() => setShowSetup(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
