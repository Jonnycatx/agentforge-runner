/**
 * Deploy Modal - Export and deploy agent in multiple formats
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Code,
  FileJson,
  FileCode,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { BuilderAgent } from "@/pages/unified-builder";
import type { ToolDefinition } from "@shared/schema";

interface DeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: BuilderAgent;
  tools: ToolDefinition[];
}

type ExportFormat = "python" | "javascript" | "json" | "docker";

export function DeployModal({ open, onOpenChange, agent, tools }: DeployModalProps) {
  const [activeTab, setActiveTab] = useState("download");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("python");
  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  
  // Export options
  const [includeEnvTemplate, setIncludeEnvTemplate] = useState(true);
  const [includeReadme, setIncludeReadme] = useState(true);

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
    // Create a zip-like structure (in real implementation, would use JSZip)
    const files: Record<string, string> = {
      [`${agent.name.toLowerCase().replace(/\s+/g, "_")}_agent.py`]: generateCode("python"),
      "config.json": generateCode("json"),
    };
    
    if (includeEnvTemplate) {
      files[".env.example"] = generateEnvTemplate(agent);
    }
    
    if (includeReadme) {
      files["README.md"] = generateReadme(agent);
    }

    // For now, download the main file
    handleDownload();
  };

  // Simulate API deployment
  const handleDeployAPI = async () => {
    setIsDeploying(true);
    
    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a fake URL (in real implementation, would call backend)
    const agentSlug = agent.name.toLowerCase().replace(/\s+/g, "-");
    setDeployedUrl(`https://api.agentforge.app/v1/agents/${agentSlug}`);
    setIsDeploying(false);
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
            Export your agent code or deploy it as an API
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="download" className="gap-1.5">
              <Download className="w-4 h-4" />
              Download
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5">
              <Cloud className="w-4 h-4" />
              API
            </TabsTrigger>
            <TabsTrigger value="desktop" className="gap-1.5">
              <Monitor className="w-4 h-4" />
              Desktop
            </TabsTrigger>
          </TabsList>

          {/* Download Tab */}
          <TabsContent value="download" className="mt-4 space-y-4">
            {/* Format Selection */}
            <div className="flex gap-2">
              {[
                { id: "python", label: "Python", icon: Terminal },
                { id: "javascript", label: "JavaScript", icon: FileCode },
                { id: "json", label: "JSON Config", icon: FileJson },
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

            {/* Code Preview */}
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
              <ScrollArea className="h-[250px] border border-t-0 rounded-b-lg">
                <pre className="p-4 text-xs font-mono leading-relaxed">
                  <code>{code}</code>
                </pre>
              </ScrollArea>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={includeEnvTemplate}
                    onCheckedChange={setIncludeEnvTemplate}
                    id="env"
                  />
                  <Label htmlFor="env" className="text-sm">
                    Include .env template
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={includeReadme}
                    onCheckedChange={setIncludeReadme}
                    id="readme"
                  />
                  <Label htmlFor="readme" className="text-sm">
                    Include README
                  </Label>
                </div>
              </div>
              <Button onClick={handleDownloadPackage}>
                <Download className="w-4 h-4 mr-2" />
                Download Package
              </Button>
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
                  <pre className="text-xs font-mono bg-background p-3 rounded">
{`curl -X POST ${deployedUrl} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello!"}'`}
                  </pre>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="p-6 text-center rounded-lg border bg-muted/30">
                  <Cloud className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Deploy as API</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get a hosted API endpoint for your agent. Access it from anywhere.
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

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg border">
                    <p className="text-2xl font-bold text-primary">∞</p>
                    <p className="text-xs text-muted-foreground">Requests/month</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-2xl font-bold text-primary">99.9%</p>
                    <p className="text-xs text-muted-foreground">Uptime SLA</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-2xl font-bold text-primary">&lt;100ms</p>
                    <p className="text-xs text-muted-foreground">Avg latency</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Desktop Tab */}
          <TabsContent value="desktop" className="mt-4 space-y-4">
            <div className="p-6 text-center rounded-lg border bg-muted/30">
              <Monitor className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-medium mb-2">Desktop Application</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Run your agent locally with the AgentForge Runner. 
                Schedule tasks, set triggers, and work offline.
              </p>
              
              <div className="flex justify-center gap-2 mb-4">
                {[
                  { os: "macOS", available: true },
                  { os: "Windows", available: true },
                  { os: "Linux", available: true },
                ].map(({ os, available }) => (
                  <Button
                    key={os}
                    variant="outline"
                    disabled={!available}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {os}
                    {!available && <Badge variant="secondary" className="text-[10px]">Soon</Badge>}
                  </Button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Requires AgentForge Runner v2.0+
              </p>
            </div>

            <div className="p-4 rounded-lg border">
              <h4 className="font-medium text-sm mb-3">Features</h4>
              <ul className="space-y-2 text-sm">
                {[
                  "Run agents locally - your data stays private",
                  "Schedule recurring tasks with cron expressions",
                  "Set up file/email triggers to automate workflows",
                  "Works offline with local models (Ollama)",
                  "System tray integration for quick access",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
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

// Configuration
const config = {
  name: "${agent.name}",
  goal: "${agent.goal}",
  personality: "${agent.personality}",
  model: "${agent.modelId}",
  temperature: ${agent.temperature},
  maxTokens: ${agent.maxTokens},
};

// Initialize agent
const agent = new Agent(config);

// Add tools
const tools = ["${toolNames}"];
tools.forEach(toolId => {
  agent.addTool(Tool.fromRegistry(toolId));
});

// Set system prompt
agent.setSystemPrompt(\`
${agent.systemPrompt || `You are ${agent.name}, an AI assistant.
Your goal: ${agent.goal}
Personality: ${agent.personality}

Always be helpful, accurate, and professional.`}
\`);

// Chat function
export async function chat(message) {
  return await agent.chat(message);
}

// Main
async function main() {
  console.log(\`Starting \${config.name}...\`);
  
  const response = await chat("Hello! What can you help me with?");
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
# Generated by AgentForge

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY ${agentSlug}_agent.py .
COPY config.json .

# Environment variables
ENV OPENAI_API_KEY=""
ENV AGENT_PORT=8080

# Expose port
EXPOSE 8080

# Run agent
CMD ["python", "${agentSlug}_agent.py", "--serve", "--port", "8080"]
`;
}

function generateEnvTemplate(agent: BuilderAgent): string {
  return `# ${agent.name} - Environment Variables
# Copy this file to .env and fill in your values

# API Keys (add keys for the providers you use)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# Optional: Custom base URLs
# OPENAI_BASE_URL=https://api.openai.com/v1

# Agent Settings
AGENT_NAME="${agent.name}"
AGENT_MODEL="${agent.modelId}"
AGENT_TEMPERATURE=${agent.temperature}
`;
}

function generateReadme(agent: BuilderAgent): string {
  return `# ${agent.name}

> Generated by [AgentForge](https://agentforge.app)

## Overview

${agent.goal}

## Quick Start

1. Install dependencies:
\`\`\`bash
pip install agentforge
\`\`\`

2. Set up environment:
\`\`\`bash
cp .env.example .env
# Edit .env with your API keys
\`\`\`

3. Run the agent:
\`\`\`bash
python ${agent.name.toLowerCase().replace(/\s+/g, "_")}_agent.py
\`\`\`

## Configuration

- **Model**: ${agent.modelId}
- **Temperature**: ${agent.temperature}
- **Max Tokens**: ${agent.maxTokens}

## Tools

${agent.tools.map(t => `- ${t}`).join('\n')}

## License

MIT
`;
}
