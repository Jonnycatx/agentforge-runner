/**
 * Deploy Modal - Export and deploy agent in multiple formats
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Rocket,
  Download,
  Cloud,
  Monitor,
  Terminal,
  Package,
  Copy,
  Check,
  ExternalLink,
  FileJson,
  FileCode,
  Loader2,
  CheckCircle2,
  Globe,
  Play,
  Sparkles,
  ChevronDown,
  Apple,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAgentStore } from "@/lib/agent-store";
import type { BuilderAgent } from "@/pages/unified-builder";
import type { ToolDefinition } from "@shared/schema";

interface DeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: BuilderAgent;
  tools: ToolDefinition[];
}

type ExportFormat = "python" | "javascript" | "json" | "docker";
type OSType = "mac" | "windows" | "linux" | "unknown";

function detectOS(): OSType {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "mac";
  if (userAgent.includes("win")) return "windows";
  if (userAgent.includes("linux")) return "linux";
  return "unknown";
}

export function DeployModal({ open, onOpenChange, agent, tools }: DeployModalProps) {
  const { toast } = useToast();
  const { providers } = useAgentStore();
  const [activeTab, setActiveTab] = useState("desktop");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("python");
  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [detectedOS, setDetectedOS] = useState<OSType>("unknown");
  const [selectedOS, setSelectedOS] = useState<OSType>("unknown");
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const providerApiKey = providers.find((p) => p.id === agent.providerId)?.apiKey || "";
  
  // Export options
  const [includeEnvTemplate, setIncludeEnvTemplate] = useState(true);
  const [includeReadme, setIncludeReadme] = useState(true);

  useEffect(() => {
    const os = detectOS();
    setDetectedOS(os);
    setSelectedOS(os);
  }, []);

  // Generate code based on format
  const generateCode = (format: ExportFormat): string => {
    const toolNames = agent.tools.join('", "');
    
    switch (format) {
      case "python":
        return generatePythonCode(agent, toolNames);
      case "javascript":
        return generateJavaScriptCode(agent, toolNames);
      case "json":
        return generateJsonConfig(agent);
      case "docker":
        return generateDockerfile(agent);
      default:
        return "";
    }
  };

  // Copy code to clipboard
  const handleCopy = async () => {
    const code = generateCode(exportFormat);
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download file
  const handleDownload = () => {
    const code = generateCode(exportFormat);
    const extensions: Record<ExportFormat, string> = {
      python: "py",
      javascript: "js",
      json: "json",
      docker: "Dockerfile",
    };
    
    const filename = exportFormat === "docker" 
      ? "Dockerfile"
      : `${agent.name.toLowerCase().replace(/\s+/g, "_")}_agent.${extensions[exportFormat]}`;
    
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download full package
  const handleDownloadPackage = () => {
    handleDownload();
  };

  // Simulate API deployment
  const handleDeployAPI = async () => {
    setIsDeploying(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const agentSlug = agent.name.toLowerCase().replace(/\s+/g, "-");
    setDeployedUrl(`https://api.agentforge.app/v1/agents/${agentSlug}`);
    setIsDeploying(false);
  };

  // Open in browser
  const handleRunInBrowser = () => {
    window.open(`/run-agent/${agent.id || "preview"}`, "_blank");
    onOpenChange(false);
  };

  // One-click desktop launch
  const handleLaunchDesktop = async (includeRunnerDownload = false) => {
    setIsLaunching(true);
    
    const AVATAR_GRADIENTS = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-orange-500 to-amber-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-blue-500',
    ];
    
    try {
      const agentConfig = {
        name: agent.name || "AI Assistant",
        goal: agent.goal || "",
        personality: agent.personality || agent.systemPrompt || "You are a helpful AI assistant.",
        avatar: "",
        avatarColor: AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)],
        provider: agent.providerId || "ollama",
        model: agent.modelId || "llama3.2",
        apiKey: undefined,
        temperature: agent.temperature || 0.7,
        tools: agent.tools || [],
        version: "2.0",
        generatedAt: new Date().toISOString(),
        generatedBy: "AgentForge",
      };

      if (includeRunnerDownload) {
        window.open(getRunnerDownloadUrl(selectedOS), "_blank", "noopener,noreferrer");
        setShowInstallHelp(true);
      }

      // Try deep link
      const configBase64 = btoa(JSON.stringify(agentConfig));
      const deepLinkUrl = `agentforge://launch?config=${encodeURIComponent(configBase64)}`;
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLinkUrl;
      document.body.appendChild(iframe);
      
      setTimeout(() => {
        document.body.removeChild(iframe);
        
        // Download agent file as backup
        const jsonString = JSON.stringify(agentConfig, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        const safeName = (agent.name || "MyAgent").replace(/[^a-zA-Z0-9]/g, "") || "MyAgent";
        a.href = url;
        a.download = `${safeName}.agentforge`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        toast({
          title: "Agent file downloaded!",
          description: "Double-click the file to launch in AgentForge Runner",
        });
        
        setIsLaunching(false);
      }, 500);
      
    } catch (error) {
      toast({
        title: "Launch failed",
        description: "Please download and install AgentForge Runner first",
        variant: "destructive",
      });
      setShowInstallHelp(true);
      setIsLaunching(false);
    }
  };

  const getOSIcon = (os: OSType) => {
    switch (os) {
      case "mac": return <Apple className="w-4 h-4" />;
      case "windows": return <Monitor className="w-4 h-4" />;
      case "linux": return <Terminal className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getOSDisplayName = (os: OSType) => {
    switch (os) {
      case "mac": return "Mac";
      case "windows": return "Windows";
      case "linux": return "Linux";
      default: return "Desktop";
    }
  };

  const getInstallChecklist = (os: OSType) => {
    switch (os) {
      case "mac":
        return [
          "Open the .dmg and drag AgentForge Runner to Applications.",
          "Open AgentForge Runner once from Applications (this completes setup).",
          "If macOS blocks it, right-click the app and choose Open once.",
          "Come back here and click Download & Open again.",
        ];
      case "windows":
        return [
          "Run the installer and finish setup.",
          "Open AgentForge Runner once from the Start Menu.",
          "Come back here and click Download & Open again.",
        ];
      case "linux":
        return [
          "Make the AppImage executable (chmod +x).",
          "Open AgentForge Runner once.",
          "Come back here and click Download & Open again.",
        ];
      default:
        return [
          "Install AgentForge Runner for your OS.",
          "Open AgentForge Runner once.",
          "Come back here and click Download & Open again.",
        ];
    }
  };

  const GITHUB_REPO = "Jonnycatx/agentforge-runner";
  const RUNNER_VERSION = "2.1.15";
  const RUNNER_ASSET_NAMES: Record<OSType, string> = {
    mac: `AgentForge.Runner_${RUNNER_VERSION}_aarch64.dmg`,
    windows: `AgentForge.Runner_${RUNNER_VERSION}_x64-setup.exe`,
    linux: `AgentForge.Runner_${RUNNER_VERSION}_amd64.AppImage`,
    unknown: "",
  };
  
  const getRunnerDownloadUrl = (os: OSType = selectedOS) => {
    const baseUrl = `https://github.com/${GITHUB_REPO}/releases/latest/download`;
    const filename = RUNNER_ASSET_NAMES[os];
    if (!filename) {
      return `https://github.com/${GITHUB_REPO}/releases`;
    }
    return `${baseUrl}/${filename}`;
  };

  const code = generateCode(exportFormat);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            Deploy {agent.name}
          </DialogTitle>
          <DialogDescription>
            Launch your AI assistant or export for development
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="desktop" className="gap-1.5">
              <Monitor className="w-4 h-4" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="browser" className="gap-1.5">
              <Globe className="w-4 h-4" />
              Browser
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5">
              <Cloud className="w-4 h-4" />
              API
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-1.5">
              <Terminal className="w-4 h-4" />
              Code
            </TabsTrigger>
          </TabsList>

          {/* Desktop Tab - Primary Option */}
          <TabsContent value="desktop" className="mt-4 space-y-4">
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Desktop Companion</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Launch {agent.name} as a beautiful native app. Always accessible from your dock or taskbar.
              </p>
              
              <div className="flex flex-col items-center gap-3">
                <Button
                  onClick={() => handleLaunchDesktop(true)}
                  disabled={isLaunching}
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 px-8 w-full sm:w-auto"
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Downloading & Opening...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Download & Open (Recommended)
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleLaunchDesktop(false)}
                  disabled={isLaunching}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Already installed? Open now
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <Badge variant="outline" className="text-xs">
                  {getOSIcon(selectedOS)}
                  <span className="ml-1">{getOSDisplayName(selectedOS)}</span>
                </Badge>
                <Badge variant="outline" className="text-xs text-green-600 border-green-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  Free AI with Ollama
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                {(["mac", "windows", "linux"] as OSType[]).map((os) => (
                  <Button
                    key={os}
                    size="sm"
                    variant={selectedOS === os ? "default" : "outline"}
                    onClick={() => setSelectedOS(os)}
                    className="h-8 px-3"
                  >
                    {getOSIcon(os)}
                    <span className="ml-1">{getOSDisplayName(os)}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Install Help */}
            <Collapsible open={showInstallHelp} onOpenChange={setShowInstallHelp}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
                  <span>First time? Get AgentForge Runner</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showInstallHelp && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    Quick Setup (one time only)
                  </div>
                  
                  <a 
                    href={getRunnerDownloadUrl(selectedOS)}
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="w-full justify-start h-10">
                      <Download className="w-4 h-4 mr-2" />
                      Download for {getOSDisplayName(selectedOS)}
                    </Button>
                  </a>
                  
                  <div className="rounded-md border border-dashed border-muted-foreground/30 bg-background/60 p-3">
                    <p className="text-xs font-medium text-foreground mb-2">
                      Post-download checklist (dummy-proof)
                    </p>
                    <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                      {getInstallChecklist(selectedOS).map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                    {selectedOS === "mac" && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        macOS may ask for your password during install.
                      </p>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { icon: CheckCircle2, text: "Works offline with local AI" },
                { icon: CheckCircle2, text: "Beautiful native interface" },
                { icon: CheckCircle2, text: "Your data stays private" },
                { icon: CheckCircle2, text: "Always accessible" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="w-3.5 h-3.5 text-green-500" />
                  {text}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Browser Tab */}
          <TabsContent value="browser" className="mt-4 space-y-4">
            <div className="text-center p-6 rounded-xl border bg-muted/30">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Run in Browser</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Start chatting instantly. Works on any device with a web browser.
              </p>
              
              <Button onClick={handleRunInBrowser} size="lg" className="px-8">
                <ExternalLink className="w-5 h-5 mr-2" />
                Open Chat
              </Button>

              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">
                  Instant
                </Badge>
                <Badge variant="outline" className="text-xs">
                  No installation required
                </Badge>
              </div>
            </div>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api" className="mt-4 space-y-4">
            {deployedUrl ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-300">
                    Agent deployed successfully!
                  </span>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">API Endpoint</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={deployedUrl} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigator.clipboard.writeText(deployedUrl)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-sm mb-2">Quick Start</h4>
                  <pre className="text-xs font-mono bg-background p-3 rounded overflow-x-auto">
{`curl -X POST ${deployedUrl} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello!"}'`}
                  </pre>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-6 rounded-xl border bg-muted/30">
                  <Cloud className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Deploy as API</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get a hosted API endpoint for your agent.
                  </p>
                  <Button onClick={handleDeployAPI} disabled={isDeploying}>
                    {isDeploying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Deploy to Cloud
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { value: "∞", label: "Requests/mo" },
                    { value: "99.9%", label: "Uptime" },
                    { value: "<100ms", label: "Latency" },
                  ].map(({ value, label }) => (
                    <div key={label} className="p-3 rounded-lg border">
                      <p className="text-lg font-bold text-primary">{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Code Tab */}
          <TabsContent value="code" className="mt-4 space-y-4">
            <div className="flex gap-2">
              {[
                { id: "python", label: "Python", icon: Terminal },
                { id: "javascript", label: "JS", icon: FileCode },
                { id: "json", label: "JSON", icon: FileJson },
                { id: "docker", label: "Docker", icon: Package },
              ].map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={exportFormat === id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat(id as ExportFormat)}
                  className="flex-1"
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {label}
                </Button>
              ))}
            </div>

            <div className="relative">
              <div className="flex items-center justify-between p-2 border rounded-t-lg bg-muted">
                <Badge variant="secondary" className="text-xs">
                  {exportFormat === "docker" ? "Dockerfile" : `.${exportFormat}`}
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <ScrollArea className="h-[200px] border border-t-0 rounded-b-lg">
                <pre className="p-4 text-xs font-mono leading-relaxed">
                  <code>{code}</code>
                </pre>
              </ScrollArea>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={includeEnvTemplate}
                    onCheckedChange={setIncludeEnvTemplate}
                    id="env"
                  />
                  <Label htmlFor="env" className="text-sm">Include .env template</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={includeReadme}
                    onCheckedChange={setIncludeReadme}
                    id="readme"
                  />
                  <Label htmlFor="readme" className="text-sm">Include README</Label>
                </div>
              </div>
              <Button onClick={handleDownloadPackage}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Code generation helpers
function generatePythonCode(agent: BuilderAgent, toolNames: string): string {
  return `"""
${agent.name}
Generated by AgentForge
"""

import os
from agentforge import Agent, Tool

# Configuration
AGENT_CONFIG = {
    "name": "${agent.name}",
    "goal": "${agent.goal}",
    "personality": "${agent.personality}",
    "model": "${agent.modelId}",
    "temperature": ${agent.temperature},
    "max_tokens": ${agent.maxTokens},
}

# Initialize the agent
agent = Agent(**AGENT_CONFIG)

# Add tools
tools = ["${toolNames}"]
for tool_id in tools:
    agent.add_tool(Tool.from_registry(tool_id))

# System prompt
agent.set_system_prompt("""
${agent.systemPrompt || `You are ${agent.name}, an AI assistant.
Your goal: ${agent.goal}
Personality: ${agent.personality}

Always be helpful, accurate, and professional.`}
""")

def chat(message: str) -> str:
    """Send a message to the agent and get a response."""
    return agent.chat(message)

def main():
    print(f"Starting {AGENT_CONFIG['name']}...")
    print("Type 'quit' to exit.\\n")
    
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'quit':
            break
        
        response = chat(user_input)
        print(f"\\n{AGENT_CONFIG['name']}: {response}\\n")

if __name__ == "__main__":
    main()
`;
}

function generateJavaScriptCode(agent: BuilderAgent, toolNames: string): string {
  return `/**
 * ${agent.name}
 * Generated by AgentForge
 */

import { Agent, Tool } from '@agentforge/sdk';

const config = {
  name: "${agent.name}",
  goal: "${agent.goal}",
  personality: "${agent.personality}",
  model: "${agent.modelId}",
  temperature: ${agent.temperature},
  maxTokens: ${agent.maxTokens},
};

const agent = new Agent(config);

const tools = ["${toolNames}"];
tools.forEach(toolId => {
  agent.addTool(Tool.fromRegistry(toolId));
});

agent.setSystemPrompt(\`
${agent.systemPrompt || `You are ${agent.name}, an AI assistant.
Your goal: ${agent.goal}
Personality: ${agent.personality}`}
\`);

export async function chat(message) {
  return await agent.chat(message);
}

async function main() {
  console.log(\`Starting \${config.name}...\`);
  const response = await chat("Hello!");
  console.log(\`\${config.name}: \${response}\`);
}

main().catch(console.error);
`;
}

function generateJsonConfig(agent: BuilderAgent): string {
  return JSON.stringify({
    name: agent.name,
    goal: agent.goal,
    personality: agent.personality,
    model: {
      id: agent.modelId,
      provider: agent.providerId,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    },
    tools: agent.tools,
    systemPrompt: agent.systemPrompt || null,
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    generatedBy: "AgentForge",
  }, null, 2);
}

function generateDockerfile(agent: BuilderAgent): string {
  const agentSlug = agent.name.toLowerCase().replace(/\s+/g, "_");
  return `# ${agent.name} - AgentForge Agent
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ${agentSlug}_agent.py .
COPY config.json .

ENV OPENAI_API_KEY=""
ENV AGENT_PORT=8080

EXPOSE 8080

CMD ["python", "${agentSlug}_agent.py", "--serve", "--port", "8080"]
`;
}
