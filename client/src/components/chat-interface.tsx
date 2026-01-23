import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAgentStore } from "@/lib/agent-store";
import type { ChatMessage } from "@shared/schema";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { runInference, buildSystemPrompt, convertChatHistory } from "@/lib/inference";

interface ChatInterfaceProps {
  onAgentUpdate?: (updates: Record<string, unknown>) => void;
}

export function ChatInterface({ onAgentUpdate }: ChatInterfaceProps) {
  const { 
    builderState, 
    addBuilderMessage, 
    setBuilderStep, 
    updateBuilderAgent, 
    providers, 
    selectedProviderId, 
    selectedModelId,
    buildStatus,
    setBuildStatus
  } = useAgentStore();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if any provider is connected
  const hasConnectedProvider = providers.some((p) => p.isConnected);
  
  // Get selected provider for real AI responses
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const canUseRealAI = selectedProvider?.isConnected && selectedModelId;

  // Initial greeting message
  useEffect(() => {
    if (builderState.messages.length === 0) {
      const greetingMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Hello! I'm the AgentForge Builder. I'll help you create a powerful AI agent through a simple conversation.\n\nWhat kind of agent would you like to build today? For example:\n- A web design assistant\n- A data analysis helper\n- A coding companion\n- A research assistant",
        timestamp: new Date().toISOString(),
      };
      addBuilderMessage(greetingMessage);
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [builderState.messages]);

  const generateResponse = async (userMessage: string): Promise<string> => {
    // The builder works in demo mode - simulating the conversation flow
    // In a real implementation, this would call the user's connected model provider
    const step = builderState.step;
    const currentAgent = builderState.currentAgent || {};

    switch (step) {
      case "greeting":
        setBuilderStep("goal");
        updateBuilderAgent({ name: extractAgentName(userMessage) });
        return `Great choice! I'll help you build a ${userMessage.toLowerCase().includes("agent") ? userMessage : userMessage + " agent"}.\n\nWhat's the main goal or task for this agent? Be as specific as you can about what you want it to accomplish.`;

      case "goal":
        setBuilderStep("personality");
        updateBuilderAgent({ goal: userMessage });
        return `Perfect! Your agent's goal: "${userMessage}"\n\nNow, let's define the personality. How should your agent communicate?\n- Professional and formal\n- Friendly and casual\n- Technical and precise\n- Creative and playful`;

      case "personality":
        setBuilderStep("tools");
        updateBuilderAgent({ personality: userMessage });
        return `Got it! Your agent will have a ${userMessage.toLowerCase()} personality.\n\nWhat tools should your agent have access to? Here are some options:\n- Web Search\n- Code Interpreter\n- File Reader\n- HTML Generator\n- API Caller\n- Calculator\n\nYou can list multiple tools or describe what capabilities you need.`;

      case "tools":
        setBuilderStep("model");
        const tools = extractTools(userMessage);
        updateBuilderAgent({ tools });
        return `I've equipped your agent with the following tools: ${tools.join(", ")}.\n\nNow, let's choose the AI model. You can select from:\n- GPT-4o (best quality)\n- Claude 3.5 Sonnet (great reasoning)\n- Llama 3.1 70B (fast & free via Groq)\n- Or use your local Ollama models\n\nWhich model would you prefer?`;

      case "model":
        setBuilderStep("review");
        updateBuilderAgent({ modelId: extractModelChoice(userMessage) });
        return `Excellent! I've configured your agent with ${extractModelChoice(userMessage)}.\n\nHere's a summary of your agent:\n\n**Name:** ${currentAgent.name || "AI Assistant"}\n**Goal:** ${currentAgent.goal}\n**Personality:** ${currentAgent.personality}\n**Tools:** ${currentAgent.tools?.join(", ")}\n**Model:** ${extractModelChoice(userMessage)}\n\nWould you like me to generate the agent code now? You can also make any adjustments before we finalize.`;

      case "review":
        setBuilderStep("complete");
        const agentId = crypto.randomUUID();
        updateBuilderAgent({
          id: agentId,
          createdAt: new Date().toISOString(),
        });
        onAgentUpdate?.({ complete: true });
        return `Your agent is ready! I've generated the configuration and code.\n\nYou can:\n- **Run** the agent in the preview pane\n- **Export** the code as a project\n- **Save** to your agent library\n\nFeel free to test it out or make any final adjustments!`;

      case "complete":
        // Use real AI for refinement conversations after agent is complete
        if (canUseRealAI && selectedProvider) {
          const agent = builderState.currentAgent || {};
          
          // Check if user wants to build/apply the suggested config
          const lowerMessage = userMessage.toLowerCase();
          const wantsToBuild = lowerMessage.includes("build") || 
                              lowerMessage.includes("yes") || 
                              lowerMessage.includes("do it") ||
                              lowerMessage.includes("apply") ||
                              lowerMessage.includes("create it") ||
                              lowerMessage.includes("make it") ||
                              lowerMessage.includes("go ahead");
          
          if (wantsToBuild) {
            // Parse the last AI response to extract the suggested config
            const lastAiMessage = builderState.messages.filter(m => m.role === "assistant").pop();
            if (lastAiMessage && selectedProvider) {
              const extractedConfig = parseAgentConfigFromMessage(lastAiMessage.content);
              if (extractedConfig.name || extractedConfig.goal) {
                // Apply the extracted config
                setBuildStatus("building");
                updateBuilderAgent(extractedConfig);
                onAgentUpdate?.({ ...extractedConfig, updated: true });
                
                // Now run an automatic test
                setBuildStatus("testing");
                const testSystemPrompt = buildSystemPrompt({
                  ...agent,
                  ...extractedConfig,
                });
                
                try {
                  const testResult = await runInference({
                    provider: selectedProvider,
                    model: selectedModelId || "",
                    messages: [
                      { role: "system", content: testSystemPrompt },
                      { role: "user", content: "Hello! Can you briefly introduce yourself and what you can help with?" }
                    ],
                    temperature: 0.7,
                    maxTokens: 500,
                  });
                  
                  if (testResult.success && testResult.content) {
                    setBuildStatus("ready");
                    return `**Build Complete!** Your agent passed the test.\n\n**Agent:** ${extractedConfig.name || agent.name}\n**Goal:** ${extractedConfig.goal || agent.goal}\n**Tools:** ${extractedConfig.tools?.join(", ") || agent.tools?.join(", ") || "None"}\n\n**Test Response:**\n> ${testResult.content.slice(0, 300)}${testResult.content.length > 300 ? "..." : ""}\n\nYour agent is ready! You can:\n- **Test** it more in the Test tab\n- **Export** or **Download** the code\n- **Save** to your library\n- **Deploy** it live\n\nOr tell me if you'd like to make any adjustments.`;
                  } else {
                    setBuildStatus("test_failed", testResult.error);
                    return `**Build Applied** but the test encountered an issue:\n\n**Error:** ${testResult.error || "Unknown error"}\n\nThe configuration has been saved. Please check:\n- Is your API key valid and has credits?\n- Is the model ${selectedModelId} available on your account?\n\nWould you like me to try a different configuration, or would you like to test manually in the Test tab?`;
                  }
                } catch (testError) {
                  const errorMsg = testError instanceof Error ? testError.message : "Test failed";
                  setBuildStatus("test_failed", errorMsg);
                  return `**Build Applied** but the automatic test failed:\n\n**Error:** ${errorMsg}\n\nThe configuration is saved. You can try testing manually in the Test tab, or tell me what you'd like to adjust.`;
                }
              }
            }
            return "I've noted your request. Could you describe what you'd like your agent to do, and I'll create a configuration for you?";
          }
          
          const systemPrompt = `You are a helpful AI assistant that helps users design and build AI agents. The user is working on creating/refining an agent.

Current agent settings:
Name: ${agent.name || "AI Assistant"}
Goal: ${agent.goal || "General assistance"}
Personality: ${agent.personality || "Helpful and professional"}
Tools: ${agent.tools?.join(", ") || "None"}
Model: ${selectedModelId}

IMPORTANT INSTRUCTIONS:
1. When the user describes what they want their agent to do, suggest a complete agent configuration with:
   - **Name:** (a descriptive name)
   - **Goal:** (what the agent will accomplish)
   - **Personality:** (communication style)
   - **Tools:** (capabilities needed, choose from: web_scraper, html_generator, css_generator, code_interpreter, file_reader, api_caller, data_analyzer, image_analysis, web_search, calculator)

2. After suggesting a configuration, ALWAYS end with:
   "Would you like me to build this agent for you, or is there anything else you'd like to adjust?"

3. Keep responses concise but complete. Focus on understanding their needs and creating the right agent config.`;

          const messages = convertChatHistory(
            builderState.messages.slice(-10),
            systemPrompt
          );
          messages.push({ role: "user", content: userMessage });

          const result = await runInference({
            provider: selectedProvider,
            model: selectedModelId || "",
            messages,
            temperature: 0.7,
            maxTokens: 1500,
          });

          if (result.success && result.content) {
            return result.content;
          }
          return `I understand you want to refine your agent. ${result.error ? `(Note: ${result.error})` : ""}\n\nWhat specific aspect would you like to adjust?`;
        }
        return "Your agent is complete! To have a live conversation and refine it further, please connect a model provider in the model selector above.";

      default:
        return "I'm here to help! Let me know what you'd like to adjust or if you're ready to proceed.";
    }
  };

  const extractAgentName = (message: string): string => {
    const words = message.toLowerCase().split(" ");
    const typeIndex = words.findIndex((w) =>
      ["assistant", "agent", "helper", "bot", "companion"].includes(w)
    );
    if (typeIndex > 0) {
      const name = words.slice(0, typeIndex + 1).join(" ");
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return message.split(" ").slice(0, 3).join(" ");
  };

  const extractTools = (message: string): string[] => {
    const toolMapping: Record<string, string> = {
      search: "web_search",
      web: "web_search",
      code: "code_interpreter",
      python: "code_interpreter",
      file: "file_reader",
      read: "file_reader",
      html: "html_generator",
      css: "html_generator",
      api: "api_caller",
      http: "api_caller",
      math: "calculator",
      calculate: "calculator",
      image: "image_analysis",
    };

    const tools: string[] = [];
    const lowerMessage = message.toLowerCase();

    for (const [keyword, tool] of Object.entries(toolMapping)) {
      if (lowerMessage.includes(keyword) && !tools.includes(tool)) {
        tools.push(tool);
      }
    }

    return tools.length > 0 ? tools : ["web_search", "code_interpreter"];
  };

  const extractModelChoice = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("gpt") || lowerMessage.includes("openai")) {
      return "gpt-4o";
    }
    if (lowerMessage.includes("claude") || lowerMessage.includes("anthropic")) {
      return "claude-3-5-sonnet";
    }
    if (lowerMessage.includes("llama") || lowerMessage.includes("groq")) {
      return "llama-3.1-70b";
    }
    if (lowerMessage.includes("local") || lowerMessage.includes("ollama")) {
      return "ollama-local";
    }
    return "gpt-4o";
  };

  const parseAgentConfigFromMessage = (message: string): Partial<{
    name: string;
    goal: string;
    personality: string;
    tools: string[];
  }> => {
    const config: Partial<{ name: string; goal: string; personality: string; tools: string[] }> = {};
    
    // Extract name - look for **Name:** pattern
    const nameMatch = message.match(/\*\*Name:\*\*\s*([^\n*]+)/i) || 
                      message.match(/Name:\s*([^\n]+)/i);
    if (nameMatch) {
      config.name = nameMatch[1].trim();
    }
    
    // Extract goal
    const goalMatch = message.match(/\*\*Goal:\*\*\s*([^\n*]+)/i) ||
                      message.match(/Goal:\s*([^\n]+)/i);
    if (goalMatch) {
      config.goal = goalMatch[1].trim();
    }
    
    // Extract personality
    const personalityMatch = message.match(/\*\*Personality:\*\*\s*([^\n*]+)/i) ||
                             message.match(/Personality:\s*([^\n]+)/i);
    if (personalityMatch) {
      config.personality = personalityMatch[1].trim();
    }
    
    // Extract tools - look for tool mentions
    const toolsMatch = message.match(/\*\*Tools:\*\*\s*([\s\S]*?)(?=\n\n|\n\*\*|Would you|$)/i) ||
                       message.match(/Tools:\s*([\s\S]*?)(?=\n\n|\n\*\*|Would you|$)/i);
    if (toolsMatch) {
      const toolText = toolsMatch[1].toLowerCase();
      const toolMapping: Record<string, string> = {
        "web_scraper": "web_search",
        "scraper": "web_search",
        "scraping": "web_search",
        "web_search": "web_search",
        "search": "web_search",
        "html_generator": "html_generator",
        "html": "html_generator",
        "css_generator": "html_generator",
        "css": "html_generator",
        "code_interpreter": "code_interpreter",
        "code": "code_interpreter",
        "python": "code_interpreter",
        "file_reader": "file_reader",
        "file": "file_reader",
        "api_caller": "api_caller",
        "api": "api_caller",
        "data_analyzer": "code_interpreter",
        "data": "code_interpreter",
        "image_analysis": "image_analysis",
        "image": "image_analysis",
        "calculator": "calculator",
        "math": "calculator",
      };
      
      const tools: string[] = [];
      for (const [keyword, tool] of Object.entries(toolMapping)) {
        if (toolText.includes(keyword) && !tools.includes(tool)) {
          tools.push(tool);
        }
      }
      if (tools.length > 0) {
        config.tools = tools;
      }
    }
    
    return config;
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    addBuilderMessage(userMessage);
    setInputValue("");
    setIsTyping(true);

    // Simulate response delay for demo mode
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 600));

    const response = await generateResponse(userMessage.content);

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString(),
    };

    addBuilderMessage(assistantMessage);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          <AnimatePresence mode="popLayout">
            {builderState.messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : ""
                }`}
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
                  data-testid={`message-${message.role}-${message.id}`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
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
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your agent or answer the question..."
            className="min-h-[60px] max-h-[120px] resize-none"
            data-testid="textarea-chat-input"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            size="icon"
            className="h-[60px] w-[60px]"
            data-testid="button-send-message"
          >
            {isTyping ? (
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
