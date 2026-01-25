import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { ToolCard } from "@/components/tool-card";
import { ToolConnectionModal } from "@/components/tool-connection-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Search,
  X,
  Wrench,
  CheckCircle2,
  Globe,
  Mail,
  Database,
  FileText,
  DollarSign,
  Users,
  HardDrive,
  MessageSquare,
  Share2,
  Zap,
  Palette,
  Code,
  SearchIcon,
  Sparkles,
} from "lucide-react";
import type { ToolDefinition } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

// Category icons and labels
const categoryConfig: Record<string, { icon: any; label: string; color: string }> = {
  web: { icon: Globe, label: "Web", color: "bg-blue-500/10 text-blue-600" },
  email: { icon: Mail, label: "Email", color: "bg-purple-500/10 text-purple-600" },
  data: { icon: Database, label: "Data", color: "bg-green-500/10 text-green-600" },
  files: { icon: FileText, label: "Files", color: "bg-orange-500/10 text-orange-600" },
  search: { icon: SearchIcon, label: "Search", color: "bg-cyan-500/10 text-cyan-600" },
  finance: { icon: DollarSign, label: "Finance", color: "bg-emerald-500/10 text-emerald-600" },
  crm: { icon: Users, label: "CRM", color: "bg-pink-500/10 text-pink-600" },
  storage: { icon: HardDrive, label: "Storage", color: "bg-indigo-500/10 text-indigo-600" },
  communication: { icon: MessageSquare, label: "Communication", color: "bg-violet-500/10 text-violet-600" },
  social: { icon: Share2, label: "Social", color: "bg-rose-500/10 text-rose-600" },
  automation: { icon: Zap, label: "Automation", color: "bg-amber-500/10 text-amber-600" },
  design: { icon: Palette, label: "Design", color: "bg-fuchsia-500/10 text-fuchsia-600" },
  dev: { icon: Code, label: "Development", color: "bg-slate-500/10 text-slate-600" },
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function Tools() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [connectedToolIds, setConnectedToolIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [connectionTool, setConnectionTool] = useState<ToolDefinition | null>(null);
  const { isAuthenticated } = useAuth();

  // Fetch tools
  useEffect(() => {
    document.title = "Tools | AgentForge";
    
    const fetchData = async () => {
      try {
        const [toolsRes, connectedRes] = await Promise.all([
          fetch("/api/tools"),
          isAuthenticated ? fetch("/api/tools/user/connected", { credentials: "include" }) : Promise.resolve(null),
        ]);

        if (toolsRes.ok) {
          const toolsData = await toolsRes.json();
          setTools(toolsData);
        }

        if (connectedRes?.ok) {
          const connectedData = await connectedRes.json();
          setConnectedToolIds(connectedData);
        }
      } catch (error) {
        console.error("Failed to fetch tools:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Get categories with counts
  const categories = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = 0;
    }
    acc[tool.category]++;
    return acc;
  }, {} as Record<string, number>);

  // Filter tools
  const filteredTools = tools.filter(tool => {
    const matchesSearch =
      searchQuery === "" ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedTools = filteredTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, ToolDefinition[]>);

  const connectedCount = connectedToolIds.length;

  const handleConnectionSuccess = () => {
    if (connectionTool) {
      setConnectedToolIds(prev => [...prev, connectionTool.id]);
    }
    setConnectionTool(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{tools.length} Tools Available</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Power Up Your Agents
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect tools to give your AI agents real capabilities. Browse by category or search for specific tools.
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="grid sm:grid-cols-3 gap-4 mb-8"
          >
            <motion.div variants={fadeInUp}>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tools.length}</p>
                    <p className="text-sm text-muted-foreground">Total Tools</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{connectedCount}</p>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Object.keys(categories).length}</p>
                    <p className="text-sm text-muted-foreground">Categories</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tools by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
            <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                All Tools
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {tools.length}
                </Badge>
              </TabsTrigger>
              {Object.entries(categories).map(([category, count]) => {
                const config = categoryConfig[category];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {config.label}
                    <Badge variant="secondary" className="ml-1.5 text-xs">
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Tools Grid */}
          {selectedCategory === "all" ? (
            // Grouped view
            <motion.div initial="initial" animate="animate" variants={staggerContainer}>
              {Object.entries(groupedTools).map(([category, categoryTools]) => {
                const config = categoryConfig[category];
                if (!config) return null;
                const Icon = config.icon;
                
                return (
                  <motion.div key={category} variants={fadeInUp} className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">{config.label}</h2>
                        <p className="text-sm text-muted-foreground">{categoryTools.length} tools</p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryTools.map(tool => (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          isConnected={connectedToolIds.includes(tool.id)}
                          onConnect={() => setConnectionTool(tool)}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            // Flat view for specific category
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredTools.map(tool => (
                <motion.div key={tool.id} variants={fadeInUp}>
                  <ToolCard
                    tool={tool}
                    isConnected={connectedToolIds.includes(tool.id)}
                    onConnect={() => setConnectionTool(tool)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {filteredTools.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-medium mb-2">No tools found</h3>
              <p className="text-sm">Try adjusting your search or filter</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </main>

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
