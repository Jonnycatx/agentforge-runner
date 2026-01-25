import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  ChevronRight, 
  ChevronDown,
  Plus,
  Check,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ToolRecommendation {
  toolId: string;
  name: string;
  category: string;
  score: number;
  reasons: string[];
  isEssential: boolean;
  authRequired: boolean;
}

interface RecommendedToolsBannerProps {
  query?: string;
  currentTools: string[];
  onAddTool: (toolId: string) => void;
  onAddAll: (toolIds: string[]) => void;
  className?: string;
}

export function RecommendedToolsBanner({
  query,
  currentTools,
  onAddTool,
  onAddAll,
  className,
}: RecommendedToolsBannerProps) {
  const [recommendations, setRecommendations] = useState<{
    essential: ToolRecommendation[];
    recommended: ToolRecommendation[];
    explanation: string;
    warnings: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [lastQuery, setLastQuery] = useState("");

  // Fetch recommendations when query changes
  useEffect(() => {
    if (query && query !== lastQuery && query.length > 10) {
      fetchRecommendations(query);
      setLastQuery(query);
    }
  }, [query]);

  const fetchRecommendations = async (userQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/discovery/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });
      const data = await response.json();
      
      if (data.recommendations) {
        setRecommendations({
          essential: data.recommendations.essential || [],
          recommended: data.recommendations.recommended || [],
          explanation: data.recommendations.explanation || "",
          warnings: data.recommendations.warnings || [],
        });
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter out tools already added
  const missingEssential = recommendations?.essential.filter(
    t => !currentTools.includes(t.toolId)
  ) || [];
  const missingRecommended = recommendations?.recommended.filter(
    t => !currentTools.includes(t.toolId)
  ) || [];
  
  const allMissing = [...missingEssential, ...missingRecommended];

  if (!recommendations || allMissing.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20",
        className
      )}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  Recommended Tools
                  {missingEssential.length > 0 && (
                    <Badge variant="default" className="text-xs">
                      {missingEssential.length} essential
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {recommendations.explanation || "Based on your description"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {allMissing.length > 1 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAll(allMissing.map(t => t.toolId));
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add All ({allMissing.length})
                </Button>
              )}
              {isOpen ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Warnings */}
            {recommendations.warnings.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-yellow-700 dark:text-yellow-400">
                  {recommendations.warnings.join(" ")}
                </div>
              </div>
            )}
            
            {/* Essential Tools */}
            {missingEssential.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Essential for Your Task
                </h4>
                <div className="flex flex-wrap gap-2">
                  {missingEssential.map(tool => (
                    <ToolBadge
                      key={tool.toolId}
                      tool={tool}
                      onAdd={onAddTool}
                      isAdded={currentTools.includes(tool.toolId)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Recommended Tools */}
            {missingRecommended.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Also Recommended</h4>
                <div className="flex flex-wrap gap-2">
                  {missingRecommended.slice(0, 5).map(tool => (
                    <ToolBadge
                      key={tool.toolId}
                      tool={tool}
                      onAdd={onAddTool}
                      isAdded={currentTools.includes(tool.toolId)}
                      variant="secondary"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Individual tool badge component
function ToolBadge({
  tool,
  onAdd,
  isAdded,
  variant = "default",
}: {
  tool: ToolRecommendation;
  onAdd: (toolId: string) => void;
  isAdded: boolean;
  variant?: "default" | "secondary";
}) {
  return (
    <Button
      variant={isAdded ? "default" : "outline"}
      size="sm"
      className={cn(
        "h-auto py-1.5 px-3",
        variant === "secondary" && !isAdded && "bg-background"
      )}
      onClick={() => !isAdded && onAdd(tool.toolId)}
      disabled={isAdded}
    >
      {isAdded ? (
        <Check className="w-3 h-3 mr-1.5" />
      ) : (
        <Plus className="w-3 h-3 mr-1.5" />
      )}
      {tool.name}
      {tool.authRequired && !isAdded && (
        <Badge variant="outline" className="ml-1.5 text-xs py-0 px-1">
          auth
        </Badge>
      )}
    </Button>
  );
}
