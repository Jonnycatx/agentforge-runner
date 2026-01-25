/**
 * Unified Builder - Complete Agent Building Experience
 * 
 * Features:
 * - Template selection with skill levels
 * - Drag-and-drop tool management
 * - Quick testing and deployment
 * - Keyboard shortcuts
 * - Mobile-responsive design
 * - Onboarding for new users
 * 
 * Layout: Templates (left) | Toolbox (center) | Preview & Test (right)
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { TemplatePanel } from "@/components/unified-builder/template-panel";
import { ToolboxPanel } from "@/components/unified-builder/toolbox-panel";
import { PreviewTestPanel } from "@/components/unified-builder/preview-test-panel";
import { OnboardingOverlay, useOnboarding } from "@/components/unified-builder/onboarding-overlay";
import { KeyboardShortcutsDialog, useKeyboardShortcuts, ShortcutHint } from "@/components/unified-builder/keyboard-shortcuts";
import { MobileBuilder, useIsMobile } from "@/components/unified-builder/mobile-builder";
import { useAgentStore } from "@/lib/agent-store";
import { useToast } from "@/hooks/use-toast";
import { agentEmployees, buildEmployeeConfig, type AgentEmployeeTemplate, type SkillLevel } from "@/lib/agent-employees";
import type { ToolDefinition } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { Keyboard, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

export interface BuilderAgent {
  id: string;
  name: string;
  goal: string;
  personality: string;
  tools: string[];
  modelId: string;
  providerId: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  templateId?: string;
  skillLevel?: SkillLevel;
}

const defaultAgent: BuilderAgent = {
  id: crypto.randomUUID(),
  name: "My AI Agent",
  goal: "Help users accomplish their tasks efficiently",
  personality: "Helpful, professional, and friendly",
  tools: [],
  modelId: "gpt-4o",
  providerId: "openai",
  systemPrompt: "",
  temperature: 0.7,
  maxTokens: 4096,
};

export default function UnifiedBuilder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { 
    providers, 
    selectedProviderId, 
    selectedModelId,
    updateBuilderAgent,
    setBuilderStep,
  } = useAgentStore();

  // Builder state
  const [agent, setAgent] = useState<BuilderAgent>(defaultAgent);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentEmployeeTemplate | null>(null);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("intermediate");
  const [availableTools, setAvailableTools] = useState<ToolDefinition[]>([]);
  const [connectedToolIds, setConnectedToolIds] = useState<string[]>([]);
  const [isTestPassed, setIsTestPassed] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);

  // Onboarding and mobile detection
  const { showOnboarding, completeOnboarding, isLoaded: onboardingLoaded } = useOnboarding();
  const isMobile = useIsMobile();

  // Set document title
  useEffect(() => {
    document.title = "Build Your Agent | AgentForge";
  }, []);

  // Load employee config from sessionStorage if coming from /employees
  useEffect(() => {
    const storedConfig = sessionStorage.getItem("employeeConfig");
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig);
        
        // Find the matching template
        const template = agentEmployees.find(e => e.id === config.employeeId);
        if (template) {
          setSelectedTemplate(template);
          setSkillLevel(config.skillLevel || "intermediate");
        }
        
        // Set agent config
        setAgent({
          id: crypto.randomUUID(),
          name: config.name || config.employeeName || defaultAgent.name,
          goal: config.goal || defaultAgent.goal,
          personality: config.personality || defaultAgent.personality,
          tools: config.tools || [],
          modelId: selectedModelId || "gpt-4o",
          providerId: selectedProviderId || "openai",
          systemPrompt: config.systemPrompt || "",
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 4096,
          templateId: config.employeeId,
          skillLevel: config.skillLevel,
        });
        
        // Clear the stored config
        sessionStorage.removeItem("employeeConfig");
        
        toast({
          title: `${config.employeeName || config.name} loaded!`,
          description: "Your AI employee is ready to customize and test",
        });
      } catch (e) {
        console.error("Failed to parse employee config:", e);
      }
    }
  }, [selectedModelId, selectedProviderId, toast]);

  // Fetch available tools
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await fetch("/api/tools");
        if (response.ok) {
          const data = await response.json();
          setAvailableTools(data);
        }
      } catch (error) {
        console.error("Failed to fetch tools:", error);
      }
    };
    fetchTools();
  }, []);

  // Handle template selection - instantly loads the agent
  const handleTemplateSelect = useCallback((template: AgentEmployeeTemplate) => {
    setSelectedTemplate(template);
    
    // Build config from template
    const config = buildEmployeeConfig(template, skillLevel);
    
    // Update agent with template config
    setAgent({
      id: crypto.randomUUID(),
      name: config.name || template.name,
      goal: config.goal || template.defaultConfig.goal || "",
      personality: config.personality || template.defaultConfig.personality || "",
      tools: config.tools || template.requiredTools,
      modelId: selectedModelId || "gpt-4o",
      providerId: selectedProviderId || "openai",
      systemPrompt: config.systemPrompt || template.systemPrompt,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
      templateId: template.id,
      skillLevel,
    });

    setIsTestPassed(false);
    
    toast({
      title: `${template.name} loaded!`,
      description: "Your agent is ready to customize and test",
    });
  }, [skillLevel, selectedModelId, selectedProviderId, toast]);

  // Handle skill level change
  const handleSkillLevelChange = useCallback((level: SkillLevel) => {
    setSkillLevel(level);
    
    if (selectedTemplate) {
      const config = buildEmployeeConfig(selectedTemplate, level);
      setAgent(prev => ({
        ...prev,
        tools: config.tools || selectedTemplate.skillLevels[level].tools,
        skillLevel: level,
      }));
      setIsTestPassed(false);
    }
  }, [selectedTemplate]);

  // Handle adding a tool
  const handleAddTool = useCallback((toolId: string) => {
    if (!agent.tools.includes(toolId)) {
      setAgent(prev => ({
        ...prev,
        tools: [...prev.tools, toolId],
      }));
      setIsTestPassed(false);
    }
  }, [agent.tools]);

  // Handle removing a tool
  const handleRemoveTool = useCallback((toolId: string) => {
    setAgent(prev => ({
      ...prev,
      tools: prev.tools.filter(t => t !== toolId),
    }));
    setIsTestPassed(false);
  }, []);

  // Handle adding multiple tools (bundle)
  const handleAddBundle = useCallback((toolIds: string[]) => {
    setAgent(prev => ({
      ...prev,
      tools: [...new Set([...prev.tools, ...toolIds])],
    }));
    setIsTestPassed(false);
    toast({
      title: "Bundle added!",
      description: `Added ${toolIds.length} tools to your agent`,
    });
  }, [toast]);

  // Handle agent field updates
  const handleAgentUpdate = useCallback((updates: Partial<BuilderAgent>) => {
    setAgent(prev => ({ ...prev, ...updates }));
    setIsTestPassed(false);
  }, []);

  // Handle test completion
  const handleTestComplete = useCallback((passed: boolean) => {
    setIsTestPassed(passed);
    if (passed) {
      toast({
        title: "Test passed!",
        description: "Your agent is working correctly. Ready to deploy!",
      });
    }
  }, [toast]);

  // Handle deploy
  const handleDeploy = useCallback(() => {
    // Sync to global store for other pages
    updateBuilderAgent({
      name: agent.name,
      goal: agent.goal,
      personality: agent.personality,
      tools: agent.tools,
      modelId: agent.modelId,
      providerId: agent.providerId,
      systemPrompt: agent.systemPrompt,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    });
    setBuilderStep("complete");
    
    // Open deploy modal or navigate
    toast({
      title: "Ready to deploy!",
      description: "Choose how you want to use your agent",
    });
  }, [agent, updateBuilderAgent, setBuilderStep, toast]);

  // Handle reset
  const handleReset = useCallback(() => {
    setAgent(defaultAgent);
    setSelectedTemplate(null);
    setIsTestPassed(false);
    toast({
      title: "Builder reset",
      description: "Start fresh with a new agent",
    });
  }, [toast]);

  // Handle deploy modal
  const handleOpenDeploy = useCallback(() => {
    setDeployModalOpen(true);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onRunTests: () => {
      // Trigger test from keyboard
      toast({ title: "Running tests...", description: "Press ⌘+T" });
    },
    onSaveAgent: () => {
      handleDeploy();
    },
    onDeploy: handleOpenDeploy,
    onReset: handleReset,
    onShowShortcuts: () => setShowShortcuts(true),
    enabled: !isMobile,
  });

  // Mobile view
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-16">
          <MobileBuilder
            agent={agent}
            availableTools={availableTools}
            templates={agentEmployees}
            selectedTemplate={selectedTemplate}
            skillLevel={skillLevel}
            isTestPassed={isTestPassed}
            onTemplateSelect={handleTemplateSelect}
            onSkillLevelChange={handleSkillLevelChange}
            onAddTool={handleAddTool}
            onRemoveTool={handleRemoveTool}
            onAgentUpdate={handleAgentUpdate}
            onDeploy={handleDeploy}
            onReset={handleReset}
          />
        </main>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-16">
        <div className="h-[calc(100vh-4rem)]">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Templates */}
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <TemplatePanel
                templates={agentEmployees}
                selectedTemplate={selectedTemplate}
                skillLevel={skillLevel}
                onTemplateSelect={handleTemplateSelect}
                onSkillLevelChange={handleSkillLevelChange}
                onReset={handleReset}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Center Panel - Toolbox */}
            <ResizablePanel defaultSize={35} minSize={25}>
              <ToolboxPanel
                availableTools={availableTools}
                selectedTools={agent.tools}
                connectedToolIds={connectedToolIds}
                onAddTool={handleAddTool}
                onRemoveTool={handleRemoveTool}
                onAddBundle={handleAddBundle}
                templateTools={selectedTemplate?.requiredTools}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Panel - Preview & Test */}
            <ResizablePanel defaultSize={40} minSize={30}>
              <PreviewTestPanel
                agent={agent}
                availableTools={availableTools}
                onAgentUpdate={handleAgentUpdate}
                onTestComplete={handleTestComplete}
                onDeploy={handleDeploy}
                isTestPassed={isTestPassed}
                isTesting={isTesting}
                setIsTesting={setIsTesting}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Keyboard shortcuts button */}
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 gap-2 opacity-70 hover:opacity-100"
          onClick={() => setShowShortcuts(true)}
        >
          <Keyboard className="w-4 h-4" />
          <ShortcutHint keys={["⌘", "/"]} />
        </Button>
      </main>

      {/* Onboarding overlay */}
      {onboardingLoaded && showOnboarding && (
        <OnboardingOverlay
          onComplete={completeOnboarding}
          isFirstVisit={showOnboarding}
        />
      )}

      {/* Keyboard shortcuts dialog */}
      <KeyboardShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </div>
  );
}
