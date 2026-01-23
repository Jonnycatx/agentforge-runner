import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Header } from "@/components/header";
import { ModelSelector } from "@/components/model-selector";
import { ChatInterface } from "@/components/chat-interface";
import { CodePreview } from "@/components/code-preview";
import { TemplateGallery } from "@/components/template-gallery";
import { DeploymentModal } from "@/components/deployment-modal";
import { useAgentStore } from "@/lib/agent-store";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AgentTemplate } from "@/lib/templates";
import { 
  Settings2, 
  RotateCcw, 
  Save,
  Sparkles,
  ChevronDown,
  Zap,
  LayoutTemplate,
  MessageSquare,
  Rocket
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/auth-utils";

export default function Builder() {
  const [location] = useLocation();
  const { 
    builderState, 
    resetBuilder, 
    providers, 
    selectedProviderId,
    currentAgent,
    updateBuilderAgent,
    setBuilderStep,
    addBuilderMessage,
  } = useAgentStore();
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelSectionOpen, setModelSectionOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [deployModalOpen, setDeployModalOpen] = useState(false);

  useEffect(() => {
    document.title = "Agent Builder | AgentForge";
  }, []);

  useEffect(() => {
    if (currentAgent && currentAgent.name) {
      setShowTemplates(false);
    }
  }, [currentAgent]);

  useEffect(() => {
    if (builderState.step !== "greeting") {
      setShowTemplates(false);
    }
  }, [builderState.step]);

  const hasConnectedProvider = providers.some(p => p.isConnected);

  const handleReset = () => {
    resetBuilder();
    setShowTemplates(true);
    toast({
      title: "Builder reset",
      description: "Starting fresh with a new agent",
    });
  };

  const handleTemplateSelect = (template: AgentTemplate) => {
    updateBuilderAgent(template.config);
    setBuilderStep("complete");
    
    addBuilderMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: `I've loaded the "${template.name}" template for you!\n\n**Name:** ${template.config.name}\n**Goal:** ${template.config.goal}\n**Personality:** ${template.config.personality}\n**Tools:** ${template.config.tools?.join(", ")}\n**Model:** ${template.config.modelId}\n\nYour agent is ready! You can test it in the Test tab, make adjustments, or save it to your library.`,
      timestamp: new Date().toISOString(),
    });

    setShowTemplates(false);
    
    toast({
      title: "Template loaded!",
      description: `${template.name} is ready to use`,
    });
  };

  const { isAuthenticated } = useAuth();

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save agents to your library",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }

    const agentToSave = builderState.currentAgent;
    if (!agentToSave || !agentToSave.name) {
      toast({
        title: "Cannot save",
        description: "Please complete building your agent first",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const agentData = {
        name: agentToSave.name || "Untitled Agent",
        goal: agentToSave.goal || "",
        description: agentToSave.description,
        personality: agentToSave.personality,
        tools: agentToSave.tools || [],
        knowledge: agentToSave.knowledge || [],
        modelId: agentToSave.modelId,
        providerId: selectedProviderId || undefined,
        systemPrompt: agentToSave.systemPrompt,
        temperature: agentToSave.temperature || 0.7,
        maxTokens: agentToSave.maxTokens || 4096,
        isPublic: false,
      };

      await apiRequest("POST", "/api/agents", agentData);
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      
      toast({
        title: "Agent saved!",
        description: "Your agent has been saved to your library",
      });
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const stepProgress = {
    greeting: 0,
    goal: 20,
    personality: 40,
    tools: 60,
    model: 80,
    review: 90,
    complete: 100,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h1 className="font-semibold text-sm">Agent Builder</h1>
                  <p className="text-xs text-muted-foreground">
                    {builderState.step === "complete" 
                      ? "Agent ready!" 
                      : "Building your agent..."}
                  </p>
                </div>
              </div>

              <Separator orientation="vertical" className="h-8" />

              <div className="hidden sm:flex items-center gap-2">
                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stepProgress[builderState.step]}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {stepProgress[builderState.step]}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ModelSelector compact onSelect={(providerId, modelId) => {
                updateBuilderAgent({ modelId, providerId });
              }} />
              
              <Separator orientation="vertical" className="h-8 hidden sm:block" />

              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleReset}
                data-testid="button-reset-builder"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Reset</span>
              </Button>

              {builderState.step === "complete" && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    data-testid="button-save-agent"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">
                      {isSaving ? "Saving..." : "Save"}
                    </span>
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setDeployModalOpen(true)}
                    data-testid="button-deploy-agent"
                  >
                    <Rocket className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Deploy</span>
                  </Button>
                </>
              )}

              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-settings">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent data-testid="sheet-settings">
                  <SheetHeader>
                    <SheetTitle>Builder Settings</SheetTitle>
                    <SheetDescription>
                      Configure your model providers and preferences
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <Collapsible 
                      open={modelSectionOpen} 
                      onOpenChange={setModelSectionOpen}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                        <span className="font-medium">Model Providers</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${modelSectionOpen ? "rotate-180" : ""}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4">
                        <ModelSelector />
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex flex-col bg-background">
                  <div className="flex items-center gap-2 p-4 border-b">
                    {showTemplates ? (
                      <>
                        <LayoutTemplate className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Choose a Template</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => setShowTemplates(false)}
                          data-testid="button-skip-templates"
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Start from Scratch
                        </Button>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Conversation</span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {builderState.step}
                        </Badge>
                        {builderState.step === "greeting" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto"
                            onClick={() => setShowTemplates(true)}
                            data-testid="button-show-templates"
                          >
                            <LayoutTemplate className="w-3 h-3 mr-1" />
                            Templates
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {showTemplates ? (
                      <TemplateGallery 
                        onSelect={handleTemplateSelect}
                        onClose={() => setShowTemplates(false)}
                      />
                    ) : (
                      <ChatInterface />
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full bg-muted/30">
                  <CodePreview />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </main>

      <DeploymentModal 
        open={deployModalOpen} 
        onOpenChange={setDeployModalOpen} 
      />
    </div>
  );
}
