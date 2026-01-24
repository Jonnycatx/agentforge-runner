import { useState, useEffect } from "react";
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
  Loader2,
  Terminal,
  ExternalLink,
  Sparkles,
  Rocket,
  Monitor,
  Apple,
  CheckCircle2,
} from "lucide-react";

interface DeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type OSType = "mac" | "windows" | "linux" | "unknown";

function detectOS(): OSType {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "mac";
  if (userAgent.includes("win")) return "windows";
  if (userAgent.includes("linux")) return "linux";
  return "unknown";
}

export function DeploymentModal({ open, onOpenChange }: DeploymentModalProps) {
  const { builderState } = useAgentStore();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAgentFileDownloading, setIsAgentFileDownloading] = useState(false);
  const [detectedOS, setDetectedOS] = useState<OSType>("unknown");
  const currentAgent = builderState.currentAgent;

  useEffect(() => {
    setDetectedOS(detectOS());
  }, []);

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

  const handleAgentFileDownload = () => {
    if (!currentAgent) return;
    
    setIsAgentFileDownloading(true);
    
    try {
      const agentConfig = {
        name: currentAgent.name || "AI Assistant",
        goal: currentAgent.goal || "",
        personality: currentAgent.personality || currentAgent.systemPrompt || "You are a helpful AI assistant.",
        avatar: "",
        provider: "ollama",
        model: "llama3.2",
        apiKey: "",
        temperature: 0.7,
      };

      const jsonString = JSON.stringify(agentConfig, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      const safeName = (currentAgent.name || "MyAgent").replace(/[^a-zA-Z0-9]/g, "") || "MyAgent";
      a.href = url;
      a.download = `${safeName}.agentforge`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "Agent file downloaded!",
        description: "Double-click to open in AgentForge Runner",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was an error creating the agent file",
        variant: "destructive",
      });
    } finally {
      setIsAgentFileDownloading(false);
    }
  };

  const handleRunInBrowser = () => {
    const agentId = currentAgent?.id || "default";
    window.open(`/run-agent/${agentId}`, "_blank");
    onOpenChange(false);
  };

  const getRunScriptName = () => {
    switch (detectedOS) {
      case "mac": return "run_mac.command";
      case "linux": return "run_linux.sh";
      case "windows": return "run_windows.bat";
      default: return "run_mac.command or run_windows.bat";
    }
  };

  const getOSIcon = () => {
    switch (detectedOS) {
      case "mac": return <Apple className="w-4 h-4" />;
      case "windows": return <Monitor className="w-4 h-4" />;
      case "linux": return <Terminal className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getOSDisplayName = () => {
    switch (detectedOS) {
      case "mac": return "Mac";
      case "windows": return "Windows";
      case "linux": return "Linux";
      default: return "Desktop";
    }
  };

  const getRunnerDownloadUrl = () => {
    switch (detectedOS) {
      case "mac": return "https://github.com/agentforge/runner/releases/latest/download/AgentForge-Runner.dmg";
      case "windows": return "https://github.com/agentforge/runner/releases/latest/download/AgentForge-Runner.msi";
      case "linux": return "https://github.com/agentforge/runner/releases/latest/download/AgentForge-Runner.AppImage";
      default: return "https://github.com/agentforge/runner/releases";
    }
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
            Deploy Your Agent
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose how you want to run {currentAgent.name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4 py-2">
            
            {/* Option 1 - Run in Browser */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">Run in Browser</h3>
                      <Badge className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">
                        Instant
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start chatting instantly - works on any device
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleRunInBrowser}
                  className="w-full"
                  size="lg"
                  data-testid="button-run-in-browser"
                >
                  Open Chat
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Option 2 - Native Desktop App */}
            <Card className="border-muted">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">Native Desktop App</h3>
                      <Badge variant="outline" className="text-xs">
                        {getOSIcon()}
                        <span className="ml-1">{getOSDisplayName()}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Double-click to run - beautiful native experience
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Two Easy Steps
                  </h4>
                  
                  <div className="space-y-3 text-sm">
                    {/* Step 1 - Download Runner */}
                    <div className="flex items-start gap-3" data-testid="native-step-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Get AgentForge Runner (one time)</p>
                        <a 
                          href={getRunnerDownloadUrl()}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1"
                          data-testid="link-runner-download"
                        >
                          <Button variant="outline" size="sm" className="h-8">
                            {getOSIcon()}
                            <span className="ml-1">Download for {getOSDisplayName()}</span>
                            <Download className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                        <p className="text-xs text-muted-foreground mt-1">
                          {detectedOS === "mac" ? "Open the .dmg and drag to Applications" : 
                           detectedOS === "windows" ? "Run the installer with default settings" :
                           "Make it executable and run"}
                        </p>
                      </div>
                    </div>

                    {/* Step 2 - Download Agent File */}
                    <div className="flex items-start gap-3" data-testid="native-step-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Download your agent file</p>
                        <Button
                          onClick={handleAgentFileDownload}
                          disabled={isAgentFileDownloading}
                          variant="outline"
                          size="sm"
                          className="h-8 mt-1"
                          data-testid="button-download-agentforge"
                        >
                          {isAgentFileDownloading ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Download className="w-3 h-3 mr-1" />
                          )}
                          Download {currentAgent.name}.agentforge
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Double-click to open in AgentForge Runner
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-2 border-t border-muted text-xs text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium">Free AI included:</span> Works with Ollama for unlimited local inference, or connect OpenAI/Anthropic API keys
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Option 3 - Python Package (Advanced) */}
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Terminal className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">Python Package</h3>
                      <Badge variant="outline" className="text-xs text-muted-foreground">Advanced</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      For developers who want to customize
                    </p>
                  </div>
                  <Button
                    onClick={handlePythonDownload}
                    disabled={isDownloading}
                    variant="ghost"
                    size="sm"
                    data-testid="button-download-python"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
