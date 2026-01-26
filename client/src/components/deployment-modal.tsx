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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  Play,
  Zap,
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
  const [isLaunching, setIsLaunching] = useState(false);
  const [detectedOS, setDetectedOS] = useState<OSType>("unknown");
  const [showInstallHelp, setShowInstallHelp] = useState(false);
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

  // One-click launch: Download agent file and try to open with custom protocol
  const handleLaunchDesktop = async () => {
    if (!currentAgent) return;
    
    setIsLaunching(true);
    
    const AVATAR_GRADIENTS = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-orange-500 to-amber-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-blue-500',
    ];
    
    try {
      const agentConfig = {
        name: currentAgent.name || "AI Assistant",
        goal: currentAgent.goal || "",
        personality: currentAgent.personality || currentAgent.systemPrompt || "You are a helpful AI assistant.",
        avatar: "",
        avatarColor: AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)],
        provider: "ollama",
        model: "llama3.2",
        apiKey: "",
        temperature: currentAgent.temperature || 0.7,
        tools: currentAgent.tools || [],
        version: "2.0",
        generatedAt: new Date().toISOString(),
        generatedBy: "AgentForge",
      };

      // Try to open via custom URL scheme first
      const configBase64 = btoa(JSON.stringify(agentConfig));
      const deepLinkUrl = `agentforge://launch?config=${encodeURIComponent(configBase64)}`;
      
      // Try to open the deep link
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLinkUrl;
      document.body.appendChild(iframe);
      
      // Give it a moment, then clean up and download file as backup
      setTimeout(() => {
        document.body.removeChild(iframe);
        
        // Also download the agent file as backup
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
          description: "Double-click the file to launch in AgentForge Runner",
        });
        
        setIsLaunching(false);
      }, 500);
      
    } catch (error) {
      toast({
        title: "Launch failed",
        description: "Please download and install AgentForge Runner first",
        variant: "destructive",
      });
      setShowInstallHelp(true);
      setIsLaunching(false);
    }
  };

  const handleRunInBrowser = () => {
    const agentId = currentAgent?.id || "default";
    window.open(`/run-agent/${agentId}`, "_blank");
    onOpenChange(false);
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

  const GITHUB_REPO = "Jonnycatx/agentforge-runner";
  
  const getRunnerDownloadUrl = () => {
    const baseUrl = `https://github.com/${GITHUB_REPO}/releases/latest/download`;
    switch (detectedOS) {
      case "mac": return `${baseUrl}/AgentForge-Runner_universal.dmg`;
      case "windows": return `${baseUrl}/AgentForge-Runner_x64-setup.exe`;
      case "linux": return `${baseUrl}/AgentForge-Runner_amd64.AppImage`;
      default: return `https://github.com/${GITHUB_REPO}/releases`;
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

            {/* Option 2 - Native Desktop App - ONE-CLICK LAUNCH */}
            <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                    <Monitor className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">Desktop Companion</h3>
                      <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-600 dark:text-violet-400">
                        {getOSIcon()}
                        <span className="ml-1">{getOSDisplayName()}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Native app with AI avatar - always accessible
                    </p>
                  </div>
                </div>

                {/* Primary Launch Button */}
                <Button
                  onClick={handleLaunchDesktop}
                  disabled={isLaunching}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/20"
                  size="lg"
                  data-testid="button-launch-desktop"
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Launch Desktop App
                    </>
                  )}
                </Button>

                {/* Collapsible Install Help */}
                <Collapsible open={showInstallHelp} onOpenChange={setShowInstallHelp}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
                      <span>First time? Get the app</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showInstallHelp ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 mt-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        Quick Setup (one time)
                      </h4>
                      
                      <div className="space-y-2 text-sm">
                        <a 
                          href={getRunnerDownloadUrl()}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                          data-testid="link-runner-download"
                        >
                          <Button variant="outline" size="sm" className="w-full justify-start h-10">
                            <Download className="w-4 h-4 mr-2" />
                            Download AgentForge Runner for {getOSDisplayName()}
                          </Button>
                        </a>
                        <p className="text-xs text-muted-foreground px-1">
                          {detectedOS === "mac" ? "Open the .dmg → Drag to Applications → Double-click to run" : 
                           detectedOS === "windows" ? "Run the installer → Launch from Start Menu" :
                           "Make executable (chmod +x) → Double-click to run"}
                        </p>
                      </div>

                      <div className="flex items-start gap-2 pt-2 border-t border-muted text-xs text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>
                          <span className="font-medium">Free AI included:</span> Works with Ollama for unlimited local inference
                        </span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
