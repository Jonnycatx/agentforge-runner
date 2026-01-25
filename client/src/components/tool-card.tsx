import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Lock,
  Plus,
  Settings,
  Zap,
} from "lucide-react";
import * as Icons from "lucide-react";
import type { ToolDefinition } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: ToolDefinition;
  isConnected?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onConnect?: () => void;
  onConfigure?: () => void;
  compact?: boolean;
}

// Get icon component by name
function getIconComponent(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.Wrench;
}

// Category colors matching the design system
const categoryColors: Record<string, string> = {
  web: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  email: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  data: "bg-green-500/10 text-green-600 dark:text-green-400",
  files: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  search: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  finance: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  crm: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  storage: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  communication: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  social: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  automation: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  design: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  dev: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

export function ToolCard({
  tool,
  isConnected = false,
  isSelected = false,
  onSelect,
  onConnect,
  onConfigure,
  compact = false,
}: ToolCardProps) {
  const IconComponent = getIconComponent(tool.icon);
  const needsAuth = tool.authType !== "none";
  const categoryColor = categoryColors[tool.category] || categoryColors.dev;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
        onClick={onSelect}
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", categoryColor)}>
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{tool.name}</span>
            {isConnected && (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            )}
            {needsAuth && !isConnected && (
              <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        </div>
        {isSelected ? (
          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
        ) : (
          <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "h-full transition-all duration-200",
        isSelected && "ring-2 ring-primary",
        onSelect && "cursor-pointer hover:shadow-md"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", categoryColor)}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{tool.name}</h3>
              {isConnected && (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {tool.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className={cn("text-xs", categoryColor)}>
                {tool.category}
              </Badge>
              {needsAuth && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="w-2.5 h-2.5 mr-1" />
                  {tool.authType === "oauth2" ? "OAuth" : "API Key"}
                </Badge>
              )}
              {tool.isPremium && (
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                  <Zap className="w-2.5 h-2.5 mr-1" />
                  Premium
                </Badge>
              )}
            </div>
          </div>
        </div>

        {(onConnect || onConfigure) && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            {needsAuth && !isConnected && onConnect && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onConnect();
                }}
              >
                Connect
              </Button>
            )}
            {isConnected && onConfigure && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigure();
                }}
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
            {onSelect && (
              <Button
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
              >
                {isSelected ? "Selected" : "Add Tool"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
