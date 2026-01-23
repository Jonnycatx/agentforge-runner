import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { agentTemplates, categoryLabels, categoryColors, type AgentTemplate } from "@/lib/templates";
import { 
  Search, 
  Palette, 
  Code, 
  BookOpen, 
  CheckSquare, 
  PenTool, 
  BarChart,
  ShoppingBag,
  Bug,
  Server,
  Users,
  Mail,
  Share2,
  Sparkles,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const iconMap: Record<string, typeof Palette> = {
  palette: Palette,
  code: Code,
  search: BookOpen,
  "check-square": CheckSquare,
  "pen-tool": PenTool,
  "bar-chart": BarChart,
  "shopping-bag": ShoppingBag,
  bug: Bug,
  server: Server,
  users: Users,
  mail: Mail,
  "share-2": Share2,
};

interface TemplateGalleryProps {
  onSelect: (template: AgentTemplate) => void;
  onClose?: () => void;
}

export function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AgentTemplate["category"] | "all">("all");

  const categories = ["all", ...Object.keys(categoryLabels)] as const;

  const filteredTemplates = agentTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Start from Template</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-templates">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-templates"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category as AgentTemplate["category"] | "all")}
              data-testid={`badge-category-${category}`}
            >
              {category === "all" ? "All" : categoryLabels[category as keyof typeof categoryLabels]}
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template, index) => {
              const Icon = iconMap[template.icon] || Code;
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    className="hover-elevate cursor-pointer transition-all duration-200"
                    onClick={() => onSelect(template)}
                    data-testid={`card-template-${template.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryColors[template.category]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm truncate">{template.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {template.config.modelId}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {template.config.tools?.length || 0} tools
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredTemplates.length === 0 && (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              <p>No templates found. Try a different search.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Or describe your agent from scratch in the chat
        </p>
      </div>
    </div>
  );
}
