import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { useAgentStore } from "@/lib/agent-store";
import { agentTemplates } from "@/lib/templates";
import { motion } from "framer-motion";
import {
  Zap,
  MessageSquare,
  Code2,
  Sparkles,
  Shield,
  Globe,
  ArrowRight,
  Bot,
  Cpu,
  Layers,
  Play,
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Landing() {
  const [, setLocation] = useLocation();
  const { updateBuilderAgent, setBuilderStep, addBuilderMessage, resetBuilder } = useAgentStore();

  useEffect(() => {
    document.title = "AgentForge - Build AI Agents with Natural Language";
  }, []);

  const featuredTemplates = agentTemplates.slice(0, 6);

  const handleTemplateClick = (template: typeof agentTemplates[0]) => {
    resetBuilder();
    updateBuilderAgent(template.config);
    setBuilderStep("complete");
    
    addBuilderMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: `I've loaded the "${template.name}" template for you!\n\n**Name:** ${template.config.name}\n**Goal:** ${template.config.goal}\n\nYour agent is ready! Test it, customize it, or save it to your library.`,
      timestamp: new Date().toISOString(),
    });
    
    setLocation("/builder");
  };

  const features = [
    {
      icon: MessageSquare,
      title: "Conversational Builder",
      description:
        "Describe what you need in plain English. Our AI guides you through every step of creating your agent.",
    },
    {
      icon: Code2,
      title: "Live Code Preview",
      description:
        "Watch your agent come to life with real-time code generation. Export clean, production-ready code anytime.",
    },
    {
      icon: Shield,
      title: "Zero Platform Fees",
      description:
        "Connect your own API keys. All inference runs through your providers. No hidden costs, ever.",
    },
    {
      icon: Sparkles,
      title: "Multiple Models",
      description:
        "Choose from OpenAI, Anthropic, Groq, Google, xAI, or run locally with Ollama. Your choice.",
    },
    {
      icon: Globe,
      title: "Community Gallery",
      description:
        "Browse and fork agents built by the community. Share your creations and get inspired.",
    },
    {
      icon: Layers,
      title: "Powerful Tools",
      description:
        "Equip your agents with web search, code execution, file handling, and more built-in tools.",
    },
  ];

  const providers = [
    { name: "OpenAI", models: ["GPT-4o", "GPT-4o Mini"] },
    { name: "Anthropic", models: ["Claude 3.5 Sonnet", "Claude 3 Opus"] },
    { name: "Groq", models: ["Llama 3.1 70B", "Mixtral 8x7B"] },
    { name: "Google", models: ["Gemini 1.5 Pro", "Gemini 1.5 Flash"] },
    { name: "xAI", models: ["Grok Beta"] },
    { name: "Ollama", models: ["Local Models"] },
  ];

  const steps = [
    {
      step: "01",
      title: "Connect Your Model",
      description: "Add your API key from any supported provider or connect to a local Ollama instance.",
    },
    {
      step: "02",
      title: "Describe Your Agent",
      description: "Tell us what you want your agent to do. Our builder asks clarifying questions to get it right.",
    },
    {
      step: "03",
      title: "Customize & Run",
      description: "Fine-tune the generated agent, add tools and knowledge, then run it instantly.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-6" data-testid="badge-hero">
              <Sparkles className="w-3 h-3 mr-1" />
              Now in Public Beta
            </Badge>

            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
              data-testid="text-hero-title"
            >
              Build powerful AI agents
              <br />
              <span className="gradient-text">with natural language.</span>
            </h1>

            <p
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
              data-testid="text-hero-subtitle"
            >
              No code required. Powered by your models. Zero platform fees.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/builder">
                <Button size="lg" className="text-base px-8" data-testid="button-hero-start">
                  Start Building
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/gallery">
                <Button variant="outline" size="lg" className="text-base px-8" data-testid="button-hero-gallery">
                  Browse Gallery
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="relative mx-auto max-w-4xl">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
              <Card className="overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">AgentForge Builder</span>
                </div>
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-2 min-h-[300px]">
                    {/* Chat Side */}
                    <div className="p-4 border-r border-border/50 bg-background">
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 bg-muted/50 rounded-lg p-3">
                            <p className="text-sm">What kind of agent would you like to build today?</p>
                          </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                          <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm">I need a web design assistant that can help migrate websites.</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 bg-muted/50 rounded-lg p-3">
                            <p className="text-sm">
                              I'll create a web design agent with HTML/CSS generation and content migration tools.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Code Side */}
                    <div className="p-4 bg-muted/30 font-mono text-xs">
                      <pre className="text-muted-foreground overflow-hidden">
                        <code>{`{
  "name": "Web Design Assistant",
  "goal": "Help migrate and update websites",
  "tools": [
    "html_generator",
    "css_generator",
    "image_analysis",
    "file_reader"
  ],
  "model": "gpt-4o",
  "temperature": 0.7
}`}</code>
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold mb-4"
              data-testid="text-features-title"
            >
              Everything you need to build AI agents
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              A complete toolkit for creating, customizing, and deploying intelligent agents
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="h-full hover-elevate transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2" data-testid={`text-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Agents Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold mb-4"
              data-testid="text-featured-title"
            >
              Featured Agent Templates
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              Start with a proven template and customize it to your needs
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {featuredTemplates.map((template) => (
              <motion.div key={template.id} variants={fadeInUp}>
                <Card 
                  className="h-full hover-elevate cursor-pointer transition-all duration-300"
                  onClick={() => handleTemplateClick(template)}
                  data-testid={`card-featured-${template.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {template.config.modelId}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.config.tools?.length || 0} tools
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Click to start building</span>
                      <Play className="w-4 h-4 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <Link href="/builder">
              <Button variant="outline" size="lg">
                View All Templates
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Providers Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold mb-4"
              data-testid="text-providers-title"
            >
              Bring your own models
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              Connect any LLM provider. Use your existing API keys or run models locally.
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {providers.map((provider) => (
              <motion.div key={provider.name} variants={fadeInUp}>
                <Card className="text-center p-4 hover-elevate transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Cpu className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-sm mb-1">{provider.name}</h3>
                  <p className="text-xs text-muted-foreground">{provider.models.join(", ")}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold mb-4"
              data-testid="text-how-title"
            >
              How it works
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              Three simple steps to create your AI agent
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {steps.map((step, index) => (
              <motion.div key={step.step} variants={fadeInUp} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+60px)] w-[calc(100%-120px)] h-px bg-border" />
                )}
                <div className="text-center">
                  <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl font-bold text-primary">{step.step}</span>
                  </div>
                  <h3 className="font-semibold text-xl mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-cta-title">
              Ready to build your first agent?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Start building for free. No credit card required.
            </p>
            <Link href="/builder">
              <Button size="lg" className="text-base px-8" data-testid="button-cta-start">
                Start Building Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">AgentForge</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Built with zero central inference costs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
