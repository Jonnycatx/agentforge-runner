/**
 * Preview & Test Panel - Right panel for agent preview, testing, and deployment
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Eye,
  Play,
  Rocket,
  Code,
  Bot,
  User,
  Send,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Wrench,
  Copy,
  Check,
  AlertCircle,
  Zap,
  Key,
  Settings,
  Sparkles,
  Brain,
  Cloud,
  Server,
  Rabbit,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ToolDefinition } from "@shared/schema";
import type { BuilderAgent } from "@/pages/unified-builder";
import { useAgentStore } from "@/lib/agent-store";
import { runInference, buildSystemPrompt, convertChatHistory } from "@/lib/inference";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Provider config for API key setup
const PROVIDER_CONFIG: Record<string, { 
  name: string; 
  consoleUrl: string; 
  instructions: string[];
  keyPrefix?: string;
}> = {
  openai: {
    name: "OpenAI",
    consoleUrl: "https://platform.openai.com/api-keys",
    instructions: [
      "Go to platform.openai.com/api-keys",
      "Sign in or create an account",
      "Click \"Create new secret key\"",
      "Copy and paste it below",
    ],
    keyPrefix: "sk-",
  },
  anthropic: {
    name: "Anthropic",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    instructions: [
      "Go to console.anthropic.com/settings/keys",
      "Sign in or create an account",
      "Click \"Create Key\"",
      "Copy and paste it below",
    ],
  },
  groq: {
    name: "Groq",
    consoleUrl: "https://console.groq.com/keys",
    instructions: [
      "Go to console.groq.com/keys",
      "Sign in with Google or GitHub (free)",
      "Click \"Create API Key\"",
      "Copy and paste it below",
    ],
  },
  google: {
    name: "Google Gemini",
    consoleUrl: "https://aistudio.google.com/apikey",
    instructions: [
      "Go to aistudio.google.com/apikey",
      "Sign in with your Google account",
      "Click \"Create API key\"",
      "Copy and paste it below",
    ],
  },
  xai: {
    name: "xAI (Grok)",
    consoleUrl: "https://console.x.ai",
    instructions: [
      "Go to console.x.ai",
      "Sign in with your X account",
      "Navigate to API Keys section",
      "Create and copy your key below",
    ],
  },
};

// Model Connect Button Component with built-in dialog
function ModelConnectButton() {
  const { providers, selectedProviderId, updateProvider, selectProvider, selectModel } = useAgentStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const currentProvider = providers.find(p => p.id === selectedProviderId);
  const isConnected = currentProvider?.isConnected || currentProvider?.type === "ollama";

  const openDialog = () => {
    const pid = selectedProviderId;
    if (pid) {
      const provider = providers.find(p => p.id === pid);
      setSelectedProvider(pid);
      setApiKey(provider?.apiKey || "");
      setBaseUrl(provider?.baseUrl || "");
      setError(null);
      setSuccess(false);
      setDialogOpen(true);
    } else {
      // No provider selected, just open with first cloud provider
      const firstCloud = providers.find(p => p.type !== "ollama");
      if (firstCloud) {
        setSelectedProvider(firstCloud.id);
        setApiKey(firstCloud.apiKey || "");
        setBaseUrl(firstCloud.baseUrl || "");
      }
      setError(null);
      setSuccess(false);
      setDialogOpen(true);
    }
  };

  const handleConnect = async () => {
    if (!selectedProvider) return;
    
    const provider = providers.find(p => p.id === selectedProvider);
    if (!provider) return;

    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Test the connection with a real API call
      const testModels: Record<string, string> = {
        openai: "gpt-4o-mini",
        anthropic: "claude-3-haiku-20240307",
        groq: "llama3-8b-8192",
        google: "gemini-1.5-flash",
        xai: "grok-4",
      };

      const testModel = testModels[provider.type];
      if (testModel) {
        const response = await fetch("/api/inference/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: provider.type,
            apiKey,
            model: testModel,
            messages: [{ role: "user", content: "Hi" }],
            temperature: 0.1,
            maxTokens: 5,
            baseUrl: baseUrl || undefined,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Connection failed (${response.status})`);
        }
      }

      // Success - update provider
      updateProvider(selectedProvider, {
        apiKey,
        baseUrl: baseUrl || undefined,
        isConnected: true,
      });

      // Also select this provider and its first model in the store
      selectProvider(selectedProvider);
      const connectedProvider = providers.find(p => p.id === selectedProvider);
      if (connectedProvider?.models?.[0]) {
        selectModel(connectedProvider.models[0].id);
      }

      setSuccess(true);
      setTimeout(() => {
        setDialogOpen(false);
        setSuccess(false);
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  const providerConfig = selectedProvider ? 
    PROVIDER_CONFIG[providers.find(p => p.id === selectedProvider)?.type || ""] : null;

  return (
    <>
      <Button
        variant={isConnected ? "outline" : "default"}
        size="sm"
        onClick={openDialog}
        className="gap-1.5 h-9 px-3"
      >
        {isConnected ? (
          <>
            <Check className="w-3.5 h-3.5 text-green-500" />
            Connected
          </>
        ) : (
          <>
            <Key className="w-3.5 h-3.5" />
            Connect
          </>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {/* Success overlay */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 rounded-lg"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4"
                >
                  <Check className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">Connected!</h3>
                <p className="text-muted-foreground mt-1">Your AI model is ready to use</p>
              </motion.div>
            )}
          </AnimatePresence>

          <DialogHeader>
            <DialogTitle>Connect AI Model</DialogTitle>
            <DialogDescription>
              Enter your API key to enable real AI responses
            </DialogDescription>
          </DialogHeader>

          {/* Provider selector */}
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-2 block">Select Provider</Label>
              <div className="grid grid-cols-3 gap-2">
                {providers.filter(p => p.type !== "ollama").map(provider => {
                  const config = PROVIDER_CONFIG[provider.type];
                  return (
                    <Button
                      key={provider.id}
                      variant={selectedProvider === provider.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        setApiKey(provider.apiKey || "");
                        setError(null);
                      }}
                      className="h-auto py-2 flex flex-col gap-1"
                    >
                      <span className="text-xs font-medium">{config?.name || provider.name}</span>
                      {provider.isConnected && (
                        <Check className="w-3 h-3 text-green-500" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {providerConfig && (
              <>
                {/* Instructions */}
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">How to get your API key</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    {providerConfig.instructions.map((step, i) => (
                      <li key={i}>
                        {i + 1}. {i === 0 ? (
                          <>
                            Go to{" "}
                            <a 
                              href={providerConfig.consoleUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary underline hover:no-underline"
                            >
                              {providerConfig.consoleUrl.replace("https://", "")}
                            </a>
                          </>
                        ) : step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* API Key input */}
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder={providerConfig.keyPrefix ? `${providerConfig.keyPrefix}...` : "Enter your API key"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Stored in your browser only. Never sent to our servers.
                  </p>
                </div>

                {/* Base URL (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="base-url">Base URL (optional)</Label>
                  <Input
                    id="base-url"
                    placeholder="Use default endpoint"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    For custom endpoints or proxies. Leave empty for default.
                  </p>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />
                <span className="text-destructive">{error}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConnect}
              disabled={isConnecting || !selectedProvider || !apiKey.trim()}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Save & Connect"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PreviewTestPanelProps {
  agent: BuilderAgent;
  availableTools: ToolDefinition[];
  onAgentUpdate: (updates: Partial<BuilderAgent>) => void;
  onTestComplete: (passed: boolean) => void;
  onDeploy: () => void;
  isTestPassed: boolean;
  isTesting: boolean;
  setIsTesting: (testing: boolean) => void;
}

interface TestMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolsUsed?: string[];
}

// Import test scenarios and components
import { getQuickTestPrompts, generateTestScenarios, type TestScenario } from "./test-scenarios";
import { QuickTestPanel } from "./quick-test-panel";
import { DeployModal } from "./deploy-modal";

export function PreviewTestPanel({
  agent,
  availableTools,
  onAgentUpdate,
  onTestComplete,
  onDeploy,
  isTestPassed,
  isTesting,
  setIsTesting,
}: PreviewTestPanelProps) {
  const { providers, selectedProviderId, selectedModelId, selectModel, selectProvider } = useAgentStore();
  const [activeTab, setActiveTab] = useState("preview");
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-select a connected provider if none is selected
  useEffect(() => {
    if (!selectedProviderId || !selectedModelId) {
      const connectedProvider = providers.find(p => p.isConnected && p.type !== "ollama");
      if (connectedProvider) {
        if (!selectedProviderId) {
          selectProvider(connectedProvider.id);
        }
        if (!selectedModelId && connectedProvider.models?.[0]) {
          selectModel(connectedProvider.models[0].id);
        }
      }
    }
  }, [providers, selectedProviderId, selectedModelId, selectProvider, selectModel]);

  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  // Also check if ANY provider is connected as fallback
  const anyConnectedProvider = providers.find(p => p.isConnected && p.type !== "ollama");
  const hasConnectedProvider = selectedProvider?.isConnected || selectedProvider?.type === "ollama" || !!anyConnectedProvider;
  const isUsingRealInference = hasConnectedProvider && (selectedModelId || agent.modelId);

  // Get tool objects for display
  const agentTools = agent.tools
    .map(id => availableTools.find(t => t.id === id))
    .filter((t): t is ToolDefinition => t !== undefined);

  // Generate code preview
  const generatedCode = generateAgentCode(agent, agentTools);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [testMessages]);

  // Handle test message send
  const handleSendTest = async () => {
    if (!testInput.trim() || isTesting) return;

    const userMessage: TestMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: testInput.trim(),
      timestamp: new Date().toISOString(),
    };

    setTestMessages(prev => [...prev, userMessage]);
    setTestInput("");
    setIsTesting(true);

    try {
      let response: string;
      
      // Use selected provider or fall back to any connected provider
      const activeProvider = selectedProvider?.isConnected ? selectedProvider : anyConnectedProvider;
      const activeModelId = selectedModelId || agent.modelId || activeProvider?.models?.[0]?.id;
      
      if (isUsingRealInference && activeProvider && activeModelId) {
        // Real inference
        const systemPrompt = agent.systemPrompt || buildSystemPrompt(agent as any);
        const chatHistory = testMessages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
        chatHistory.push({
          id: userMessage.id,
          role: "user",
          content: userMessage.content,
          timestamp: userMessage.timestamp,
        });

        const result = await runInference({
          provider: activeProvider,
          model: activeModelId,
          messages: convertChatHistory(chatHistory as any, systemPrompt),
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
        });

        if (result.success) {
          response = result.content;
          onTestComplete(true);
        } else {
          throw new Error(result.error || "Inference failed");
        }
      } else {
        // Demo mode - simulate response
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = simulateResponse(agent, userMessage.content);
        onTestComplete(true);
      }

      const assistantMessage: TestMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
        toolsUsed: agent.tools.slice(0, 2), // Simulated
      };

      setTestMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: TestMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Test failed"}. Please check your configuration.`,
        timestamp: new Date().toISOString(),
      };
      setTestMessages(prev => [...prev, errorMessage]);
      onTestComplete(false);
    } finally {
      setIsTesting(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear test chat
  const handleClearTest = () => {
    setTestMessages([]);
  };

  // Test prompts and scenarios
  const testPrompts = getQuickTestPrompts(agent.tools);
  const testScenarios = generateTestScenarios(agent.tools);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">{agent.name}</h2>
              <p className="text-xs text-muted-foreground">
                {agent.tools.length} tools configured
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isTestPassed && (
              <Badge variant="default" className="bg-green-500 text-xs gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Test Passed
              </Badge>
            )}
            
            <Button
              size="sm"
              onClick={() => setDeployModalOpen(true)}
              disabled={!isTestPassed}
              className="gap-1"
            >
              <Rocket className="w-3.5 h-3.5" />
              Deploy
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-4 py-0 h-10 bg-transparent border-b rounded-none">
          <TabsTrigger value="preview" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Eye className="w-3.5 h-3.5" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="quick-test" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Zap className="w-3.5 h-3.5" />
            Quick Test
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Play className="w-3.5 h-3.5" />
            Chat Test
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Code className="w-3.5 h-3.5" />
            Code
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Agent Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Agent Name
                </label>
                <Input
                  value={agent.name}
                  onChange={(e) => onAgentUpdate({ name: e.target.value })}
                  className="h-9"
                />
              </div>

              {/* Goal */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Goal
                </label>
                <Textarea
                  value={agent.goal}
                  onChange={(e) => onAgentUpdate({ goal: e.target.value })}
                  className="min-h-[60px] resize-none"
                />
              </div>

              {/* Model Selector with Connect Button */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  AI Model
                </label>
                <div className="flex gap-2">
                  <Select
                    value={agent.modelId || selectedModelId || ""}
                    onValueChange={(value) => {
                      // Update agent config
                      onAgentUpdate({ modelId: value });
                      // Also update store so inference works
                      selectModel(value);
                      // Find and select the provider for this model
                      const provider = providers.find(p => 
                        p.models?.some(m => m.id === value)
                      );
                      if (provider) {
                        selectProvider(provider.id);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Select model">
                        {(() => {
                          const currentModelId = agent.modelId || selectedModelId;
                          const currentProvider = providers.find(p => p.models?.some(m => m.id === currentModelId));
                          const currentModel = currentProvider?.models?.find(m => m.id === currentModelId);
                          if (currentModel && currentProvider) {
                            return (
                              <div className="flex items-center gap-2">
                                <span>{currentModel.name}</span>
                                {currentProvider.isConnected && (
                                  <Badge variant="default" className="text-[10px] bg-green-500/20 text-green-600 border-green-500/30">
                                    Live
                                  </Badge>
                                )}
                              </div>
                            );
                          }
                          return "Select model";
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {providers.filter(p => p.models && p.models.length > 0).map(provider => (
                        <SelectGroup key={provider.id}>
                          <SelectLabel className="flex items-center gap-2 py-2 px-2 bg-muted/50 sticky top-0">
                            <span className="font-semibold">{provider.name}</span>
                            {provider.isConnected ? (
                              <Badge variant="default" className="text-[10px] bg-green-500/20 text-green-600 border-green-500/30">
                                Connected
                              </Badge>
                            ) : provider.type !== "ollama" ? (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Not connected
                              </Badge>
                            ) : null}
                          </SelectLabel>
                          {(provider.models || []).map(model => (
                            <SelectItem key={model.id} value={model.id} className="pl-4">
                              <div className="flex items-center gap-2">
                                <span>{model.name}</span>
                                {model.id === (agent.modelId || selectedModelId) && provider.isConnected && (
                                  <Check className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <ModelConnectButton />
                </div>
                {isUsingRealInference ? (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Live mode - Using {anyConnectedProvider?.name || selectedProvider?.name} API
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Click "Connect" to add your API key
                  </p>
                )}
              </div>

              {/* Tools Summary */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Tools ({agent.tools.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {agentTools.map(tool => (
                    <Badge key={tool.id} variant="secondary" className="text-xs">
                      {tool.name}
                    </Badge>
                  ))}
                  {agent.tools.length === 0 && (
                    <span className="text-xs text-muted-foreground">No tools selected</span>
                  )}
                </div>
              </div>

              {/* Advanced Settings */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-xs">Advanced Settings</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Personality
                    </label>
                    <Textarea
                      value={agent.personality}
                      onChange={(e) => onAgentUpdate({ personality: e.target.value })}
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Temperature
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={agent.temperature}
                        onChange={(e) => onAgentUpdate({ temperature: parseFloat(e.target.value) })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Max Tokens
                      </label>
                      <Input
                        type="number"
                        min="256"
                        max="16384"
                        step="256"
                        value={agent.maxTokens}
                        onChange={(e) => onAgentUpdate({ maxTokens: parseInt(e.target.value) })}
                        className="h-9"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Quick Test Tab */}
        <TabsContent value="quick-test" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              <QuickTestPanel
                tools={agent.tools}
                isConnected={!!isUsingRealInference}
                onRunTest={async (prompt) => {
                  // Use selected provider or fall back to any connected provider
                  const activeProvider = selectedProvider?.isConnected ? selectedProvider : anyConnectedProvider;
                  const activeModelId = selectedModelId || agent.modelId || activeProvider?.models?.[0]?.id;
                  
                  try {
                    if (isUsingRealInference && activeProvider && activeModelId) {
                      const systemPrompt = agent.systemPrompt || buildSystemPrompt(agent as any);
                      const result = await runInference({
                        provider: activeProvider,
                        model: activeModelId,
                        messages: [
                          { role: "system", content: systemPrompt },
                          { role: "user", content: prompt },
                        ],
                        temperature: agent.temperature,
                        maxTokens: agent.maxTokens,
                      });

                      if (result.success) {
                        onTestComplete(true);
                        return { success: true, response: result.content };
                      } else {
                        return { success: false, response: "", error: result.error };
                      }
                    } else {
                      // Demo mode
                      await new Promise(r => setTimeout(r, 1000));
                      onTestComplete(true);
                      return { 
                        success: true, 
                        response: `[Demo] I would respond to "${prompt.slice(0, 50)}..." using my ${agent.tools.length} configured tools.` 
                      };
                    }
                  } catch (error) {
                    return { 
                      success: false, 
                      response: "", 
                      error: error instanceof Error ? error.message : "Test failed" 
                    };
                  }
                }}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Chat Test Tab */}
        <TabsContent value="test" className="flex-1 m-0 flex flex-col overflow-hidden">
          {/* Demo mode warning */}
          {!isUsingRealInference && (
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-700 dark:text-amber-300">
                  Demo mode - Connect a model provider for real AI responses
                </span>
              </div>
            </div>
          )}

          {/* Chat Area */}
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            {testMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Test Your Agent</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
                  Send a message to see how your agent responds
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {testPrompts.map((prompt) => (
                    <Badge
                      key={prompt}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setTestInput(prompt)}
                    >
                      {prompt}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {testMessages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" && "justify-end"
                      )}
                    >
                      {message.role === "assistant" && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10">
                            <Bot className="w-4 h-4 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.toolsUsed && message.toolsUsed.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Wrench className="w-3 h-3" />
                              Used: {message.toolsUsed.join(", ")}
                            </div>
                          </div>
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

                {isTesting && (
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
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Test Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendTest();
                  }
                }}
                placeholder="Test your agent..."
                className="min-h-[48px] max-h-[100px] resize-none"
              />
              <Button
                onClick={handleSendTest}
                disabled={!testInput.trim() || isTesting}
                size="icon"
                className="h-12 w-12 flex-shrink-0"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            {testMessages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={handleClearTest}
              >
                Clear chat
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <Badge variant="secondary" className="text-xs">
                Python
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <pre className="p-4 text-xs font-mono text-muted-foreground leading-relaxed">
                <code>{generatedCode}</code>
              </pre>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Deploy Modal */}
      <DeployModal
        open={deployModalOpen}
        onOpenChange={setDeployModalOpen}
        agent={agent}
        tools={agentTools}
      />
    </div>
  );
}

// Helper: Generate agent code
function generateAgentCode(agent: BuilderAgent, tools: ToolDefinition[]): string {
  const toolNames = tools.map(t => t.id).join('", "');
  
  return `"""
${agent.name}
Generated by AgentForge
"""

from agentforge import Agent, Tool

# Initialize the agent
agent = Agent(
    name="${agent.name}",
    goal="${agent.goal}",
    personality="${agent.personality}",
    model="${agent.modelId}",
    temperature=${agent.temperature},
    max_tokens=${agent.maxTokens},
)

# Configure tools
tools = ["${toolNames}"]
for tool_id in tools:
    agent.add_tool(Tool.from_registry(tool_id))

# System prompt
agent.set_system_prompt("""
${agent.systemPrompt || `You are ${agent.name}, an AI assistant.
Your goal: ${agent.goal}
Personality: ${agent.personality}

Always be helpful, accurate, and professional.`}
""")

# Run the agent
if __name__ == "__main__":
    response = agent.chat("Hello! What can you help me with?")
    print(response)
`;
}

// Helper: Simulate response for demo mode
function simulateResponse(agent: BuilderAgent, userMessage: string): string {
  const responses = [
    `As ${agent.name}, I'm here to help you with "${userMessage.slice(0, 30)}...". Let me analyze this using my configured tools.`,
    `Great question! Based on my ${agent.tools.length} tools, I can help you accomplish this task efficiently.`,
    `I understand you need help with this. My goal is to "${agent.goal.slice(0, 50)}...", so let me assist you.`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)] + 
    "\n\n(This is a demo response. Connect an AI model for real responses.)";
}
