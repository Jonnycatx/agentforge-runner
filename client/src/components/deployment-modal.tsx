import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentStore } from "@/lib/agent-store";
import { generateExportPackage } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Globe,
  Monitor,
  CheckCircle2,
  Loader2,
  Terminal,
  Bot,
  ExternalLink,
  Sparkles,
  Apple,
  HelpCircle,
  Rocket,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeploymentModal({ open, onOpenChange }: DeploymentModalProps) {
  const { builderState } = useAgentStore();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAgentFileDownloading, setIsAgentFileDownloading] = useState(false);
  const [selectedOS, setSelectedOS] = useState<"windows" | "mac" | "linux" | null>(null);
  const currentAgent = builderState.currentAgent;

  const handlePythonDownload = async () => {
    if (!currentAgent) return;
    
    setIsDownloading(true);
    try {
      await generateExportPackage(currentAgent);
      toast({
        title: "Python package downloaded!",
        description: "Unzip and run with Python installed",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your agent",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAgentFileDownload = async (os: "windows" | "mac" | "linux") => {
    setSelectedOS(os);
    setIsAgentFileDownloading(true);
    
    try {
      // Use currentAgent or create a default config
      const agent = currentAgent || {
        id: crypto.randomUUID(),
        name: "My Agent",
        goal: "A helpful AI assistant",
        personality: "Friendly and helpful",
        tools: [],
        systemPrompt: "You are a helpful AI assistant.",
      };
      
      const agentConfig = {
        version: "1.0",
        agent: {
          id: agent.id || crypto.randomUUID(),
          name: agent.name || "My Agent",
          goal: agent.goal || "",
          personality: agent.personality || "",
          tools: agent.tools || [],
          systemPrompt: agent.systemPrompt || "",
        },
        avatar: "bot",
        createdAt: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(agentConfig, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      const safeName = (agent.name || "MyAgent").replace(/[^a-zA-Z0-9]/g, "") || "MyAgent";
      a.href = url;
      a.download = `${safeName}.agentforge`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      
      // Cleanup after a short delay
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "Agent file downloaded!",
        description: "Double-click to open in AgentForge Runner (once installed)",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was an error creating the agent file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAgentFileDownloading(false);
      setSelectedOS(null);
    }
  };

  const handleRunInBrowser = () => {
    const agentId = currentAgent?.id || "default";
    window.open(`/run-agent/${agentId}`, "_blank");
    onOpenChange(false);
  };

  if (!currentAgent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden" data-testid="modal-deployment">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-3 shadow-lg">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl">
            Your Agent is Ready!
          </DialogTitle>
          <DialogDescription className="text-base">
            {currentAgent.name} is built and ready to chat
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4 py-2">
            
            {/* Primary CTA - Desktop Download */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Download & Run on Desktop</h3>
                      <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      One-time install of AgentForge Runner - no Terminal needed
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3" data-testid="desktop-download-buttons">
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1.5"
                    onClick={() => handleAgentFileDownload("windows")}
                    disabled={isAgentFileDownloading}
                    data-testid="button-download-windows"
                  >
                    {isAgentFileDownloading && selectedOS === "windows" ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Monitor className="w-6 h-6" />
                    )}
                    <span className="text-sm font-medium">Windows</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1.5"
                    onClick={() => handleAgentFileDownload("mac")}
                    disabled={isAgentFileDownloading}
                    data-testid="button-download-mac"
                  >
                    {isAgentFileDownloading && selectedOS === "mac" ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Apple className="w-6 h-6" />
                    )}
                    <span className="text-sm font-medium">Mac</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1.5"
                    onClick={() => handleAgentFileDownload("linux")}
                    disabled={isAgentFileDownloading}
                    data-testid="button-download-linux"
                  >
                    {isAgentFileDownloading && selectedOS === "linux" ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Terminal className="w-6 h-6" />
                    )}
                    <span className="text-sm font-medium">Linux</span>
                  </Button>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs" data-testid="text-desktop-help">
                  <Rocket className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <p className="text-amber-800 dark:text-amber-200">
                    <strong>AgentForge Runner coming soon!</strong> Download your .agentforge file now - 
                    you'll be able to double-click it once the Runner app is released.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Secondary Option - Run in Browser */}
            <Card className="border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">Run in Browser Now</h3>
                      <Badge className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">Works Now</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Chat instantly - no download required
                    </p>
                  </div>
                  <Button
                    onClick={handleRunInBrowser}
                    data-testid="button-run-in-browser"
                  >
                    Open
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tertiary Option - Python Package with Setup Guide */}
            <Card className="border-muted">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Terminal className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">Run on Desktop (Python)</h3>
                      <Badge variant="outline" className="text-xs">Works Now</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Run your agent locally with free AI via Ollama
                    </p>
                  </div>
                  <Button
                    onClick={handlePythonDownload}
                    disabled={isDownloading}
                    data-testid="button-download-python"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download
                  </Button>
                </div>

                {/* Step by step setup guide */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3" data-testid="section-setup-guide">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Quick Setup (2 steps)
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-3" data-testid="setup-step-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Install Python (one time)</p>
                        <a 
                          href="https://www.python.org/downloads/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline text-xs inline-flex items-center gap-1"
                          data-testid="link-python-download"
                        >
                          python.org/downloads <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-xs text-muted-foreground mt-0.5">Click the big yellow button, install with defaults</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3" data-testid="setup-step-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Download & Run</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Unzip, double-click <code className="bg-muted px-1 rounded">run_mac.command</code> or <code className="bg-muted px-1 rounded">run_windows.bat</code>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground pt-1 border-t border-muted">
                    <span className="font-medium">Free AI option:</span> Install <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-primary underline" data-testid="link-ollama-download">Ollama</a> for unlimited local inference
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
