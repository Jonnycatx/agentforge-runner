/**
 * Template Panel - Left sidebar for selecting AI employee templates
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as Icons from "lucide-react";
import {
  Search,
  X,
  Users,
  RotateCcw,
  Star,
  Zap,
  Sparkles,
  ChevronRight,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import type { AgentEmployeeTemplate, SkillLevel } from "@/lib/agent-employees";
import { employeeCategories } from "@/lib/agent-employees";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TemplatePanelProps {
  templates: AgentEmployeeTemplate[];
  selectedTemplate: AgentEmployeeTemplate | null;
  skillLevel: SkillLevel;
  onTemplateSelect: (template: AgentEmployeeTemplate) => void;
  onSkillLevelChange: (level: SkillLevel) => void;
  onReset: () => void;
}

// Get icon component by name
function getIconComponent(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.User;
}

// Skill level config
const skillLevelConfig: Record<SkillLevel, { label: string; icon: any; color: string; description: string }> = {
  basic: { 
    label: "Basic", 
    icon: Star, 
    color: "text-green-500",
    description: "Essential tools only"
  },
  intermediate: { 
    label: "Intermediate", 
    icon: Zap, 
    color: "text-blue-500",
    description: "Balanced capabilities"
  },
  advanced: { 
    label: "Advanced", 
    icon: Sparkles, 
    color: "text-purple-500",
    description: "Full power toolkit"
  },
};

export function TemplatePanel({
  templates,
  selectedTemplate,
  skillLevel,
  onTemplateSelect,
  onSkillLevelChange,
  onReset,
}: TemplatePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, AgentEmployeeTemplate[]>);

  return (
    <div className="h-full flex flex-col bg-card border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Employees</h2>
              <p className="text-xs text-muted-foreground">{templates.length} templates</p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset builder</TooltipContent>
          </Tooltip>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Skill Level Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Skill:</span>
          <div className="flex-1 flex gap-1">
            {(["basic", "intermediate", "advanced"] as SkillLevel[]).map((level) => {
              const config = skillLevelConfig[level];
              const Icon = config.icon;
              return (
                <Tooltip key={level}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={skillLevel === level ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "flex-1 h-8 text-xs",
                        skillLevel === level && config.color
                      )}
                      onClick={() => onSkillLevelChange(level)}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{config.description}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 py-2 border-b">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {employeeCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          <AnimatePresence mode="popLayout">
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
              const catInfo = employeeCategories.find(c => c.id === category);
              
              return (
                <motion.div 
                  key={category}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4"
                >
                  {selectedCategory === "all" && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {catInfo?.name || category}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {categoryTemplates.length}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {categoryTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplate?.id === template.id}
                        skillLevel={skillLevel}
                        onClick={() => onTemplateSelect(template)}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="w-8 h-8 mb-2" />
              <p className="text-sm">No templates found</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Custom Agent Option */}
      <div className="p-3 border-t bg-muted/30">
        <Button
          variant="outline"
          className="w-full justify-start h-auto py-3"
          onClick={() => onTemplateSelect({
            id: "custom",
            name: "Custom Agent",
            title: "Build from scratch",
            description: "Create a custom agent with your own configuration",
            longDescription: "",
            category: "web",
            icon: "Sparkles",
            color: "bg-gradient-to-br from-purple-500 to-pink-500",
            requiredTools: [],
            optionalTools: [],
            skillLevels: {
              basic: { description: "", capabilities: [], tools: [] },
              intermediate: { description: "", capabilities: [], tools: [] },
              advanced: { description: "", capabilities: [], tools: [] },
            },
            defaultConfig: {},
            systemPrompt: "",
            useCases: [],
            autonomyLevel: "supervised",
            requiresApproval: [],
          } as AgentEmployeeTemplate)}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mr-3">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">Custom Agent</p>
            <p className="text-xs text-muted-foreground">Start from scratch</p>
          </div>
        </Button>
      </div>
    </div>
  );
}

// Template Card Component
interface TemplateCardProps {
  template: AgentEmployeeTemplate;
  isSelected: boolean;
  skillLevel: SkillLevel;
  onClick: () => void;
}

function TemplateCard({ template, isSelected, skillLevel, onClick }: TemplateCardProps) {
  const IconComponent = getIconComponent(template.icon);
  const toolCount = template.skillLevels[skillLevel].tools.length;

  return (
    <motion.div
      layout
      className={cn(
        "relative p-3 rounded-lg border cursor-pointer transition-all",
        "hover:border-primary/50 hover:bg-accent/50",
        isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          template.color,
          "text-white"
        )}>
          <IconComponent className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{template.name}</h3>
            {isSelected && (
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {template.title}
          </p>
          
          {/* Tool count */}
          <div className="flex items-center gap-1 mt-2">
            <Wrench className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {toolCount} tools
            </span>
            {template.industryVariants && template.industryVariants.length > 0 && (
              <>
                <span className="text-muted-foreground mx-1">•</span>
                <span className="text-[10px] text-muted-foreground">
                  {template.industryVariants.length} variants
                </span>
              </>
            )}
          </div>
        </div>

        <ChevronRight className={cn(
          "w-4 h-4 text-muted-foreground transition-transform",
          isSelected && "text-primary rotate-90"
        )} />
      </div>
    </motion.div>
  );
}
