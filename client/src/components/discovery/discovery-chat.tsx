import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Wrench,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  suggestions?: string[];
  showExamples?: boolean;
  examples?: string[];
}

interface DiscoveryChatProps {
  onComplete: (config: any) => void;
  onCancel?: () => void;
}

export function DiscoveryChat({ onComplete, onCancel }: DiscoveryChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const [examples, setExamples] = useState<string[]>([]);
  const [currentState, setCurrentState] = useState<string>("greeting");
  const [canProceed, setCanProceed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start conversation on mount
  useEffect(() => {
    startConversation();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input after assistant message
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  const startConversation = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/discovery/conversation/start", {
        method: "POST",
      });
      const data = await response.json();
      
      setSessionId(data.sessionId);
      setMessages([{
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        suggestions: data.suggestions,
      }]);
      setSuggestions(data.suggestions || []);
      setShowExamples(data.showExamples || false);
      setExamples(data.examples || []);
      setCurrentState(data.nextState);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setMessages([{
        role: "assistant",
        content: "Hi! I'm here to help you create the perfect AI assistant. What kind of tasks do you need help with?",
        timestamp: new Date(),
        suggestions: ["Email management", "Research assistant", "Data analyst", "Sales helper"],
      }]);
      setSuggestions(["Email management", "Research assistant", "Data analyst", "Sales helper"]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || loading) return;
    
    // Add user message
    setMessages(prev => [...prev, {
      role: "user",
      content: message,
      timestamp: new Date(),
    }]);
    setInput("");
    setSuggestions([]);
    setLoading(true);

    try {
      const response = await fetch("/api/discovery/conversation/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message,
        }),
      });
      const data = await response.json();
      
      // Add assistant response
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        suggestions: data.suggestions,
        showExamples: data.showExamples,
        examples: data.examples,
      }]);
      
      setSuggestions(data.suggestions || []);
      setShowExamples(data.showExamples || false);
      setExamples(data.examples || []);
      setCurrentState(data.nextState);
      setCanProceed(data.context?.canProceed || false);
      
      // Handle actions
      if (data.actions) {
        for (const action of data.actions) {
          if (action.type === "create_agent" && action.data) {
            // User confirmed creation
            onComplete(action.data);
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        suggestions: ["Try again", "Start over"],
      }]);
      setSuggestions(["Try again", "Start over"]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <Card className="flex flex-col h-[600px] max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">AI Agent Builder</h3>
            <p className="text-xs text-muted-foreground">
              {currentState === "greeting" && "Let's get started"}
              {currentState === "job_type" && "Defining agent type"}
              {currentState === "industry" && "Selecting industry"}
              {currentState === "tasks" && "Configuring tasks"}
              {currentState === "tools" && "Choosing tools"}
              {currentState === "review" && "Reviewing configuration"}
              {currentState === "confirm" && "Almost done!"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={startConversation}
            disabled={loading}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Start Over
          </Button>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                )}>
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                
                {/* Message content */}
                <div className={cn(
                  "flex-1 max-w-[80%]",
                  message.role === "user" && "flex flex-col items-end"
                )}>
                  <div className={cn(
                    "rounded-xl px-4 py-2",
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {/* Examples */}
                  {message.showExamples && message.examples && (
                    <div className="mt-3 space-y-2">
                      {message.examples.slice(0, 5).map((example, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          {example}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Inline suggestions */}
                  {message.suggestions && message.role === "assistant" && index === messages.length - 1 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.suggestions.map((suggestion, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="h-auto py-1.5 px-3 text-xs"
                          onClick={() => handleSuggestionClick(suggestion)}
                          disabled={loading}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Loading indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Quick suggestions bar */}
      {suggestions.length > 0 && !loading && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-muted-foreground flex-shrink-0">Quick:</span>
            {suggestions.slice(0, 4).map((suggestion, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 flex-shrink-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => sendMessage("back")}
          >
            <ArrowLeft className="w-3 h-3" />
            Go back
          </button>
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => sendMessage("help")}
          >
            <HelpCircle className="w-3 h-3" />
            Help
          </button>
        </div>
      </form>
    </Card>
  );
}
