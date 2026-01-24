import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgentStore } from "@/lib/agent-store";
import { runInference, buildSystemPrompt, convertChatHistory } from "@/lib/inference";
import { 
  Send, 
  Bot, 
  User, 
  Settings, 
  Moon, 
  Sun, 
  Monitor,
  Mic,
  Paperclip,
  X,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Server,
  Sparkles,
  MessageSquare,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/theme-provider";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AgentConfig {
  id: string;
  name: string;
  goal: string;
  personality: string;
  tools: string[];
  modelId: string;
  providerId: string;
  systemPrompt?: string;
}

const STORAGE_KEY_PREFIX = "agentforge_chat_";

export default function RunAgent() {
  const [, params] = useRoute("/run-agent/:agentId");
  const agentId = params?.agentId || "default";
  
  const { 
    providers, 
    selectedProviderId, 
    selectedModelId,
    currentAgent,
    selectProvider,
    selectModel
  } = useAgentStore();
  
  const { theme, setTheme } = useTheme();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showModelConnect, setShowModelConnect] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const connectedProvider = providers.find(p => p.isConnected);
  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  const hasConnectedProvider = providers.some(p => p.isConnected);

  const agentConfig: AgentConfig = currentAgent ? {
    id: currentAgent.id || agentId,
    name: currentAgent.name || "AI Assistant",
    goal: currentAgent.goal || "Help users with their questions",
    personality: currentAgent.personality || "friendly and helpful",
    tools: currentAgent.tools || [],
    modelId: selectedModelId || "gpt-4o",
    providerId: selectedProviderId || "openai",
    systemPrompt: currentAgent.systemPrompt
  } : {
    id: agentId,
    name: "AI Assistant",
    goal: "Help users with their questions",
    personality: "friendly and helpful",
    tools: [],
    modelId: "gpt-4o",
    providerId: "openai"
  };

  useEffect(() => {
    document.title = `${agentConfig.name} | AgentForge`;
    
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${agentId}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load chat history");
      }
    }
  }, [agentId, agentConfig.name]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${agentId}`, JSON.stringify(messages));
    }
  }, [messages, agentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!hasConnectedProvider && messages.length === 0) {
      setShowModelConnect(true);
    }
  }, [hasConnectedProvider, messages.length]);

  const getProviderIcon = () => {
    if (!connectedProvider) return <Server className="w-3 h-3" />;
    switch (connectedProvider.id) {
      case "ollama": return <Server className="w-3 h-3" />;
      case "openai": return <Sparkles className="w-3 h-3" />;
      default: return <Zap className="w-3 h-3" />;
    }
  };

  const getModelLabel = () => {
    if (!connectedProvider) return "No model connected";
    const model = connectedProvider.models?.find(m => m.id === selectedModelId);
    return model?.name || selectedModelId || connectedProvider.name;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    
    if (!hasConnectedProvider || !selectedProvider || !selectedModelId) {
      setShowModelConnect(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const systemPrompt = agentConfig.systemPrompt || buildSystemPrompt({
        name: agentConfig.name,
        goal: agentConfig.goal,
        personality: agentConfig.personality,
        tools: agentConfig.tools
      });

      const chatHistory = convertChatHistory([...messages, userMessage], systemPrompt);
      
      const result = await runInference({
        provider: selectedProvider,
        model: selectedModelId,
        messages: chatHistory
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.success ? result.content : "I encountered an error. Please try again.",
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I encountered an error processing your request. Please check your model connection and try again.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${agentId}`);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(prev => prev + " " + transcript);
    };
    
    recognition.start();
  };

  const quickSuggestions = [
    "What can you help me with?",
    "Tell me about yourself",
    "Let's get started"
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Avatar className="w-10 h-10 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                <Bot className="w-5 h-5 text-primary" />
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div>
            <h1 className="font-semibold text-base" data-testid="text-agent-name">
              {agentConfig.name}
            </h1>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 gap-1">
                {getProviderIcon()}
                <span>{getModelLabel()}</span>
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            title="New Chat"
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-settings">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowModelConnect(true)}>
                <Zap className="w-4 h-4 mr-2" />
                Connect Model
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="w-4 h-4 mr-2" />
                Light Mode
                {theme === "light" && <Check className="w-4 h-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="w-4 h-4 mr-2" />
                Dark Mode
                {theme === "dark" && <Check className="w-4 h-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="w-4 h-4 mr-2" />
                System
                {theme === "system" && <Check className="w-4 h-4 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Avatar className="w-20 h-20 mb-6 border-2 border-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                    <Bot className="w-10 h-10 text-primary" />
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              
              <h2 className="text-xl font-semibold mb-2">
                Hi! I'm {agentConfig.name}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                {agentConfig.goal}
              </p>
              
              <div className="flex flex-wrap justify-center gap-2">
                {quickSuggestions.map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setInputValue(suggestion);
                      inputRef.current?.focus();
                    }}
                    data-testid={`button-suggestion-${i}`}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                      <Bot className="w-4 h-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`group relative max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                  
                  {message.role === "assistant" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => handleCopy(message.content, message.id)}
                      data-testid={`button-copy-${message.id}`}
                    >
                      {copied === message.id ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
                
                {message.role === "user" && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-muted">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
              data-testid="typing-indicator"
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                  <Bot className="w-4 h-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Thinking</span>
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t bg-background/80 backdrop-blur-sm p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2 border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="Attach file"
              data-testid="button-attach"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="border-0 bg-transparent focus-visible:ring-0 px-0"
              disabled={isTyping}
              data-testid="input-message"
            />
            
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 shrink-0 ${isListening ? "text-red-500" : ""}`}
              onClick={handleVoiceInput}
              title="Voice input"
              data-testid="button-voice"
            >
              <Mic className="w-4 h-4" />
            </Button>
            
            <Button
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-2">
            Powered by AgentForge
          </p>
        </div>
      </div>

      <Dialog open={showModelConnect} onOpenChange={setShowModelConnect}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Connect Your AI Model
            </DialogTitle>
            <DialogDescription>
              Choose a model provider to power your agent. Your API keys stay in your browser.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {providers.map((provider) => (
              <Card
                key={provider.id}
                className={`p-4 cursor-pointer transition-all hover-elevate ${
                  provider.isConnected ? "border-green-500/50 bg-green-500/5" : ""
                }`}
                onClick={() => {
                  selectProvider(provider.id);
                  if (provider.models?.[0]) {
                    selectModel(provider.models[0].id);
                  }
                  if (provider.isConnected) {
                    setShowModelConnect(false);
                  }
                }}
                data-testid={`provider-card-${provider.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {provider.id === "ollama" ? (
                        <Server className="w-5 h-5" />
                      ) : provider.id === "openai" ? (
                        <Sparkles className="w-5 h-5" />
                      ) : (
                        <Zap className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {provider.id === "ollama" ? "Free local inference" : "Cloud API"}
                      </p>
                    </div>
                  </div>
                  {provider.isConnected && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      Connected
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Need help? Set up <span className="text-primary">Ollama</span> for free local AI
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
