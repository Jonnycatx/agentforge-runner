import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as Icons from "lucide-react";
import { 
  Wrench, 
  ChevronRight,
  Star,
  Shield,
  Zap,
} from "lucide-react";
import type { AgentEmployeeTemplate, SkillLevel } from "@/lib/agent-employees";
import { cn } from "@/lib/utils";

interface EmployeeCardProps {
  employee: AgentEmployeeTemplate;
  onSelect?: (employee: AgentEmployeeTemplate) => void;
  isSelected?: boolean;
  showDetails?: boolean;
}

// Get icon component by name
function getIconComponent(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.User;
}

// Autonomy level badges
const autonomyBadges: Record<string, { label: string; color: string; icon: any }> = {
  supervised: { label: "Supervised", color: "bg-yellow-500/10 text-yellow-600", icon: Shield },
  "semi-autonomous": { label: "Semi-Auto", color: "bg-blue-500/10 text-blue-600", icon: Zap },
  autonomous: { label: "Autonomous", color: "bg-green-500/10 text-green-600", icon: Star },
};

export function EmployeeCard({
  employee,
  onSelect,
  isSelected = false,
  showDetails = false,
}: EmployeeCardProps) {
  const IconComponent = getIconComponent(employee.icon);
  const autonomy = autonomyBadges[employee.autonomyLevel];
  const AutonmyIcon = autonomy.icon;

  return (
    <Card
      className={cn(
        "h-full transition-all duration-200 cursor-pointer hover:shadow-lg",
        isSelected && "ring-2 ring-primary shadow-lg",
        "group"
      )}
      onClick={() => onSelect?.(employee)}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            employee.color,
            "text-white"
          )}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-0.5 group-hover:text-primary transition-colors">
              {employee.name}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {employee.title}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {employee.description}
        </p>

        {/* Tools */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Required Tools</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {employee.requiredTools.slice(0, 4).map(tool => (
              <Badge
                key={tool}
                variant="secondary"
                className="text-xs px-2 py-0"
              >
                {tool.replace(/_/g, " ")}
              </Badge>
            ))}
            {employee.requiredTools.length > 4 && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                +{employee.requiredTools.length - 4}
              </Badge>
            )}
          </div>
        </div>

        {/* Badges Row */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-xs", autonomy.color)}>
            <AutonmyIcon className="w-3 h-3 mr-1" />
            {autonomy.label}
          </Badge>
          
          {employee.industryVariants && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="text-xs">
                  {employee.industryVariants.length} variants
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Industry-specific configurations available</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Skill Levels */}
            <div>
              <span className="text-xs font-medium text-muted-foreground">Skill Levels:</span>
              <div className="mt-1.5 space-y-1">
                {(["basic", "intermediate", "advanced"] as SkillLevel[]).map(level => (
                  <div key={level} className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs capitalize",
                        level === "basic" && "border-green-500/50 text-green-600",
                        level === "intermediate" && "border-blue-500/50 text-blue-600",
                        level === "advanced" && "border-purple-500/50 text-purple-600"
                      )}
                    >
                      {level}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {employee.skillLevels[level].description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Use Cases */}
            <div>
              <span className="text-xs font-medium text-muted-foreground">Use Cases:</span>
              <ul className="mt-1.5 space-y-0.5">
                {employee.useCases.slice(0, 3).map((useCase, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    {useCase}
                  </li>
                ))}
              </ul>
            </div>

            {/* Industry Variants */}
            {employee.industryVariants && employee.industryVariants.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Industry Variants:</span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {employee.industryVariants.map(variant => (
                    <Badge
                      key={variant.id}
                      variant="outline"
                      className="text-xs"
                    >
                      {variant.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Select Button */}
        {onSelect && (
          <Button
            className="w-full mt-4"
            variant={isSelected ? "default" : "outline"}
            size="sm"
          >
            {isSelected ? "Selected" : "Select Employee"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
