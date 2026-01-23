import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { agentConfigSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get all agents
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAgents();
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

  // Get single agent by ID
  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  // Create new agent
  app.post("/api/agents", async (req, res) => {
    try {
      const createSchema = agentConfigSchema.omit({ 
        id: true, 
        createdAt: true, 
        updatedAt: true 
      });
      
      const validatedData = createSchema.parse(req.body);
      const agent = await storage.createAgent(validatedData);
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

  // Update agent
  app.patch("/api/agents/:id", async (req, res) => {
    try {
      const updateSchema = agentConfigSchema.partial().omit({ 
        id: true, 
        createdAt: true 
      });
      
      const validatedData = updateSchema.parse(req.body);
      const agent = await storage.updateAgent(req.params.id, validatedData);
      
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
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

  // Delete agent
  app.delete("/api/agents/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAgent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Agent not found" });
      }
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
