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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentStore } from "@/lib/agent-store";
import { generateExportPackage } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Globe,
  Monitor,
  Share2,
  CheckCircle2,
  Loader2,
  Terminal,
  Bot,
  Zap,
  ExternalLink,
  Copy,
  Sparkles,
} from "lucide-react";

interface DeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeploymentModal({ open, onOpenChange }: DeploymentModalProps) {
  const { builderState } = useAgentStore();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const currentAgent = builderState.currentAgent;

  const handleDownload = async () => {
    if (!currentAgent) return;
    
    setIsDownloading(true);
    try {
      await generateExportPackage(currentAgent);
      setDownloadComplete(true);
      toast({
        title: "Agent exported!",
        description: "Your agent package has been downloaded",
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

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/builder?agent=${encodeURIComponent(JSON.stringify(currentAgent))}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Share this link to let others try your agent",
    });
  };

  if (!currentAgent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden" data-testid="modal-deployment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Your Agent is Ready!
          </DialogTitle>
          <DialogDescription>
            Choose how you want to run {currentAgent.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browser" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browser" data-testid="tab-deploy-browser">
              <Globe className="w-4 h-4 mr-2" />
              Browser
            </TabsTrigger>
            <TabsTrigger value="local" data-testid="tab-deploy-local">
              <Monitor className="w-4 h-4 mr-2" />
              Local
            </TabsTrigger>
            <TabsTrigger value="share" data-testid="tab-deploy-share">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="browser" className="mt-0 space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Run in Browser</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Test your agent right here using the Test tab. Quick and easy!
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Instant - no setup required
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Uses your connected model provider
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Perfect for quick testing
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => onOpenChange(false)}
                    data-testid="button-run-browser"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Start Testing in Browser
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="font-medium">Pro Tip:</span>
                    <span className="text-muted-foreground">
                      Connect Ollama for free local inference!
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="local" className="mt-0 space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Download & Run Locally</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get a complete package to run your agent on your computer.
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Complete Python project with LangChain
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          One-click run scripts (run.sh / run.bat)
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Works offline with Ollama
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          100% private - runs on your machine
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    onClick={handleDownload}
                    disabled={isDownloading || downloadComplete}
                    data-testid="button-download-local"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Preparing Download...
                      </>
                    ) : downloadComplete ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Downloaded!
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Agent Package
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Quick Start Guide
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center flex-shrink-0">
                        1
                      </Badge>
                      <div>
                        <p className="font-medium">Unzip the download</p>
                        <p className="text-muted-foreground">Extract to any folder on your computer</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center flex-shrink-0">
                        2
                      </Badge>
                      <div>
                        <p className="font-medium">Set your API key</p>
                        <p className="text-muted-foreground">Add your OpenAI/Anthropic key to the .env file</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center flex-shrink-0">
                        3
                      </Badge>
                      <div>
                        <p className="font-medium">Run the script</p>
                        <p className="text-muted-foreground">Double-click run.bat (Windows) or run.sh (Mac/Linux)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Want free local inference?</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Install Ollama to run AI models on your computer - no API costs!
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">
                          Get Ollama
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="share" className="mt-0 space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Share Your Agent</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Let others try or remix your creation.
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Anyone with the link can try it
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          They use their own API keys
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Great for showcasing your work
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full mt-4" 
                    onClick={handleCopyShareLink}
                    data-testid="button-copy-share"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Share Link
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium mb-2">Save to Gallery</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Make your agent public so the community can discover and remix it.
                  </p>
                  <Button variant="secondary" data-testid="button-save-gallery">
                    Publish to Gallery
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
