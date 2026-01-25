/**
 * Mobile Builder - Optimized experience for small screens
 * Uses bottom sheet navigation and swipeable panels
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Users,
  Wrench,
  Eye,
  Play,
  Rocket,
  ChevronUp,
  CheckCircle2,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { BuilderAgent } from "@/pages/unified-builder";
import type { ToolDefinition } from "@shared/schema";
import type { AgentEmployeeTemplate, SkillLevel } from "@/lib/agent-employees";

interface MobileBuilderProps {
  agent: BuilderAgent;
  availableTools: ToolDefinition[];
  templates: AgentEmployeeTemplate[];
  selectedTemplate: AgentEmployeeTemplate | null;
  skillLevel: SkillLevel;
  isTestPassed: boolean;
  onTemplateSelect: (template: AgentEmployeeTemplate) => void;
  onSkillLevelChange: (level: SkillLevel) => void;
  onAddTool: (toolId: string) => void;
  onRemoveTool: (toolId: string) => void;
  onAgentUpdate: (updates: Partial<BuilderAgent>) => void;
  onDeploy: () => void;
  onReset: () => void;
}

export function MobileBuilder({
  agent,
  availableTools,
  templates,
  selectedTemplate,
  skillLevel,
  isTestPassed,
  onTemplateSelect,
  onSkillLevelChange,
  onAddTool,
  onRemoveTool,
  onAgentUpdate,
  onDeploy,
  onReset,
}: MobileBuilderProps) {
  const [activeTab, setActiveTab] = useState("templates");
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Get selected tool objects
  const selectedToolObjects = agent.tools
    .map(id => availableTools.find(t => t.id === id))
    .filter((t): t is ToolDefinition => t !== undefined);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            {selectedTemplate ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <Users className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h1 className="font-semibold text-sm">{agent.name}</h1>
            <p className="text-xs text-muted-foreground">
              {agent.tools.length} tools configured
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isTestPassed && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Ready
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={onReset}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden">
          {/* Templates Tab */}
          <TabsContent value="templates" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                <h2 className="text-lg font-semibold mb-4">Choose AI Employee</h2>
                {templates.map(template => (
                  <MobileTemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    skillLevel={skillLevel}
                    onClick={() => {
                      onTemplateSelect(template);
                      setActiveTab("tools");
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {/* Selected Tools */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3">
                    Selected Tools ({agent.tools.length})
                  </h3>
                  {agent.tools.length === 0 ? (
                    <div className="p-6 text-center rounded-lg border-2 border-dashed">
                      <Wrench className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Tap tools below to add them
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedToolObjects.map(tool => (
                        <Badge
                          key={tool.id}
                          variant="secondary"
                          className="pl-2 pr-1 py-1.5"
                        >
                          {tool.name}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1"
                            onClick={() => onRemoveTool(tool.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Tools */}
                <h3 className="text-sm font-medium mb-3">Available Tools</h3>
                <div className="space-y-2">
                  {availableTools.map(tool => (
                    <MobileToolCard
                      key={tool.id}
                      tool={tool}
                      isSelected={agent.tools.includes(tool.id)}
                      onToggle={() => {
                        if (agent.tools.includes(tool.id)) {
                          onRemoveTool(tool.id);
                        } else {
                          onAddTool(tool.id);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                <h2 className="text-lg font-semibold">Agent Preview</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <input
                      type="text"
                      value={agent.name}
                      onChange={(e) => onAgentUpdate({ name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Goal</label>
                    <textarea
                      value={agent.goal}
                      onChange={(e) => onAgentUpdate({ goal: e.target.value })}
                      rows={3}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tools ({agent.tools.length})</label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedToolObjects.map(tool => (
                        <Badge key={tool.id} variant="secondary" className="text-xs">
                          {tool.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Model</label>
                    <div className="mt-1 px-3 py-2 rounded-lg border bg-muted/50">
                      <span className="text-sm">{agent.modelId}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </div>

        {/* Bottom Navigation */}
        <div className="border-t bg-card p-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="templates" className="gap-1.5">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Tools</span>
              {agent.tools.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                  {agent.tools.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Floating Action Button */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-24 right-4 z-10"
        >
          <Button
            size="lg"
            onClick={() => setShowBottomSheet(true)}
            disabled={agent.tools.length === 0}
            className="rounded-full h-14 w-14 shadow-lg"
          >
            <Play className="w-6 h-6" />
          </Button>
        </motion.div>

        {/* Test & Deploy Sheet */}
        <Sheet open={showBottomSheet} onOpenChange={setShowBottomSheet}>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader>
              <SheetTitle>Test & Deploy</SheetTitle>
              <SheetDescription>
                Run tests and deploy your agent
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <Button className="w-full h-14 text-lg" variant="outline">
                <Play className="w-5 h-5 mr-2" />
                Run Quick Tests
              </Button>

              <Button
                className="w-full h-14 text-lg"
                disabled={!isTestPassed}
                onClick={() => {
                  setShowBottomSheet(false);
                  onDeploy();
                }}
              >
                <Rocket className="w-5 h-5 mr-2" />
                Deploy Agent
              </Button>

              {!isTestPassed && (
                <p className="text-center text-sm text-muted-foreground">
                  Run tests first to enable deployment
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </Tabs>
    </div>
  );
}

// Mobile Template Card
interface MobileTemplateCardProps {
  template: AgentEmployeeTemplate;
  isSelected: boolean;
  skillLevel: SkillLevel;
  onClick: () => void;
}

function MobileTemplateCard({ template, isSelected, skillLevel, onClick }: MobileTemplateCardProps) {
  const toolCount = template.skillLevels[skillLevel].tools.length;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all",
        "active:scale-[0.98]",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          template.color,
          "text-white"
        )}>
          <Users className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{template.name}</h3>
            {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {template.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {toolCount} tools
            </Badge>
          </div>
        </div>
      </div>
    </button>
  );
}

// Mobile Tool Card
interface MobileToolCardProps {
  tool: ToolDefinition;
  isSelected: boolean;
  onToggle: () => void;
}

function MobileToolCard({ tool, isSelected, onToggle }: MobileToolCardProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full p-3 rounded-lg border text-left transition-all",
        "active:scale-[0.98]",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <Wrench className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{tool.name}</h4>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {tool.description}
          </p>
        </div>
        {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
      </div>
    </button>
  );
}

/**
 * Hook to detect mobile viewport
 */
export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}
