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
  Clock,
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

  const getOSDisplayName = () => {
    switch (detectedOS) {
      case "mac": return "Mac";
      case "windows": return "Windows";
      case "linux": return "Linux";
      default: return "your computer";
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
            Your Agent is Ready!
          </DialogTitle>
          <DialogDescription className="text-base">
            {currentAgent.name} is built and ready to chat
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4 py-2">
            
            {/* Primary Option - Run in Browser (Zero Friction) */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">Run in Browser</h3>
                      <Badge className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">
                        Recommended
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start chatting instantly - works on any device
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleRunInBrowser}
                  className="w-full mt-4"
                  size="lg"
                  data-testid="button-run-in-browser"
                >
                  Open Chat
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Python Package Option with OS-Specific Guidance */}
            <Card className="border-muted">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Terminal className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">Run on {getOSDisplayName()}</h3>
                      <Badge variant="outline" className="text-xs">Python</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Download and run offline with free local AI
                    </p>
                  </div>
                </div>

                {/* Step by step setup guide */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3" data-testid="section-setup-guide">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Quick Setup
                  </h4>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3" data-testid="setup-step-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Get Python (free, one-time)</p>
                        <a 
                          href="https://www.python.org/downloads/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1"
                          data-testid="link-python-download"
                        >
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            Download Python
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                        <p className="text-xs text-muted-foreground mt-1">Click the yellow button, install with all defaults</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3" data-testid="setup-step-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Get free AI with Ollama (optional)</p>
                        <a 
                          href="https://ollama.com/download" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1"
                          data-testid="link-ollama-download"
                        >
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            Download Ollama
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                        <p className="text-xs text-muted-foreground mt-1">Free unlimited AI that runs on your computer</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3" data-testid="setup-step-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">3</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Download & run your agent</p>
                        <Button
                          onClick={handlePythonDownload}
                          disabled={isDownloading}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs mt-1"
                          data-testid="button-download-python"
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Download className="w-3 h-3 mr-1" />
                          )}
                          Download Agent Package
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Unzip the file, then double-click <code className="bg-muted px-1 rounded font-mono">{getRunScriptName()}</code>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coming Soon - Native Desktop App */}
            <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-muted-foreground">Native Desktop App</h3>
                      <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        Coming Soon
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground/70">
                      Double-click to run - no Python needed. Install once, open .agentforge files forever.
                    </p>
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
