import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToolCard } from "./tool-card";
import { ToolConnectionModal } from "./tool-connection-modal";
import { 
  Search, 
  X, 
  Wrench,
  Globe,
  Mail,
  Database,
  FileText,
  SearchIcon,
  DollarSign,
  Users,
  HardDrive,
  MessageSquare,
  Share2,
  Zap,
  Palette,
  Code,
} from "lucide-react";
import type { ToolDefinition } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ToolSelectorProps {
  selectedTools: string[];
  onToolsChange: (tools: string[]) => void;
  connectedTools?: string[];
  maxTools?: number;
}

// Category icons
const categoryIcons: Record<string, any> = {
  web: Globe,
  email: Mail,
  data: Database,
  files: FileText,
  search: SearchIcon,
  finance: DollarSign,
  crm: Users,
  storage: HardDrive,
  communication: MessageSquare,
  social: Share2,
  automation: Zap,
  design: Palette,
  dev: Code,
};

// Category labels
const categoryLabels: Record<string, string> = {
  web: "Web",
  email: "Email",
  data: "Data",
  files: "Files",
  search: "Search",
  finance: "Finance",
  crm: "CRM",
  storage: "Storage",
  communication: "Communication",
  social: "Social",
  automation: "Automation",
  design: "Design",
  dev: "Development",
};

export function ToolSelector({
  selectedTools,
  onToolsChange,
  connectedTools = [],
  maxTools,
}: ToolSelectorProps) {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [connectionTool, setConnectionTool] = useState<ToolDefinition | null>(null);

  // Fetch tools from API
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await fetch("/api/tools");
        if (response.ok) {
          const data = await response.json();
          setTools(data);
        }
      } catch (error) {
        console.error("Failed to fetch tools:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, []);

  // Get unique categories from tools
  const categories = ["all", ...new Set(tools.map(t => t.category))];

  // Filter tools based on search and category
  const filteredTools = tools.filter(tool => {
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group tools by category for display
  const groupedTools = filteredTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, ToolDefinition[]>);

  const toggleTool = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      onToolsChange(selectedTools.filter(id => id !== toolId));
    } else {
      if (maxTools && selectedTools.length >= maxTools) {
        return; // Don't add if at max
      }
      onToolsChange([...selectedTools, toolId]);
    }
  };

  const handleConnect = (tool: ToolDefinition) => {
    setConnectionTool(tool);
  };

  const handleConnectionSuccess = () => {
    setConnectionTool(null);
    // Tool is now connected, could add it automatically
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Select Tools</h3>
          <Badge variant="secondary" className="ml-2">
            {selectedTools.length} selected
          </Badge>
        </div>
        {maxTools && (
          <span className="text-xs text-muted-foreground">
            Max {maxTools} tools
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
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

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0 mb-4">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3 py-1.5"
          >
            All
          </TabsTrigger>
          {categories.filter(c => c !== "all").map(category => {
            const Icon = categoryIcons[category] || Wrench;
            const count = tools.filter(t => t.category === category).length;
            return (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3 py-1.5"
              >
                <Icon className="w-3 h-3 mr-1" />
                {categoryLabels[category] || category}
                <span className="ml-1 text-muted-foreground">({count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="flex-1 mt-0 min-h-0">
          <ScrollArea className="h-[400px] pr-4">
            {selectedCategory === "all" ? (
              // Show grouped by category when "all" is selected
              Object.entries(groupedTools).map(([category, categoryTools]) => (
                <div key={category} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {(() => {
                      const Icon = categoryIcons[category] || Wrench;
                      return <Icon className="w-4 h-4 text-muted-foreground" />;
                    })()}
                    <h4 className="font-medium text-sm">
                      {categoryLabels[category] || category}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {categoryTools.length}
                    </Badge>
                  </div>
                  <div className="grid gap-2">
                    {categoryTools.map(tool => (
                      <ToolCard
                        key={tool.id}
                        tool={tool}
                        compact
                        isSelected={selectedTools.includes(tool.id)}
                        isConnected={connectedTools.includes(tool.id)}
                        onSelect={() => toggleTool(tool.id)}
                        onConnect={() => handleConnect(tool)}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Show flat list for specific category
              <div className="grid gap-2">
                {filteredTools.map(tool => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    compact
                    isSelected={selectedTools.includes(tool.id)}
                    isConnected={connectedTools.includes(tool.id)}
                    onSelect={() => toggleTool(tool.id)}
                    onConnect={() => handleConnect(tool)}
                  />
                ))}
              </div>
            )}

            {filteredTools.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-8 h-8 mb-2" />
                <p className="text-sm">No tools found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Selected Tools Summary */}
      {selectedTools.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Selected Tools</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTools.map(toolId => {
              const tool = tools.find(t => t.id === toolId);
              if (!tool) return null;
              return (
                <Badge
                  key={toolId}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {tool.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:bg-destructive/20"
                    onClick={() => toggleTool(toolId)}
                  >
                    <X className="w-2.5 h-2.5" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Connection Modal */}
      {connectionTool && (
        <ToolConnectionModal
          tool={connectionTool}
          open={!!connectionTool}
          onOpenChange={(open) => !open && setConnectionTool(null)}
          onSuccess={handleConnectionSuccess}
        />
      )}
    </div>
  );
}
