/**
 * Toolbox Panel - Clean, user-friendly design showing all 250+ tools
 * - Single source of truth for all tools
 * - Smart category organization
 * - Search, filter, and quick add
 * - Hover previews and recommendations
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Search,
  X,
  Wrench,
  ChevronDown,
  ChevronRight,
  Plus,
  CheckCircle2,
  Lock,
  Trash2,
  GripVertical,
  Sparkles,
  Globe,
  Mail,
  Database,
  FileText,
  DollarSign,
  SearchIcon,
  Zap,
  Package,
  Undo2,
  RotateCcw,
  Star,
  Users,
  Briefcase,
  Share2,
  Heart,
  Plane,
  Palette,
  GraduationCap,
  Shield,
  BookOpen,
  Code,
  Wand2,
  Brain,
  PenTool,
  Megaphone,
  MessageSquare,
  ClipboardList,
  Scale,
  Headphones,
  Eye,
  Filter,
  LayoutGrid,
  List,
  TrendingUp,
} from "lucide-react";
import type { ToolDefinition } from "@shared/schema";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toolBundles, getRecommendedBundles, type ToolBundle } from "./tool-bundles";
import * as LucideIcons from "lucide-react";

interface ToolboxPanelProps {
  availableTools: ToolDefinition[];
  selectedTools: string[];
  connectedToolIds: string[];
  onAddTool: (toolId: string) => void;
  onRemoveTool: (toolId: string) => void;
  onAddBundle?: (tools: string[]) => void;
  templateTools?: string[];
  agentGoal?: string;
}

// Recently added tools marked as "new"
const NEW_TOOLS = new Set([
  "daily_planner", "task_router", "cross_agent_summary", "reminder_system",
  "habit_tracker", "goal_tracker", "daily_briefing", "burnout_checker",
  "article_writer", "seo_optimizer", "ad_copy_generator", "newsletter_writer",
  "video_script_writer", "campaign_planner", "funnel_optimizer",
  "meal_planner", "workout_generator", "sleep_analyzer", "meditation_generator",
  "flight_search", "hotel_search", "itinerary_optimizer", "packing_list_generator",
  "image_prompt_engineer", "branding_kit_creator", "course_recommender",
  "concept_explainer", "quiz_flashcard_generator", "phishing_detector",
  "password_analyzer", "breach_monitor", "genre_brainstormer", "outline_builder",
  "world_builder", "character_creator", "chapter_drafter", "logline_refiner",
  "beat_sheet_generator", "screenplay_formatter", "lyric_generator",
  "chord_suggester", "hook_optimizer", "natural_language_to_code",
  "debug_error_fixer", "code_refactor_optimizer", "api_connector_builder",
  "prompt_structure_generator", "few_shot_curator", "prompt_chain_orchestrator",
  "tool_schema_formatter", "meta_prompt_generator",
  // Personal Memory & Life Assistant tools (THE ULTIMATE AGENT)
  "desktop_activity_watcher", "screen_ocr_capture", "file_system_monitor",
  "daily_log_creator", "habit_pattern_learner", "proactive_reminder_engine",
  "contextual_suggestion_engine", "memory_query_search", "personal_knowledge_base",
  "ai_conversation_logger", "cross_device_sync", "privacy_control_center",
  "smart_notification_hub", "life_timeline_viewer", "meeting_context_preparer",
  "focus_time_optimizer", "relationship_tracker", "weekly_monthly_review",
]);

// Category configuration with icons and colors - all categories from schema
const CATEGORY_CONFIG: Record<string, { icon: any; label: string; color: string; priority: number }> = {
  // Personal Memory - Most powerful agent (priority 1)
  memory: { icon: Brain, label: "Personal Memory & Life", color: "bg-gradient-to-r from-violet-500 to-purple-600", priority: 1 },
  // Other categories sorted by count
  creative: { icon: Palette, label: "Creative & Writing", color: "bg-fuchsia-500", priority: 2 },
  finance: { icon: DollarSign, label: "Finance & Trading", color: "bg-emerald-500", priority: 3 },
  data: { icon: Database, label: "Data & Analysis", color: "bg-cyan-500", priority: 4 },
  social: { icon: Share2, label: "Social Media", color: "bg-pink-500", priority: 5 },
  email: { icon: Mail, label: "Email", color: "bg-purple-500", priority: 6 },
  web: { icon: Globe, label: "Web & Browser", color: "bg-blue-500", priority: 7 },
  sales: { icon: Briefcase, label: "Sales & Prospecting", color: "bg-indigo-500", priority: 8 },
  hr: { icon: Users, label: "HR & Recruiting", color: "bg-teal-500", priority: 9 },
  prompts: { icon: Wand2, label: "Prompt Engineering", color: "bg-violet-600", priority: 10 },
  development: { icon: Code, label: "Code & Scripts", color: "bg-green-600", priority: 11 },
  search: { icon: SearchIcon, label: "Research & Search", color: "bg-green-500", priority: 12 },
  productivity: { icon: Brain, label: "Productivity", color: "bg-purple-600", priority: 13 },
  marketing: { icon: Megaphone, label: "Marketing", color: "bg-orange-600", priority: 14 },
  learning: { icon: GraduationCap, label: "Learning", color: "bg-blue-600", priority: 15 },
  travel: { icon: Plane, label: "Travel", color: "bg-sky-500", priority: 16 },
  health: { icon: Heart, label: "Health & Wellness", color: "bg-red-500", priority: 17 },
  content: { icon: PenTool, label: "Content Creation", color: "bg-rose-500", priority: 18 },
  security: { icon: Shield, label: "Security", color: "bg-slate-600", priority: 19 },
  files: { icon: FileText, label: "Files", color: "bg-orange-500", priority: 20 },
  automation: { icon: Zap, label: "Automation", color: "bg-amber-500", priority: 21 },
  communication: { icon: MessageSquare, label: "Communication", color: "bg-blue-400", priority: 22 },
  crm: { icon: Users, label: "CRM", color: "bg-indigo-400", priority: 23 },
  storage: { icon: Database, label: "Storage", color: "bg-gray-500", priority: 24 },
  design: { icon: Palette, label: "Design", color: "bg-violet-500", priority: 25 },
  dev: { icon: Code, label: "Development", color: "bg-green-700", priority: 26 },
};

// Smart recommendations based on goal keywords
const GOAL_KEYWORDS: Record<string, string[]> = {
  task: ["daily_planner", "task_router", "reminder_system", "goal_tracker"],
  email: ["email_read", "email_send", "email_summarize", "email_search"],
  research: ["web_search", "web_scrape", "pdf_read", "news_search"],
  data: ["csv_read", "csv_write", "data_transform", "calculator"],
  social: ["content_idea_generator", "caption_generator", "smart_scheduler"],
  sales: ["lead_list_generator", "company_enrichment", "contact_finder"],
  code: ["natural_language_to_code", "debug_error_fixer", "code_refactor_optimizer"],
  write: ["article_writer", "chapter_drafter", "lyric_generator"],
  finance: ["stock_data_fetcher", "calculator", "budget_tracker"],
  automat: ["workflow_orchestrator", "browser_automation", "web_scrape"],
  // Personal Memory & Life Assistant keywords
  memory: ["memory_query_search", "daily_log_creator", "personal_knowledge_base", "ai_conversation_logger"],
  life: ["daily_log_creator", "habit_pattern_learner", "life_timeline_viewer", "weekly_monthly_review"],
  remind: ["proactive_reminder_engine", "smart_notification_hub", "relationship_tracker"],
  focus: ["focus_time_optimizer", "desktop_activity_watcher", "habit_pattern_learner"],
  pattern: ["habit_pattern_learner", "contextual_suggestion_engine", "weekly_monthly_review"],
  meeting: ["meeting_context_preparer", "calendar_events", "relationship_tracker"],
  learn: ["habit_pattern_learner", "personal_knowledge_base", "ai_conversation_logger"],
  second: ["personal_knowledge_base", "memory_query_search", "daily_log_creator"],
  brain: ["personal_knowledge_base", "memory_query_search", "habit_pattern_learner"],
  track: ["desktop_activity_watcher", "file_system_monitor", "relationship_tracker"],
};

export function ToolboxPanel({
  availableTools,
  selectedTools,
  connectedToolIds,
  onAddTool,
  onRemoveTool,
  onAddBundle,
  templateTools = [],
  agentGoal = "",
}: ToolboxPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["web", "email", "search", "data"]));
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showBundles, setShowBundles] = useState(true);
  const [toolHistory, setToolHistory] = useState<{ action: 'add' | 'remove'; toolId: string }[]>([]);
  const [viewMode, setViewMode] = useState<'categories' | 'all'>('categories');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Smart recommendations based on goal
  const recommendedTools = useMemo(() => {
    if (!agentGoal) return [];
    const goalLower = agentGoal.toLowerCase();
    const matches: string[] = [];
    
    Object.entries(GOAL_KEYWORDS).forEach(([keyword, tools]) => {
      if (goalLower.includes(keyword)) {
        matches.push(...tools);
      }
    });
    
    return [...new Set(matches)]
      .filter(t => !selectedTools.includes(t) && availableTools.some(at => at.id === t))
      .slice(0, 6);
  }, [agentGoal, selectedTools, availableTools]);

  // Get recommended bundles
  const recommendedBundles = useMemo(() => {
    return getRecommendedBundles(selectedTools).slice(0, 4);
  }, [selectedTools]);

  // Filter tools
  const filteredTools = useMemo(() => {
    let tools = availableTools;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      tools = tools.filter(tool =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query) ||
        tool.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    if (activeFilter) {
      tools = tools.filter(tool => tool.category === activeFilter);
    }
    
    return tools;
  }, [availableTools, searchQuery, activeFilter]);

  // Group tools by category
  const groupedTools = useMemo(() => {
    const groups: Record<string, ToolDefinition[]> = {};
    
    filteredTools.forEach(tool => {
      const category = tool.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tool);
    });
    
    // Sort categories by priority
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const priorityA = CATEGORY_CONFIG[a]?.priority || 99;
      const priorityB = CATEGORY_CONFIG[b]?.priority || 99;
      return priorityA - priorityB;
    });
    
    return { groups, sortedCategories };
  }, [filteredTools]);

  // Get category stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    availableTools.forEach(tool => {
      stats[tool.category] = (stats[tool.category] || 0) + 1;
    });
    return stats;
  }, [availableTools]);

  // Selected tool objects
  const selectedToolObjects = useMemo(() => {
    return selectedTools
      .map(id => availableTools.find(t => t.id === id))
      .filter((t): t is ToolDefinition => t !== undefined);
  }, [selectedTools, availableTools]);

  // Dragged tool
  const draggedTool = useMemo(() => {
    if (!activeDragId) return null;
    return availableTools.find(t => t.id === activeDragId) || null;
  }, [activeDragId, availableTools]);

  // Handlers
  const handleAddTool = useCallback((toolId: string) => {
    onAddTool(toolId);
    setToolHistory(prev => [...prev.slice(-19), { action: 'add', toolId }]);
  }, [onAddTool]);

  const handleRemoveTool = useCallback((toolId: string) => {
    onRemoveTool(toolId);
    setToolHistory(prev => [...prev.slice(-19), { action: 'remove', toolId }]);
  }, [onRemoveTool]);

  const handleUndo = useCallback(() => {
    const lastAction = toolHistory[toolHistory.length - 1];
    if (!lastAction) return;
    
    if (lastAction.action === 'add') {
      onRemoveTool(lastAction.toolId);
    } else {
      onAddTool(lastAction.toolId);
    }
    setToolHistory(prev => prev.slice(0, -1));
  }, [toolHistory, onAddTool, onRemoveTool]);

  const handleReset = useCallback(() => {
    selectedTools.forEach(toolId => {
      if (!templateTools.includes(toolId)) {
        onRemoveTool(toolId);
      }
    });
    setToolHistory([]);
  }, [selectedTools, templateTools, onRemoveTool]);

  const handleAddBundle = (bundle: ToolBundle) => {
    if (onAddBundle) {
      onAddBundle(bundle.tools);
    } else {
      bundle.tools.forEach(toolId => {
        if (!selectedTools.includes(toolId)) {
          handleAddTool(toolId);
        }
      });
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && over.id === "drop-zone") {
      const toolId = active.id as string;
      if (!selectedTools.includes(toolId)) {
        handleAddTool(toolId);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col bg-background border-r">
        {/* Header */}
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Toolbox</h2>
                <p className="text-[11px] text-muted-foreground">
                  {availableTools.length} tools • {Object.keys(categoryStats).length} categories
                </p>
              </div>
            </div>
            
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleUndo}
                    disabled={toolHistory.length === 0}
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleReset}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-8 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Quick filters */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            <Button
              variant={activeFilter === null ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[11px] px-2 shrink-0"
              onClick={() => setActiveFilter(null)}
            >
              All ({availableTools.length})
            </Button>
            {Object.entries(categoryStats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([cat, count]) => {
                const config = CATEGORY_CONFIG[cat];
                return (
                  <Button
                    key={cat}
                    variant={activeFilter === cat ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2 shrink-0 gap-1"
                    onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                  >
                    {config?.label || cat} ({count})
                  </Button>
                );
              })}
          </div>
        </div>

        {/* Selected Tools Drop Zone */}
        <ToolDropZone
          selectedTools={selectedToolObjects}
          templateTools={templateTools}
          onRemoveTool={handleRemoveTool}
          isOver={activeDragId !== null}
        />

        {/* Recommendations */}
        {recommendedTools.length > 0 && !searchQuery && !activeFilter && (
          <div className="px-3 py-2 border-b bg-amber-500/5">
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-3 h-3 text-amber-500" />
              <span className="text-[11px] font-medium">Recommended for you</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {recommendedTools.map(toolId => {
                const tool = availableTools.find(t => t.id === toolId);
                if (!tool) return null;
                return (
                  <Button
                    key={toolId}
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] gap-1"
                    onClick={() => handleAddTool(toolId)}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    {tool.name}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Add Bundles */}
        {showBundles && recommendedBundles.length > 0 && selectedTools.length < 5 && !searchQuery && (
          <div className="px-3 py-2 border-b bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Package className="w-3 h-3 text-primary" />
                <span className="text-[11px] font-medium">Quick Bundles</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setShowBundles(false)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {recommendedBundles.map(bundle => {
                const BundleIcon = (LucideIcons as any)[bundle.icon] || Package;
                const newCount = bundle.tools.filter(t => !selectedTools.includes(t)).length;
                return (
                  <Button
                    key={bundle.id}
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-7 text-[11px] gap-1.5"
                    onClick={() => handleAddBundle(bundle)}
                  >
                    <div className={cn("w-4 h-4 rounded flex items-center justify-center text-white", bundle.color)}>
                      <BundleIcon className="w-2.5 h-2.5" />
                    </div>
                    {bundle.name}
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">
                      +{newCount}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tools List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredTools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No tools found</p>
                <p className="text-xs">Try a different search term</p>
                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setActiveFilter(null); }}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                {groupedTools.sortedCategories.map(category => {
                  const tools = groupedTools.groups[category];
                  const config = CATEGORY_CONFIG[category] || {
                    icon: Wrench,
                    label: category.charAt(0).toUpperCase() + category.slice(1),
                    color: "bg-gray-500",
                    priority: 99,
                  };
                  const Icon = config.icon;
                  const isExpanded = expandedCategories.has(category);
                  const hasNewTools = tools.some(t => NEW_TOOLS.has(t.id));
                  const selectedInCategory = tools.filter(t => selectedTools.includes(t.id)).length;

                  return (
                    <div key={category} className="mb-1">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className={cn("w-6 h-6 rounded flex items-center justify-center text-white shrink-0", config.color)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium flex-1 text-left">{config.label}</span>
                        <div className="flex items-center gap-1">
                          {hasNewTools && (
                            <Badge className="bg-green-500 text-white text-[9px] h-4 px-1">NEW</Badge>
                          )}
                          {selectedInCategory > 0 && (
                            <Badge variant="default" className="text-[9px] h-4 px-1.5">
                              {selectedInCategory}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {tools.length}
                          </Badge>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-2 pl-2 border-l space-y-0.5 py-1">
                              {tools.map(tool => (
                                <ToolItem
                                  key={tool.id}
                                  tool={tool}
                                  isSelected={selectedTools.includes(tool.id)}
                                  isConnected={connectedToolIds.includes(tool.id)}
                                  isRequired={templateTools.includes(tool.id)}
                                  isNew={NEW_TOOLS.has(tool.id)}
                                  onAdd={() => handleAddTool(tool.id)}
                                  onRemove={() => handleRemoveTool(tool.id)}
                                  isDraggable={!selectedTools.includes(tool.id)}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t bg-muted/30">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{selectedTools.length} selected</span>
            <span>{filteredTools.length} shown</span>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedTool ? (
          <div className="bg-card border-2 border-primary shadow-xl rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{draggedTool.name}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Drop Zone Component
interface ToolDropZoneProps {
  selectedTools: ToolDefinition[];
  templateTools: string[];
  onRemoveTool: (toolId: string) => void;
  isOver: boolean;
}

function ToolDropZone({ selectedTools, templateTools, onRemoveTool, isOver }: ToolDropZoneProps) {
  const { setNodeRef, isOver: isOverDropZone } = useDroppable({ id: "drop-zone" });
  const showHighlight = isOver || isOverDropZone;

  return (
    <div className="p-3 border-b">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Agent Tools</span>
        </div>
        <Badge variant="secondary" className="text-[10px] h-4">
          {selectedTools.length}
        </Badge>
      </div>

      <motion.div
        ref={setNodeRef}
        animate={showHighlight ? { scale: 1.01 } : { scale: 1 }}
        className={cn(
          "min-h-[80px] rounded-lg border-2 border-dashed p-2 transition-all duration-150",
          selectedTools.length === 0 && !showHighlight
            ? "border-muted-foreground/20 bg-muted/30"
            : "border-primary/20 bg-primary/5",
          showHighlight && "border-green-500 bg-green-500/10 shadow-[0_0_0_2px_rgba(34,197,94,0.15)]"
        )}
      >
        {selectedTools.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-3">
            <motion.div animate={showHighlight ? { scale: 1.1 } : { scale: 1 }}>
              {showHighlight ? (
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-1">
                  <Plus className="w-5 h-5 text-green-500" />
                </div>
              ) : (
                <GripVertical className="w-6 h-6 mb-1 opacity-50" />
              )}
            </motion.div>
            <p className="text-[11px] font-medium">{showHighlight ? "Drop here!" : "Drag tools here"}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence mode="popLayout">
              {selectedTools.map(tool => (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  layout
                >
                  <Badge
                    variant="secondary"
                    className={cn(
                      "pl-2 pr-1 py-1 flex items-center gap-1 text-[11px]",
                      templateTools.includes(tool.id) && "bg-primary/10"
                    )}
                  >
                    <span className="max-w-[100px] truncate">{tool.name}</span>
                    {templateTools.includes(tool.id) ? (
                      <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                    ) : (
                      <button
                        onClick={() => onRemoveTool(tool.id)}
                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-destructive/20 hover:text-destructive"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Tool Item Component
interface ToolItemProps {
  tool: ToolDefinition;
  isSelected: boolean;
  isConnected: boolean;
  isRequired: boolean;
  isNew: boolean;
  onAdd: () => void;
  onRemove: () => void;
  isDraggable: boolean;
}

function ToolItem({
  tool,
  isSelected,
  isConnected,
  isRequired,
  isNew,
  onAdd,
  onRemove,
  isDraggable,
}: ToolItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: tool.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const needsAuth = tool.authType !== "none";

  return (
    <HoverCard openDelay={500} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            "flex items-center gap-2 p-1.5 rounded-md transition-all group",
            "hover:bg-accent",
            isSelected && "bg-primary/5",
            isDragging && "shadow-lg z-50",
            isDraggable && "cursor-grab active:cursor-grabbing"
          )}
          {...attributes}
          {...listeners}
        >
          {isDraggable && (
            <GripVertical className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium truncate">{tool.name}</span>
              {isNew && (
                <span className="bg-green-500 text-white text-[8px] px-1 rounded">NEW</span>
              )}
              {isConnected && <CheckCircle2 className="w-2.5 h-2.5 text-green-500 shrink-0" />}
              {needsAuth && !isConnected && <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{tool.description}</p>
          </div>

          {isSelected ? (
            isRequired ? (
              <Badge variant="outline" className="text-[9px] h-4 shrink-0">Req</Badge>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-primary/20 text-primary shrink-0 transition-opacity"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
      </HoverCardTrigger>
      
      <HoverCardContent side="right" align="start" className="w-72 p-0">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">{tool.name}</h4>
          <p className="text-xs text-muted-foreground mt-1">{tool.longDescription || tool.description}</p>
        </div>
        {tool.tags && tool.tags.length > 0 && (
          <div className="p-2 flex flex-wrap gap-1">
            {tool.tags.slice(0, 6).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        )}
        {!isSelected && (
          <div className="p-2 border-t">
            <Button size="sm" className="w-full h-7 text-xs" onClick={onAdd}>
              <Plus className="w-3 h-3 mr-1" /> Add Tool
            </Button>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
