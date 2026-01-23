import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAgentStore } from "@/lib/agent-store";
import { runInference, buildSystemPrompt, convertChatHistory } from "@/lib/inference";
import type { ChatMessage } from "@shared/schema";
import { Send, Bot, User, Loader2, AlertCircle, Zap, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TestMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function AgentTestPane() {
  const { builderState, providers, selectedProviderId, selectedModelId } = useAgentStore();
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentAgent = builderState.currentAgent;

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const hasConnectedProvider = selectedProvider?.isConnected || selectedProvider?.type === "ollama";
  const isUsingRealInference = hasConnectedProvider && selectedModelId;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const simulateAgentResponse = async (userMessage: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 800));

    const agentName = currentAgent?.name || "AI Assistant";
    const personality = currentAgent?.personality || "helpful";
    const tools = currentAgent?.tools || [];

    const responses = [
      `As your ${agentName}, I understand you're asking about "${userMessage.slice(0, 30)}...". Let me help you with that using my ${personality} approach.`,
      `Great question! Based on my configuration, I can use ${tools.length > 0 ? tools.slice(0, 2).join(" and ") : "my knowledge"} to assist you.`,
      `I'm analyzing your request. With my focus on "${currentAgent?.goal || "helping users"}", here's what I can do for you...`,
      `Thanks for your message! As a ${personality} assistant, I'll provide you with the most helpful response I can.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const callRealInference = async (userMessage: string): Promise<string> => {
    if (!selectedProvider || !selectedModelId || !currentAgent) {
      throw new Error("Provider or model not configured");
    }

    const systemPrompt = buildSystemPrompt(currentAgent);
    
    const chatHistory: ChatMessage[] = messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
    
    chatHistory.push({
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    const inferenceMessages = convertChatHistory(chatHistory, systemPrompt);

    const result = await runInference({
      provider: selectedProvider,
      model: selectedModelId,
      messages: inferenceMessages,
      temperature: currentAgent.temperature || 0.7,
      maxTokens: currentAgent.maxTokens || 4096,
    });

    if (!result.success) {
      throw new Error(result.error || "Inference failed");
    }

    return result.content;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: TestMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setLastError(null);

    try {
      let response: string;
      
      if (isUsingRealInference) {
        response = await callRealInference(userMessage.content);
      } else {
        response = await simulateAgentResponse(userMessage.content);
      }

      const assistantMessage: TestMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setLastError(errorMsg);
      
      const errorMessage: TestMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${errorMsg}. Please check your API configuration and try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setLastError(null);
  };

  if (!currentAgent || builderState.step !== "complete") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-2">Complete Your Agent First</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Finish building your agent in the conversation to test it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">{currentAgent.name}</h3>
            <p className="text-xs text-muted-foreground">
              {isUsingRealInference ? "Live Mode" : "Demo Mode"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isUsingRealInference ? (
            <Badge variant="default" className="text-xs gap-1">
              <Wifi className="w-3 h-3" />
              {selectedProvider?.name}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs gap-1">
              <WifiOff className="w-3 h-3" />
              Demo
            </Badge>
          )}
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearChat}
              data-testid="button-clear-chat"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {!isUsingRealInference && (
        <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-700 dark:text-amber-300 font-medium">Demo Mode</p>
              <p className="text-amber-600/80 dark:text-amber-400/80 text-xs">
                Connect a model provider for real AI responses. Responses are simulated.
              </p>
            </div>
          </div>
        </div>
      )}

      {lastError && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
          <p className="text-xs text-destructive">{lastError}</p>
        </div>
      )}

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Start a conversation to test your agent
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Hello!", "What can you do?", "Help me with something"].map((prompt) => (
                <Badge
                  key={prompt}
                  variant="outline"
                  className="cursor-pointer hover-elevate"
                  onClick={() => setInputValue(prompt)}
                  data-testid={`badge-prompt-${prompt.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {prompt}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
                      <AvatarFallback className="bg-primary/10">
                        <Bot className="w-4 h-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50"
                    }`}
                    data-testid={`test-message-${message.role}-${message.id}`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10">
                    <Bot className="w-4 h-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <span
                      className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isUsingRealInference ? "Send a message..." : "Test your agent (demo mode)..."}
            className="min-h-[48px] max-h-[100px] resize-none"
            data-testid="textarea-test-input"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="h-12 w-12"
            data-testid="button-test-send"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
