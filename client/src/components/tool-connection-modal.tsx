import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";
import { 
  Loader2, 
  Key, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Lock,
  Info,
} from "lucide-react";
import type { ToolDefinition } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ToolConnectionModalProps {
  tool: ToolDefinition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Get icon component by name
function getIconComponent(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.Wrench;
}

// Category colors
const categoryColors: Record<string, string> = {
  web: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  email: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  data: "bg-green-500/10 text-green-600 dark:text-green-400",
  files: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  search: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  finance: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  crm: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  storage: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  communication: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  social: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  automation: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  design: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  dev: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

// API key documentation links
const apiKeyDocs: Record<string, { url: string; name: string }> = {
  web_search: { url: "https://tavily.com/", name: "Tavily" },
  news_search: { url: "https://newsapi.org/", name: "News API" },
  company_search: { url: "https://clearbit.com/", name: "Clearbit" },
  market_data: { url: "https://www.alphavantage.co/", name: "Alpha Vantage" },
};

export function ToolConnectionModal({
  tool,
  open,
  onOpenChange,
  onSuccess,
}: ToolConnectionModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const IconComponent = getIconComponent(tool.icon);
  const categoryColor = categoryColors[tool.category] || categoryColors.dev;
  const docLink = apiKeyDocs[tool.id];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/tools/${tool.id}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          credentialType: tool.authType,
          apiKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save credentials");
      }

      setSuccess(true);
      toast({
        title: "Connected!",
        description: `${tool.name} is now connected and ready to use.`,
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey) {
      setError("Please enter an API key first");
      return;
    }

    setTesting(true);
    setError(null);

    try {
      // First save, then test
      await fetch(`/api/tools/${tool.id}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          credentialType: tool.authType,
          apiKey,
        }),
      });

      const response = await fetch(`/api/tools/${tool.id}/auth/test`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Test failed");
      }

      toast({
        title: "Connection successful!",
        description: "Your API key is valid.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleOAuth = () => {
    // TODO: Implement OAuth flow
    toast({
      title: "Coming Soon",
      description: "OAuth authentication will be available soon.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", categoryColor)}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-left">Connect {tool.name}</DialogTitle>
              <DialogDescription className="text-left">
                {tool.authType === "oauth2" ? "Sign in to connect" : "Enter your API credentials"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-semibold mb-1">Connected!</h3>
            <p className="text-sm text-muted-foreground">
              {tool.name} is ready to use
            </p>
          </div>
        ) : tool.authType === "oauth2" ? (
          <div className="space-y-4 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Click the button below to securely connect your {tool.authConfig?.provider || "account"}.
              </AlertDescription>
            </Alert>
            <Button onClick={handleOAuth} className="w-full" size="lg">
              <Lock className="w-4 h-4 mr-2" />
              Sign in with {tool.authConfig?.provider || "OAuth"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {docLink && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Don't have an API key?</span>
                <a
                  href={docLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  Get one from {docLink.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Your credentials are secure</p>
                  <p>API keys are encrypted and stored securely. They are never shared or logged.</p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={!apiKey || testing || loading}
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              <Button type="submit" disabled={!apiKey || loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
