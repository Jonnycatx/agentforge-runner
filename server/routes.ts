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

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
