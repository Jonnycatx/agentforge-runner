import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentStore } from "@/lib/agent-store";
import { checkOllamaHealth, getOllamaModels } from "@/lib/inference";
import { Check, ChevronDown, Key, Settings, Zap, AlertCircle, Loader2, Cpu, Globe, Plus, Bot, Sparkles, Cloud, Server, Brain, Rabbit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModelSelectorProps {
  compact?: boolean;
  onSelect?: (providerId: string, modelId: string) => void;
}

export function ModelSelector({ compact = false, onSelect }: ModelSelectorProps) {
  const {
    providers,
    selectedProviderId,
    selectedModelId,
    selectProvider,
    selectModel,
    updateProvider,
  } = useAgentStore();

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedConfigProvider, setSelectedConfigProvider] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "available" | "unavailable">("checking");
  const [customModelId, setCustomModelId] = useState("");
  const [isCustomModel, setIsCustomModel] = useState(false);

  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    setOllamaStatus("checking");
    const isAvailable = await checkOllamaHealth();
    setOllamaStatus(isAvailable ? "available" : "unavailable");
    
    if (isAvailable) {
      const ollamaProvider = providers.find(p => p.type === "ollama");
      if (ollamaProvider) {
        const models = await getOllamaModels();
        if (models.length > 0) {
          updateProvider(ollamaProvider.id, {
            isConnected: true,
            models: models.map(m => ({ id: m, name: m })),
          });
        }
      }
    }
  };

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const selectedModelObj = selectedProvider?.models?.find((m) => m.id === selectedModelId);

  // Provider icons and colors
  const getProviderIcon = (type: string) => {
    switch (type) {
      case "ollama": return { icon: Server, color: "text-green-500", bgColor: "bg-green-500" };
      case "openai": return { icon: Sparkles, color: "text-emerald-500", bgColor: "bg-emerald-500" };
      case "anthropic": return { icon: Brain, color: "text-orange-500", bgColor: "bg-orange-500" };
      case "groq": return { icon: Rabbit, color: "text-purple-500", bgColor: "bg-purple-500" };
      case "google": return { icon: Cloud, color: "text-blue-500", bgColor: "bg-blue-500" };
      case "xai": return { icon: Zap, color: "text-cyan-500", bgColor: "bg-cyan-500" };
      default: return { icon: Bot, color: "text-primary", bgColor: "bg-primary" };
    }
  };

  const handleProviderSelect = (providerId: string) => {
    selectProvider(providerId);
    const provider = providers.find((p) => p.id === providerId);
    
    // Auto-open config dialog if provider is not connected
    const isConnected = provider?.isConnected || (provider?.type === "ollama" && ollamaStatus === "available");
    if (provider && !isConnected) {
      // Open config dialog for unconnected providers
      openConfigDialog(providerId);
      return;
    }
    
    if (provider?.models && provider.models.length > 0) {
      selectModel(provider.models[0].id);
      onSelect?.(providerId, provider.models[0].id);
    }
  };

  const handleModelSelect = (modelId: string) => {
    setIsCustomModel(false);
    selectModel(modelId);
    if (selectedProviderId) {
      onSelect?.(selectedProviderId, modelId);
    }
  };

  const handleCustomModelSelect = () => {
    setIsCustomModel(true);
  };

  const handleCustomModelSave = () => {
    if (customModelId.trim()) {
      selectModel(customModelId.trim());
      if (selectedProviderId) {
        onSelect?.(selectedProviderId, customModelId.trim());
      }
    }
  };

  const openConfigDialog = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (provider) {
      setSelectedConfigProvider(providerId);
      setApiKeyInput(provider.apiKey || "");
      setBaseUrlInput(provider.baseUrl || "");
      setConnectionError(null);
      setConnectionSuccess(false);
      setConfigDialogOpen(true);
    }
  };

  const testConnection = async (provider: typeof providers[0], apiKey: string, baseUrl?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (provider.type === "ollama") {
        const isAvailable = await checkOllamaHealth();
        if (!isAvailable) {
          return { success: false, error: "Ollama is not running. Start it with 'ollama serve'" };
        }
        const models = await getOllamaModels();
        if (models.length === 0) {
          return { success: false, error: "No models found. Pull a model with 'ollama pull llama3.2'" };
        }
        return { success: true };
      }

      if (!apiKey || apiKey.trim().length === 0) {
        return { success: false, error: "API key is required" };
      }

      // Use backend proxy to test all providers with a real API call
      const testModels: Record<string, string> = {
        openai: "gpt-4o-mini",
        anthropic: "claude-3-haiku-20240307",
        groq: "llama3-8b-8192",
        google: "gemini-1.5-flash",
        xai: "grok-4",
      };

      const testModel = testModels[provider.type];
      if (!testModel) {
        return { success: apiKey.length > 0 };
      }

      try {
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
            baseUrl,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return { success: false, error: data.error || `Connection failed (${response.status})` };
        }

        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          return { success: true };
        }
        return { success: false, error: "Unexpected response from API" };
      } catch (e) {
        if (e instanceof Error && e.name === "TimeoutError") {
          return { success: false, error: "Connection timed out. Please try again." };
        }
        return { success: false, error: e instanceof Error ? e.message : "Connection test failed" };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Connection test failed" 
      };
    }
  };

  const saveConfig = async () => {
    if (!selectedConfigProvider) return;

    const provider = providers.find(p => p.id === selectedConfigProvider);
    if (!provider) return;

    setIsTestingConnection(true);
    setConnectionError(null);
    setConnectionSuccess(false);

    const result = await testConnection(provider, apiKeyInput, baseUrlInput);

    if (result.success) {
      const updates: Record<string, unknown> = {
        apiKey: apiKeyInput,
        isConnected: true,
      };
      
      if (baseUrlInput) {
        updates.baseUrl = baseUrlInput;
      }

      if (provider.type === "ollama") {
        const models = await getOllamaModels();
        updates.models = models.map(m => ({ id: m, name: m }));
      }

      updateProvider(selectedConfigProvider, updates);
      
      // Show success state briefly before closing
      setConnectionSuccess(true);
      setIsTestingConnection(false);
      
      // Auto-select first model after successful connection
      const updatedProvider = providers.find(p => p.id === selectedConfigProvider);
      if (updatedProvider?.models && updatedProvider.models.length > 0) {
        selectModel(updatedProvider.models[0].id);
        onSelect?.(selectedConfigProvider, updatedProvider.models[0].id);
      }
      
      // Close dialog after showing success
      setTimeout(() => {
        setConfigDialogOpen(false);
        setConnectionSuccess(false);
      }, 1500);
    } else {
      setConnectionError(result.error || "Connection failed");
      setIsTestingConnection(false);
    }
  };

  const getProviderBadge = (provider: typeof providers[0]) => {
    if (provider.type === "ollama") {
      if (ollamaStatus === "available") {
        return (
          <Badge variant="default" className="text-xs gap-1 bg-green-600">
            <Cpu className="w-3 h-3" />
            Local & Free
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-xs">
          Local
        </Badge>
      );
    }
    
    if (provider.isConnected) {
      if (provider.baseUrl) {
        return (
          <Badge variant="outline" className="text-xs gap-1">
            <Check className="w-3 h-3" />
            Custom
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <Check className="w-3 h-3" />
          Connected
        </Badge>
      );
    }
    
    return null;
  };

  if (compact) {
    const currentProviderStyle = selectedProvider ? getProviderIcon(selectedProvider.type) : null;
    const CurrentIcon = currentProviderStyle?.icon || Bot;
    
    return (
      <div className="flex items-center gap-2">
        <Select value={selectedProviderId || ""} onValueChange={handleProviderSelect}>
          <SelectTrigger className="w-[150px]" data-testid="select-provider">
            <div className="flex items-center gap-2">
              {selectedProvider && (
                <>
                  <div className="relative">
                    <CurrentIcon className={`w-4 h-4 ${currentProviderStyle?.color}`} />
                    {(selectedProvider.isConnected || (selectedProvider.type === "ollama" && ollamaStatus === "available")) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background" />
                    )}
                  </div>
                  <span className="truncate">{selectedProvider.name}</span>
                </>
              )}
              {!selectedProvider && <span>Provider</span>}
            </div>
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => {
              const providerStyle = getProviderIcon(provider.type);
              const ProviderIcon = providerStyle.icon;
              const isConnected = provider.isConnected || (provider.type === "ollama" && ollamaStatus === "available");
              
              return (
                <SelectItem key={provider.id} value={provider.id}>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <ProviderIcon className={`w-4 h-4 ${providerStyle.color}`} />
                      {isConnected && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
                      )}
                    </div>
                    <span>{provider.name}</span>
                    {isConnected && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 ml-auto">
                        Ready
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {selectedProvider && (
          <Select value={selectedModelId || ""} onValueChange={(value) => {
            if (value === "__custom__") {
              setIsCustomModel(true);
            } else {
              handleModelSelect(value);
            }
          }}>
            <SelectTrigger className="w-[160px]" data-testid="select-model">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {selectedProvider.models?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">
                <div className="flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Custom Model
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {isCustomModel && (
          <div className="flex gap-2">
            <Input
              placeholder="Model ID"
              value={customModelId}
              onChange={(e) => setCustomModelId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomModelSave()}
              className="w-[140px] h-9"
              data-testid="input-custom-model-compact"
            />
            <Button 
              size="sm" 
              onClick={handleCustomModelSave}
              disabled={!customModelId.trim()}
            >
              Use
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => selectedProviderId && openConfigDialog(selectedProviderId)}
          data-testid="button-config-model"
        >
          <Settings className="w-4 h-4" />
        </Button>

        <ConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          provider={providers.find((p) => p.id === selectedConfigProvider)}
          apiKeyInput={apiKeyInput}
          setApiKeyInput={setApiKeyInput}
          baseUrlInput={baseUrlInput}
          setBaseUrlInput={setBaseUrlInput}
          isTestingConnection={isTestingConnection}
          connectionError={connectionError}
          connectionSuccess={connectionSuccess}
          ollamaStatus={ollamaStatus}
          onSave={saveConfig}
          onRefreshOllama={checkOllamaStatus}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Select Model Provider</h3>
        <Badge variant="secondary" className="text-xs">
          {providers.filter((p) => p.isConnected).length} connected
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {providers.map((provider) => (
          <Card
            key={provider.id}
            className={`cursor-pointer transition-all hover-elevate ${
              selectedProviderId === provider.id
                ? "ring-2 ring-primary"
                : ""
            }`}
            onClick={() => handleProviderSelect(provider.id)}
            data-testid={`card-provider-${provider.id}`}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm truncate">{provider.name}</div>
                {getProviderBadge(provider)}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {provider.models?.length || 0} models
                </div>
                {!provider.isConnected && provider.type !== "ollama" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      openConfigDialog(provider.id);
                    }}
                    data-testid={`button-connect-${provider.id}`}
                  >
                    <Key className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedProvider && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          <Label>Select Model</Label>
          <ScrollArea className="h-[300px] pr-3">
          <div className="grid gap-2">
            {selectedProvider.models?.map((model) => (
              <Card
                key={model.id}
                className={`cursor-pointer transition-all hover-elevate ${
                  selectedModelId === model.id && !isCustomModel ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleModelSelect(model.id)}
                data-testid={`card-model-${model.id}`}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{model.name}</span>
                      {model.costPer1kTokens === 0 && (
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:text-green-400">
                          Free
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {model.contextLength
                        ? `${(model.contextLength / 1000).toFixed(0)}k context`
                        : "Variable context"}
                      {model.costPer1kTokens && model.costPer1kTokens > 0
                        ? ` • $${model.costPer1kTokens}/1k tokens`
                        : ""}
                    </div>
                  </div>
                  {selectedModelId === model.id && !isCustomModel && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
            
            {/* Custom Model Option */}
            <Card
              className={`cursor-pointer transition-all hover-elevate ${
                isCustomModel ? "ring-2 ring-primary" : ""
              }`}
              onClick={handleCustomModelSelect}
              data-testid="card-model-custom"
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-4 h-4" />
                  <span className="font-medium text-sm">Custom Model</span>
                  <Badge variant="outline" className="text-xs">
                    Any model ID
                  </Badge>
                </div>
                {isCustomModel && (
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      placeholder="Enter model ID (e.g., gpt-4-custom)"
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCustomModelSave()}
                      className="flex-1 h-8 text-sm"
                      data-testid="input-custom-model"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleCustomModelSave}
                      disabled={!customModelId.trim()}
                      data-testid="button-save-custom-model"
                    >
                      Use
                    </Button>
                  </div>
                )}
                {!isCustomModel && (
                  <div className="text-xs text-muted-foreground">
                    Use any model ID not listed above
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </ScrollArea>
        </motion.div>
      )}

      <ConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        provider={providers.find((p) => p.id === selectedConfigProvider)}
        apiKeyInput={apiKeyInput}
        setApiKeyInput={setApiKeyInput}
        baseUrlInput={baseUrlInput}
        setBaseUrlInput={setBaseUrlInput}
        isTestingConnection={isTestingConnection}
        connectionError={connectionError}
        connectionSuccess={connectionSuccess}
        ollamaStatus={ollamaStatus}
        onSave={saveConfig}
        onRefreshOllama={checkOllamaStatus}
      />
    </div>
  );
}

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: { id: string; name: string; type: string; baseUrl?: string };
  apiKeyInput: string;
  setApiKeyInput: (value: string) => void;
  baseUrlInput: string;
  setBaseUrlInput: (value: string) => void;
  isTestingConnection: boolean;
  connectionError: string | null;
  connectionSuccess: boolean;
  ollamaStatus: "checking" | "available" | "unavailable";
  onSave: () => void;
  onRefreshOllama: () => void;
}

function ConfigDialog({
  open,
  onOpenChange,
  provider,
  apiKeyInput,
  setApiKeyInput,
  baseUrlInput,
  setBaseUrlInput,
  isTestingConnection,
  connectionError,
  connectionSuccess,
  ollamaStatus,
  onSave,
  onRefreshOllama,
}: ConfigDialogProps) {
  if (!provider) return null;

  const isOllama = provider.type === "ollama";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-config-model">
        {/* Success overlay */}
        <AnimatePresence>
          {connectionSuccess && (
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
              <p className="text-muted-foreground mt-1">{provider.name} is ready to use</p>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogHeader>
          <DialogTitle>Configure {provider.name}</DialogTitle>
          <DialogDescription>
            {isOllama
              ? "Connect to your local Ollama instance for free, private AI"
              : "Enter your API key to connect this provider"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isOllama ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    ollamaStatus === "available" ? "bg-green-500" : 
                    ollamaStatus === "unavailable" ? "bg-red-500" : 
                    "bg-yellow-500 animate-pulse"
                  }`} />
                  <div>
                    <p className="font-medium text-sm">Ollama Status</p>
                    <p className="text-xs text-muted-foreground">
                      {ollamaStatus === "available" ? "Running on localhost:11434" :
                       ollamaStatus === "unavailable" ? "Not detected" :
                       "Checking..."}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRefreshOllama}
                  disabled={ollamaStatus === "checking"}
                >
                  Refresh
                </Button>
              </div>

              {ollamaStatus === "unavailable" && (
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium text-sm">Quick Setup</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="font-medium">1.</span>
                      <span>Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener" className="text-primary underline">ollama.ai</a></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">2.</span>
                      <span>Run <code className="bg-muted px-1 rounded">ollama pull llama3.2</code></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">3.</span>
                      <span>Click Refresh above</span>
                    </li>
                  </ol>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL (optional)</Label>
                <Input
                  id="base-url"
                  placeholder="http://localhost:11434"
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  data-testid="input-base-url"
                />
                <p className="text-xs text-muted-foreground">
                  Change only if Ollama is running on a different host/port
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* How to get API key guide */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">How to get your API key</h4>
                {provider.type === "openai" && (
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-primary underline">platform.openai.com/api-keys</a></li>
                    <li>2. Sign in or create an account</li>
                    <li>3. Click "Create new secret key"</li>
                    <li>4. Copy and paste it below</li>
                  </ol>
                )}
                {provider.type === "anthropic" && (
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Go to <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" className="text-primary underline">console.anthropic.com/settings/keys</a></li>
                    <li>2. Sign in or create an account</li>
                    <li>3. Click "Create Key"</li>
                    <li>4. Copy and paste it below</li>
                  </ol>
                )}
                {provider.type === "groq" && (
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener" className="text-primary underline">console.groq.com/keys</a></li>
                    <li>2. Sign in with Google or GitHub (free)</li>
                    <li>3. Click "Create API Key"</li>
                    <li>4. Copy and paste it below</li>
                  </ol>
                )}
                {provider.type === "google" && (
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-primary underline">aistudio.google.com/apikey</a></li>
                    <li>2. Sign in with your Google account</li>
                    <li>3. Click "Create API key"</li>
                    <li>4. Copy and paste it below</li>
                  </ol>
                )}
                {provider.type === "xai" && (
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Go to <a href="https://console.x.ai" target="_blank" rel="noopener" className="text-primary underline">console.x.ai</a></li>
                    <li>2. Sign in with your X account</li>
                    <li>3. Navigate to API Keys section</li>
                    <li>4. Create and copy your key below</li>
                  </ol>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder={provider.type === "openai" ? "sk-..." : "Enter your API key"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  data-testid="input-api-key"
                />
                <p className="text-xs text-muted-foreground">
                  Stored in your browser only. Never sent to our servers.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL (optional)</Label>
                <Input
                  id="base-url"
                  placeholder={provider.baseUrl || "Use default endpoint"}
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  data-testid="input-base-url"
                />
                <p className="text-xs text-muted-foreground">
                  For custom endpoints or proxies. Leave empty for default.
                </p>
              </div>
            </>
          )}

          {connectionError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 text-destructive" />
              <span className="text-destructive">{connectionError}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={onSave} 
            disabled={isTestingConnection || (isOllama && ollamaStatus !== "available")} 
            data-testid="button-save-config"
          >
            {isTestingConnection ? (
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
  );
}
