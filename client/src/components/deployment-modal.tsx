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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAgentStore } from "@/lib/agent-store";
import { generateExportPackage, generatePWAPackage, type PWAAgentConfig } from "@/lib/export-utils";
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
  Smartphone,
  Users,
  Mic,
  Volume2,
  Palette,
  Cat,
  Dog,
  Bird,
  Rabbit,
  Fish,
  Squirrel,
} from "lucide-react";

interface DeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVATAR_OPTIONS = [
  { id: "bot", name: "Classic Bot", icon: Bot, color: "bg-blue-500" },
  { id: "cat", name: "Coding Cat", icon: Cat, color: "bg-orange-500" },
  { id: "dog", name: "Design Dog", icon: Dog, color: "bg-amber-500" },
  { id: "bird", name: "Research Bird", icon: Bird, color: "bg-cyan-500" },
  { id: "rabbit", name: "Quick Rabbit", icon: Rabbit, color: "bg-pink-500" },
  { id: "fish", name: "Data Fish", icon: Fish, color: "bg-purple-500" },
  { id: "squirrel", name: "Helper Squirrel", icon: Squirrel, color: "bg-green-500" },
];

export function DeploymentModal({ open, onOpenChange }: DeploymentModalProps) {
  const { builderState } = useAgentStore();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [isPWADownloading, setIsPWADownloading] = useState(false);
  const [pwaComplete, setPwaComplete] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("bot");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
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

  const handlePWADownload = async () => {
    if (!currentAgent) return;
    
    setIsPWADownloading(true);
    try {
      await generatePWAPackage({
        ...currentAgent,
        avatar: selectedAvatar,
        voiceEnabled,
      });
      setPwaComplete(true);
      toast({
        title: "PWA App exported!",
        description: "Your installable web app has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error creating the PWA",
        variant: "destructive",
      });
    } finally {
      setIsPWADownloading(false);
    }
  };

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
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

  const SelectedAvatarIcon = AVATAR_OPTIONS.find(a => a.id === selectedAvatar)?.icon || Bot;
  const selectedAvatarData = AVATAR_OPTIONS.find(a => a.id === selectedAvatar);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden" data-testid="modal-deployment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Deploy Your Agent
          </DialogTitle>
          <DialogDescription>
            Choose how you want to run {currentAgent.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pwa" className="mt-4">
          <TabsList className="grid w-full grid-cols-4 gap-1">
            <TabsTrigger value="pwa" data-testid="tab-deploy-pwa">
              <Globe className="w-4 h-4 mr-2" />
              Web App
            </TabsTrigger>
            <TabsTrigger value="local" data-testid="tab-deploy-local">
              <Monitor className="w-4 h-4 mr-2" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="mobile" data-testid="tab-deploy-mobile">
              <Smartphone className="w-4 h-4 mr-2" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="share" data-testid="tab-deploy-share">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[450px] mt-4">
            {/* PWA / Web App Tab */}
            <TabsContent value="pwa" className="mt-0 space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-2xl ${selectedAvatarData?.color || "bg-primary"} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <SelectedAvatarIcon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">One-Click Web App</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Download, unzip, double-click run.bat (Windows) or run.sh (Mac/Linux) - opens automatically!
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Just double-click to run
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Choose your avatar
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Works with any AI provider
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Install as desktop app
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Avatar Customization */}
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <Palette className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Choose Avatar</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OPTIONS.map((avatar) => (
                        <button
                          key={avatar.id}
                          onClick={() => handleAvatarSelect(avatar.id)}
                          className={`relative p-2 rounded-xl transition-all ${
                            selectedAvatar === avatar.id 
                              ? "ring-2 ring-primary ring-offset-2" 
                              : "hover-elevate"
                          }`}
                          data-testid={`avatar-${avatar.id}`}
                        >
                          <div className={`w-10 h-10 rounded-lg ${avatar.color} flex items-center justify-center`}>
                            <avatar.icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-xs text-muted-foreground mt-1 block text-center">
                            {avatar.name.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice Toggle */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          {voiceEnabled ? (
                            <Volume2 className="w-4 h-4 text-violet-600" />
                          ) : (
                            <Mic className="w-4 h-4 text-violet-600" />
                          )}
                        </div>
                        <div>
                          <Label htmlFor="voice-toggle" className="font-medium">Voice Interaction</Label>
                          <p className="text-xs text-muted-foreground">Talk to your avatar naturally</p>
                        </div>
                      </div>
                      <Switch
                        id="voice-toggle"
                        checked={voiceEnabled}
                        onCheckedChange={setVoiceEnabled}
                        data-testid="switch-voice"
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-4" 
                    onClick={handlePWADownload}
                    disabled={isPWADownloading || pwaComplete}
                    data-testid="button-download-pwa"
                  >
                    {isPWADownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Web App...
                      </>
                    ) : pwaComplete ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Downloaded!
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Web App
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-medium">How it works:</span>
                    <span className="text-muted-foreground">
                      Unzip → Open index.html → Click "Install" in browser
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Desktop / Local Tab */}
            <TabsContent value="local" className="mt-0 space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Monitor className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">One-Click Desktop Runner</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Download a Python package with smart scripts that handle everything automatically.
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Checks for Python automatically
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Creates venv and installs dependencies
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Complete LangChain agent ready to run
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
                        Download Desktop Package
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Multi-Agent Desktop */}
              <Card className="border-violet-500/20 bg-violet-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">Multi-Agent Desktop</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Run several agents at once with different avatars for different roles!
                      </p>
                      <div className="flex gap-1">
                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                          <Cat className="w-3 h-3 text-white" />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                          <Dog className="w-3 h-3 text-white" />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                          <Bird className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs text-muted-foreground ml-2 self-center">
                          Coding Cat + Design Dog + Research Bird
                        </span>
                      </div>
                    </div>
                  </div>
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
                        <p className="text-muted-foreground">Extract to any folder</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center flex-shrink-0">
                        2
                      </Badge>
                      <div>
                        <p className="font-medium">Double-click the run script</p>
                        <p className="text-muted-foreground">run.bat (Windows) or run.sh (Mac/Linux)</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center flex-shrink-0">
                        3
                      </Badge>
                      <div>
                        <p className="font-medium">Chat in your browser</p>
                        <p className="text-muted-foreground">Opens automatically at localhost</p>
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
                      <h4 className="font-medium text-sm mb-1">Free local inference with Ollama</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        No API costs - run AI on your own computer!
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

            {/* Mobile Tab */}
            <TabsContent value="mobile" className="mt-0 space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Mobile Companion</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Chat with your agents from your phone. Agents sync via your account.
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          iOS and Android via PWA
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Agents sync across devices
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Voice input on mobile
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Push notifications (coming soon)
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardContent className="p-6 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-10 h-10 text-primary" />
                  </div>
                  <h4 className="font-medium mb-2">Install on Your Phone</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Open the PWA web app on your mobile browser, then tap "Add to Home Screen" to install.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button onClick={handlePWADownload} disabled={isPWADownloading} data-testid="button-mobile-pwa">
                      <Download className="w-4 h-4 mr-2" />
                      Get PWA for Mobile
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Works on iOS Safari & Android Chrome
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-2">How to Install on Mobile</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p><strong>iOS:</strong> Open in Safari → Tap Share → "Add to Home Screen"</p>
                    <p><strong>Android:</strong> Open in Chrome → Tap Menu → "Install app"</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Share Tab */}
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
