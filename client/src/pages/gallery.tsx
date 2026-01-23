import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/header";
import { useAgentStore } from "@/lib/agent-store";
import { useQuery } from "@tanstack/react-query";
import type { AgentConfig } from "@shared/schema";
import { 
  Search, 
  Plus, 
  Bot, 
  Code2, 
  Trash2, 
  Copy, 
  Play,
  Clock,
  Sparkles,
  TrendingUp,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "coding", label: "Coding" },
  { value: "design", label: "Design" },
  { value: "research", label: "Research" },
  { value: "productivity", label: "Productivity" },
  { value: "creative", label: "Creative" },
  { value: "business", label: "Business" },
];

const sortOptions = [
  { value: "recent", label: "Most Recent" },
  { value: "name", label: "Name A-Z" },
  { value: "tools", label: "Most Tools" },
];

export default function Gallery() {
  const [, setLocation] = useLocation();
  const { setCurrentAgent, updateBuilderAgent, setBuilderStep, addBuilderMessage, resetBuilder } = useAgentStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    document.title = "Agent Gallery | AgentForge";
  }, []);

  const { data: agents = [], isLoading, error } = useQuery<AgentConfig[]>({
    queryKey: ["/api/agents"],
  });

  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.goal.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (selectedCategory === "all") return matchesSearch;
      
      const agentCategory = guessCategory(agent);
      return matchesSearch && agentCategory === selectedCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "tools":
          return (b.tools?.length || 0) - (a.tools?.length || 0);
        case "recent":
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

  function guessCategory(agent: AgentConfig): string {
    const text = `${agent.name} ${agent.goal} ${agent.description || ""}`.toLowerCase();
    if (text.includes("code") || text.includes("debug") || text.includes("api") || text.includes("developer")) return "coding";
    if (text.includes("design") || text.includes("ui") || text.includes("ux") || text.includes("web")) return "design";
    if (text.includes("research") || text.includes("analysis") || text.includes("data")) return "research";
    if (text.includes("task") || text.includes("email") || text.includes("productivity")) return "productivity";
    if (text.includes("content") || text.includes("write") || text.includes("creative") || text.includes("social")) return "creative";
    if (text.includes("business") || text.includes("product") || text.includes("sales")) return "business";
    return "all";
  }

  const handleDelete = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/agents/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent deleted",
        description: "The agent has been removed from your library",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive",
      });
    }
  };

  const handleRemix = (agent: AgentConfig) => {
    resetBuilder();
    
    const remixConfig = {
      ...agent,
      id: crypto.randomUUID(),
      name: `${agent.name} (Remix)`,
      isPublic: false,
      createdAt: new Date().toISOString(),
    };
    
    updateBuilderAgent(remixConfig);
    setBuilderStep("complete");
    
    addBuilderMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: `I've loaded "${agent.name}" for you to remix!\n\n**Name:** ${remixConfig.name}\n**Goal:** ${remixConfig.goal}\n**Tools:** ${remixConfig.tools?.join(", ") || "None"}\n**Model:** ${remixConfig.modelId || "gpt-4o"}\n\nFeel free to modify any settings, test it out, or save it as your own!`,
      timestamp: new Date().toISOString(),
    });
    
    toast({
      title: "Agent forked!",
      description: "Opening in the builder...",
    });
    
    setLocation("/builder");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getCategoryBadge = (agent: AgentConfig) => {
    const category = guessCategory(agent);
    if (category === "all") return null;
    
    const categoryConfig: Record<string, { color: string; label: string }> = {
      coding: { color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", label: "Coding" },
      design: { color: "bg-purple-500/10 text-purple-600 dark:text-purple-400", label: "Design" },
      research: { color: "bg-green-500/10 text-green-600 dark:text-green-400", label: "Research" },
      productivity: { color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", label: "Productivity" },
      creative: { color: "bg-pink-500/10 text-pink-600 dark:text-pink-400", label: "Creative" },
      business: { color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", label: "Business" },
    };
    
    const config = categoryConfig[category];
    return config ? (
      <Badge variant="secondary" className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    ) : null;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="text-gallery-title">
                Agent Gallery
              </h1>
              <p className="text-muted-foreground">
                Browse community agents or manage your own creations
              </p>
            </div>
            <Link href="/builder">
              <Button data-testid="button-create-agent">
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-agents"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px]" data-testid="select-category">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]" data-testid="select-sort">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex-row items-start gap-4 space-y-0">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-1.5 mb-4">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="font-medium text-lg mb-2">Failed to load agents</h3>
              <p className="text-muted-foreground mb-6">
                Please try again later
              </p>
            </div>
          )}

          {!isLoading && !error && filteredAgents.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg mb-2">No agents found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery 
                  ? "Try a different search term" 
                  : "Create your first agent to get started"}
              </p>
              <Link href="/builder">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Agent
                </Button>
              </Link>
            </div>
          ) : !isLoading && !error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredAgents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full flex flex-col hover-elevate transition-all duration-300" data-testid={`card-agent-${agent.id}`}>
                    <CardHeader className="flex-row items-start gap-4 space-y-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <CardTitle className="text-base truncate flex-1">
                            {agent.name}
                          </CardTitle>
                          {agent.isPublic && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {agent.description || agent.goal}
                        </p>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {getCategoryBadge(agent)}
                        {agent.tools?.slice(0, 2).map((tool) => (
                          <Badge key={tool} variant="outline" className="text-xs">
                            {tool.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        {agent.tools && agent.tools.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{agent.tools.length - 2}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Code2 className="w-3 h-3" />
                          {agent.modelId}
                        </div>
                        {agent.createdAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(agent.createdAt)}
                          </div>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="flex gap-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleRemix(agent)}
                        data-testid={`button-fork-${agent.id}`}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Remix
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleRemix(agent)}
                        data-testid={`button-run-${agent.id}`}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Run
                      </Button>
                      {!agent.isPublic && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              data-testid={`button-delete-${agent.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{agent.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(agent.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <footer className="border-t py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>AgentForge - Build AI agents with zero platform fees</p>
        </div>
      </footer>
    </div>
  );
}
