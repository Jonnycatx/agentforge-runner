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
import { useAgentStore } from "@/lib/agent-store";
import { checkOllamaHealth, getOllamaModels } from "@/lib/inference";
import { Check, ChevronDown, Key, Settings, Zap, AlertCircle, Loader2, Cpu, Globe, Plus } from "lucide-react";
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
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "available" | "unavailable">("checking");

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

  const handleProviderSelect = (providerId: string) => {
    selectProvider(providerId);
    const provider = providers.find((p) => p.id === providerId);
    if (provider?.models && provider.models.length > 0) {
      selectModel(provider.models[0].id);
      onSelect?.(providerId, provider.models[0].id);
    }
  };

  const handleModelSelect = (modelId: string) => {
    selectModel(modelId);
    if (selectedProviderId) {
      onSelect?.(selectedProviderId, modelId);
    }
  };

  const openConfigDialog = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (provider) {
      setSelectedConfigProvider(providerId);
      setApiKeyInput(provider.apiKey || "");
      setBaseUrlInput(provider.baseUrl || "");
      setConnectionError(null);
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

      if (provider.type === "openai") {
        if (baseUrl) {
          return { success: true, error: "custom_endpoint" };
        }
        try {
          const response = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return { success: false, error: data.error?.message || "Invalid API key" };
          }
          return { success: true };
        } catch (e) {
          return { success: false, error: "Could not connect to OpenAI" };
        }
      }

      if (provider.type === "anthropic") {
        if (!apiKey.startsWith("sk-ant-")) {
          return { success: false, error: "Invalid Anthropic API key format (should start with sk-ant-)" };
        }
        return { success: true };
      }

      if (provider.type === "groq") {
        if (baseUrl) {
          return { success: true, error: "custom_endpoint" };
        }
        try {
          const response = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) {
            return { success: false, error: "Invalid Groq API key" };
          }
          return { success: true };
        } catch (e) {
          return { success: false, error: "Could not connect to Groq" };
        }
      }

      if (provider.type === "google") {
        if (apiKey.length < 20) {
          return { success: false, error: "Invalid Google API key" };
        }
        return { success: true };
      }

      if (provider.type === "xai") {
        if (apiKey.length < 10) {
          return { success: false, error: "Invalid xAI API key" };
        }
        return { success: true };
      }

      return { success: apiKey.length > 0 };
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
      setConfigDialogOpen(false);
    } else {
      setConnectionError(result.error || "Connection failed");
    }

    setIsTestingConnection(false);
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
    return (
      <div className="flex items-center gap-2">
        <Select value={selectedProviderId || ""} onValueChange={handleProviderSelect}>
          <SelectTrigger className="w-[140px]" data-testid="select-provider">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                <div className="flex items-center gap-2">
                  {provider.isConnected && <Check className="w-3 h-3 text-green-500" />}
                  {provider.type === "ollama" && ollamaStatus === "available" && (
                    <Cpu className="w-3 h-3 text-green-500" />
                  )}
                  {provider.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedProvider && (
          <Select value={selectedModelId || ""} onValueChange={handleModelSelect}>
            <SelectTrigger className="w-[160px]" data-testid="select-model">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {selectedProvider.models?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2 gap-1">
                <div className="font-medium text-sm">{provider.name}</div>
                {getProviderBadge(provider) || (
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
                    <Key className="w-3 h-3 mr-1" />
                    Connect
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {provider.models?.length || 0} models
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
          <div className="grid gap-2">
            {selectedProvider.models?.map((model) => (
              <Card
                key={model.id}
                className={`cursor-pointer transition-all hover-elevate ${
                  selectedModelId === model.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleModelSelect(model.id)}
                data-testid={`card-model-${model.id}`}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{model.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {model.contextLength
                        ? `${(model.contextLength / 1000).toFixed(0)}k context`
                        : "Variable context"}
                      {model.costPer1kTokens
                        ? ` • $${model.costPer1kTokens}/1k tokens`
                        : ""}
                    </div>
                  </div>
                  {selectedModelId === model.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
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
  ollamaStatus,
  onSave,
  onRefreshOllama,
}: ConfigDialogProps) {
  if (!provider) return null;

  const isOllama = provider.type === "ollama";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-config-model">
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
                  Stored in your browser only. API calls are made directly from your browser to the provider.
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
