import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { agentConfigSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Get all agents (public + user's own if authenticated)
  app.get("/api/agents", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const agents = await storage.getAgents(userId);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // Get public agents (for gallery)
  app.get("/api/agents/public", async (req, res) => {
    try {
      const agents = await storage.getPublicAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch public agents" });
    }
  });

  // Get user's own agents
  app.get("/api/agents/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const agents = await storage.getUserAgents(userId);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user agents" });
    }
  });

  // Get single agent by ID (public agents or own private agents)
  app.get("/api/agents/:id", async (req: any, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      // If agent is private (has userId), only owner can view
      if (agent.userId && !agent.isPublic) {
        const userId = req.user?.claims?.sub;
        if (!userId || agent.userId !== userId) {
          return res.status(404).json({ error: "Agent not found" });
        }
      }
      
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  // Create new agent (requires auth)
  app.post("/api/agents", isAuthenticated, async (req: any, res) => {
    try {
      const createSchema = agentConfigSchema.omit({ 
        id: true, 
        userId: true,
        createdAt: true, 
        updatedAt: true 
      });
      
      const validatedData = createSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const agent = await storage.createAgent(validatedData, userId);
      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create agent" });
    }
  });

  // Update agent (requires auth and ownership)
  app.patch("/api/agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existingAgent = await storage.getAgent(req.params.id);
      
      if (!existingAgent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      // Only owner can update their agents
      if (existingAgent.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this agent" });
      }

      const updateSchema = agentConfigSchema.partial().omit({ 
        id: true, 
        userId: true,
        createdAt: true,
        updatedAt: true
      });
      
      const validatedData = updateSchema.parse(req.body);
      const agent = await storage.updateAgent(req.params.id, validatedData);
      
      res.json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to update agent" });
    }
  });

  // Delete agent (requires auth and ownership)
  app.delete("/api/agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existingAgent = await storage.getAgent(req.params.id);
      
      if (!existingAgent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      // Only owner can delete their agents
      if (existingAgent.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this agent" });
      }

      await storage.deleteAgent(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete agent" });
    }
  });

  // Inference proxy endpoint - routes API calls through backend to avoid CORS
  app.post("/api/inference/proxy", async (req, res) => {
    try {
      const { provider, model, messages, temperature, maxTokens, apiKey, baseUrl } = req.body;

      if (!provider || !model || !messages || !apiKey) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const endpoints: Record<string, string> = {
        openai: "https://api.openai.com/v1/chat/completions",
        groq: "https://api.groq.com/openai/v1/chat/completions",
        xai: "https://api.x.ai/v1/chat/completions",
      };

      // OpenAI-compatible providers (OpenAI, Groq, xAI)
      if (["openai", "groq", "xai"].includes(provider)) {
        const endpoint = baseUrl || endpoints[provider];
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: temperature || 0.7,
            max_tokens: maxTokens || 4096,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `API error (${response.status})`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorJson.message || errorText;
          } catch {
            errorMessage = errorText || `HTTP ${response.status}`;
          }
          return res.status(response.status).json({ error: errorMessage });
        }

        const data = await response.json();
        return res.json(data);
      }

      // Google Gemini
      if (provider === "google") {
        const systemMessage = messages.find((m: any) => m.role === "system");
        const chatMessages = messages.filter((m: any) => m.role !== "system");

        const contents = chatMessages.map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        let endpoint = baseUrl;
        if (!endpoint) {
          endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        } else {
          const cleanBase = endpoint.replace(/\/+$/, "");
          if (!cleanBase.includes(":generateContent")) {
            endpoint = `${cleanBase}/models/${model}:generateContent?key=${apiKey}`;
          }
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
            generationConfig: {
              temperature: temperature || 0.7,
              maxOutputTokens: maxTokens || 4096,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return res.json({ choices: [{ message: { content } }] });
      }

      return res.status(400).json({ error: "Unsupported provider" });
    } catch (error) {
      console.error("Inference proxy error:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Proxy request failed" 
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
