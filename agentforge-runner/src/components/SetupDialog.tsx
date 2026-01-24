import { useState } from "react";
import { motion } from "framer-motion";
import { X, Check, Server, Sparkles, Brain, ExternalLink } from "lucide-react";
import { Avatar } from "./Avatar";

interface SetupDialogProps {
  agentName?: string;
  avatarSrc?: string;
  onComplete: (provider: string, apiKey?: string) => void;
  onClose: () => void;
}

const PROVIDERS = [
  { id: "ollama", name: "Ollama (Free & Local)", icon: Server, needsKey: false, description: "Run AI on your computer" },
  { id: "openai", name: "OpenAI", icon: Sparkles, needsKey: true, description: "GPT-4o and more" },
  { id: "anthropic", name: "Anthropic", icon: Brain, needsKey: true, description: "Claude AI" },
];

export function SetupDialog({ agentName, avatarSrc, onComplete, onClose }: SetupDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [apiKey, setApiKey] = useState("");
  const [step, setStep] = useState<"provider" | "key">("provider");

  const selectedProviderInfo = PROVIDERS.find((p) => p.id === selectedProvider);

  const handleContinue = () => {
    if (selectedProviderInfo?.needsKey && !apiKey.trim()) {
      return;
    }
    onComplete(selectedProvider, apiKey || undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Connect Your AI</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Agent Avatar */}
        <div className="flex flex-col items-center mb-6">
          <Avatar src={avatarSrc} name={agentName} size="lg" />
          <p className="mt-3 font-medium">{agentName || "AI Assistant"}</p>
          <p className="text-sm text-muted-foreground">needs an AI model to chat</p>
        </div>

        {step === "provider" && (
          <div className="space-y-3">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  setSelectedProvider(provider.id);
                  if (provider.needsKey) {
                    setStep("key");
                  }
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                  selectedProvider === provider.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <provider.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                </div>
                {selectedProvider === provider.id && !provider.needsKey && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}

            {selectedProvider === "ollama" && (
              <div className="mt-4 p-4 bg-muted/50 rounded-xl">
                <p className="text-sm font-medium mb-2">First time with Ollama?</p>
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline inline-flex items-center gap-1"
                >
                  Download Ollama (free)
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-xs text-muted-foreground mt-2">
                  Then run: <code className="bg-muted px-1 rounded">ollama pull llama3.2</code>
                </p>
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={!selectedProvider}
              className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
            >
              {selectedProviderInfo?.needsKey ? "Continue" : "Start Chatting"}
            </button>
          </div>
        )}

        {step === "key" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("provider")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Back to providers
            </button>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {selectedProviderInfo?.name} API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>

            <button
              onClick={handleContinue}
              disabled={!apiKey.trim()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
            >
              Start Chatting
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
