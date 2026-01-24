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
  Loader2,
  Terminal,
  ExternalLink,
  Sparkles,
  Rocket,
} from "lucide-react";

interface DeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeploymentModal({ open, onOpenChange }: DeploymentModalProps) {
  const { builderState } = useAgentStore();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
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
            
            {/* Primary Option - Run in Browser */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Run in Browser</h3>
                      <Badge className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">Instant</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Chat with your agent right now - no install needed
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
