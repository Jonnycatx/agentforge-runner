import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useEffect } from "react";

export default function Gallery() {
  const { setCurrentAgent } = useAgentStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Set page title
  useEffect(() => {
    document.title = "Agent Gallery | AgentForge";
  }, []);

  // Fetch agents from backend
  const { data: agents = [], isLoading, error } = useQuery<AgentConfig[]>({
    queryKey: ["/api/agents"],
  });

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.goal.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleFork = (agent: AgentConfig) => {
    const forkedAgent = {
      ...agent,
      id: crypto.randomUUID(),
      name: `${agent.name} (Copy)`,
      isPublic: false,
      createdAt: new Date().toISOString(),
    };
    setCurrentAgent(forkedAgent);
    toast({
      title: "Agent forked!",
      description: "Opening in the builder...",
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
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

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-md"
              data-testid="input-search-agents"
            />
          </div>

          {/* Loading state */}
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

          {/* Error state */}
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

          {/* Agents grid */}
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
                        <CardTitle className="text-base truncate">
                          {agent.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {agent.description || agent.goal}
                        </p>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {agent.tools?.slice(0, 3).map((tool) => (
                          <Badge key={tool} variant="secondary" className="text-xs">
                            {tool.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        {agent.tools && agent.tools.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{agent.tools.length - 3}
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
                        onClick={() => handleFork(agent)}
                        data-testid={`button-fork-${agent.id}`}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Fork
                      </Button>
                      <Link href="/builder" className="flex-1">
                        <Button size="sm" className="w-full" data-testid={`button-run-${agent.id}`}>
                          <Play className="w-3 h-3 mr-1" />
                          Run
                        </Button>
                      </Link>
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

      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>AgentForge - Build AI agents with zero platform fees</p>
        </div>
      </footer>
    </div>
  );
}
