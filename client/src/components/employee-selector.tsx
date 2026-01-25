import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeCard } from "./employee-card";
import * as Icons from "lucide-react";
import { 
  Search, 
  X, 
  Users,
  Sparkles,
  Filter,
} from "lucide-react";
import {
  agentEmployees,
  employeeCategories,
  type AgentEmployeeTemplate,
  type SkillLevel,
  type IndustryVariant,
  buildEmployeeConfig,
} from "@/lib/agent-employees";
import { cn } from "@/lib/utils";
import type { AgentConfig } from "@shared/schema";

interface EmployeeSelectorProps {
  onSelect: (config: Partial<AgentConfig>, employee: AgentEmployeeTemplate) => void;
  selectedEmployeeId?: string;
}

function getIconComponent(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.User;
}

export function EmployeeSelector({ onSelect, selectedEmployeeId }: EmployeeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<SkillLevel>("intermediate");
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();

  // Filter employees
  const filteredEmployees = agentEmployees.filter(emp => {
    const matchesSearch = 
      searchQuery === "" ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || emp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle employee selection
  const handleEmployeeSelect = (employee: AgentEmployeeTemplate) => {
    if (expandedEmployee === employee.id) {
      // Confirm selection
      const variant = employee.industryVariants?.find(v => v.id === selectedVariant);
      const config = buildEmployeeConfig(employee, selectedSkillLevel, variant);
      onSelect(config, employee);
    } else {
      // Expand for configuration
      setExpandedEmployee(employee.id);
      setSelectedVariant(undefined);
    }
  };

  // Quick select (skip configuration)
  const handleQuickSelect = (employee: AgentEmployeeTemplate) => {
    const config = buildEmployeeConfig(employee, "intermediate");
    onSelect(config, employee);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Employees</h3>
          <Badge variant="secondary" className="ml-2">
            {agentEmployees.length} available
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
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
          {employeeCategories.map(cat => {
            const Icon = getIconComponent(cat.icon);
            const count = agentEmployees.filter(e => e.category === cat.id).length;
            return (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3 py-1.5"
              >
                <Icon className="w-3 h-3 mr-1" />
                {cat.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="flex-1 mt-0 min-h-0">
          <ScrollArea className="h-[500px] pr-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filteredEmployees.map(employee => (
                <div key={employee.id}>
                  <EmployeeCard
                    employee={employee}
                    isSelected={selectedEmployeeId === employee.id}
                    showDetails={expandedEmployee === employee.id}
                    onSelect={handleEmployeeSelect}
                  />
                  
                  {/* Configuration Panel (when expanded) */}
                  {expandedEmployee === employee.id && (
                    <div className="mt-2 p-4 bg-muted/50 rounded-lg border space-y-4">
                      {/* Skill Level */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Skill Level
                        </label>
                        <Select
                          value={selectedSkillLevel}
                          onValueChange={(v) => setSelectedSkillLevel(v as SkillLevel)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">
                              Basic - {employee.skillLevels.basic.description}
                            </SelectItem>
                            <SelectItem value="intermediate">
                              Intermediate - {employee.skillLevels.intermediate.description}
                            </SelectItem>
                            <SelectItem value="advanced">
                              Advanced - {employee.skillLevels.advanced.description}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {employee.skillLevels[selectedSkillLevel].tools.map(tool => (
                            <Badge key={tool} variant="secondary" className="text-xs">
                              {tool.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Industry Variant (if available) */}
                      {employee.industryVariants && employee.industryVariants.length > 0 && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Industry Specialization (Optional)
                          </label>
                          <Select
                            value={selectedVariant || "none"}
                            onValueChange={(v) => setSelectedVariant(v === "none" ? undefined : v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="General (no specialization)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">General (no specialization)</SelectItem>
                              {employee.industryVariants.map(variant => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.name} - {variant.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedVariant && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Focus areas:{" "}
                              {employee.industryVariants
                                .find(v => v.id === selectedVariant)
                                ?.focusAreas.join(", ")}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedEmployee(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEmployeeSelect(employee)}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          Create This Employee
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredEmployees.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-8 h-8 mb-2" />
                <p className="text-sm">No employees found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
