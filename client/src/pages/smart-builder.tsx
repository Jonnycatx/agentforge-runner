import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { DiscoveryChat } from "@/components/discovery/discovery-chat";
import { ToolBundleSelector } from "@/components/discovery/tool-bundles";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Package,
  Sparkles,
  ArrowRight,
  Wand2,
} from "lucide-react";

export default function SmartBuilder() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"chat" | "bundles">("chat");

  // Set document title
  document.title = "Smart Builder | AgentForge";

  const handleChatComplete = (config: any) => {
    // Store config for builder to pick up
    sessionStorage.setItem("smartBuilderConfig", JSON.stringify(config));
    setLocation("/builder?from=smart");
  };

  const handleBundleSelect = (tools: string[]) => {
    // Create config with selected tools
    const config = {
      name: "My Agent",
      goal: "",
      personality: "Helpful and professional",
      tools,
      temperature: 0.5,
      maxTokens: 4096,
    };
    sessionStorage.setItem("smartBuilderConfig", JSON.stringify(config));
    setLocation("/builder?from=smart");
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Wand2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Smart Agent Builder
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              Build Your Agent the Smart Way
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tell me what you need, and I'll recommend the perfect tools and configuration.
              Or choose a pre-made bundle to get started instantly.
            </p>
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Conversation
              </TabsTrigger>
              <TabsTrigger value="bundles" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Tool Bundles
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="mt-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <DiscoveryChat
                  onComplete={handleChatComplete}
                  onCancel={() => setLocation("/builder")}
                />
              </motion.div>
            </TabsContent>
            
            <TabsContent value="bundles" className="mt-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-card rounded-xl border p-6"
              >
                <ToolBundleSelector
                  onSelect={handleBundleSelect}
                  selectedTools={[]}
                />
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Alternative CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => setLocation("/builder")}
            >
              Start from Scratch
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/employees")}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Browse AI Employees
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
