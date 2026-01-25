import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as Icons from "lucide-react";
import { 
  Package, 
  Check, 
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolBundle {
  id: string;
  name: string;
  description: string;
  tools: string[];
  category: string;
  useCases: string[];
}

interface ToolBundleSelectorProps {
  onSelect: (tools: string[]) => void;
  selectedTools?: string[];
}

// Category colors
const categoryColors: Record<string, string> = {
  research: "bg-green-500",
  email: "bg-purple-500",
  data: "bg-cyan-500",
  sales: "bg-indigo-500",
  finance: "bg-emerald-500",
  content: "bg-pink-500",
  automation: "bg-orange-500",
  legal: "bg-slate-500",
};

// Category icons
const categoryIcons: Record<string, keyof typeof Icons> = {
  research: "Search",
  email: "Mail",
  data: "Database",
  sales: "Briefcase",
  finance: "DollarSign",
  content: "FileText",
  automation: "Zap",
  legal: "Scale",
};

function getIconComponent(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.Package;
}

export function ToolBundleSelector({ onSelect, selectedTools = [] }: ToolBundleSelectorProps) {
  const [bundles, setBundles] = useState<ToolBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);

  // Fetch bundles
  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    try {
      const response = await fetch("/api/discovery/bundles");
      const data = await response.json();
      setBundles(data);
    } catch (error) {
      console.error("Failed to fetch bundles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBundle = (bundle: ToolBundle) => {
    setSelectedBundle(bundle.id);
    onSelect(bundle.tools);
  };

  // Check if bundle tools overlap with selected
  const getBundleOverlap = (bundle: ToolBundle): number => {
    const overlap = bundle.tools.filter(t => selectedTools.includes(t));
    return overlap.length / bundle.tools.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Loading bundles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Quick-Start Tool Bundles</h3>
        <Badge variant="secondary" className="ml-2">
          {bundles.length} bundles
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Select a pre-configured bundle to get started quickly with the right tools for your use case.
      </p>

      <ScrollArea className="h-[400px]">
        <div className="grid gap-3 pr-4">
          {bundles.map(bundle => {
            const IconComponent = getIconComponent(categoryIcons[bundle.category] || "Package");
            const color = categoryColors[bundle.category] || "bg-gray-500";
            const overlap = getBundleOverlap(bundle);
            const isSelected = selectedBundle === bundle.id;
            
            return (
              <Card
                key={bundle.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => handleSelectBundle(bundle)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0",
                      color
                    )}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{bundle.name}</h4>
                        {overlap > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(overlap * 100)}% match
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {bundle.description}
                      </p>
                      
                      {/* Tools */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {bundle.tools.slice(0, 4).map(tool => (
                          <Badge
                            key={tool}
                            variant={selectedTools.includes(tool) ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {selectedTools.includes(tool) && (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            {tool.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        {bundle.tools.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{bundle.tools.length - 4} more
                          </Badge>
                        )}
                      </div>
                      
                      {/* Use cases */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Use cases:</span>
                        {bundle.useCases.slice(0, 2).map((useCase, i) => (
                          <span key={i}>{useCase}{i < 1 ? "," : ""}</span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Action */}
                    <Button
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Selected
                        </>
                      ) : (
                        <>
                          Use Bundle
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
