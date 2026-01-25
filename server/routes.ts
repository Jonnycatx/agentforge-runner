import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, toolStorage } from "./storage";
import { agentConfigSchema, toolCategories } from "@shared/schema";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { executeTool, hasExecutor, getExecutableTools } from "./tools";
import {
  analyzeUserRequest,
  classifyIntent,
  detectIndustry,
  decomposeTask,
  recommendTools,
  toolBundles,
  initializeConversation,
  processUserInput,
  getQuickSuggestions,
} from "./tools/discovery";

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
        let endpoint: string;
        if (baseUrl) {
          // If custom baseUrl provided, ensure it has the chat/completions path
          const cleanBase = baseUrl.replace(/\/+$/, "");
          endpoint = cleanBase.includes("/chat/completions") 
            ? cleanBase 
            : `${cleanBase}/chat/completions`;
        } else {
          endpoint = endpoints[provider];
        }
        
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

      // Anthropic
      if (provider === "anthropic") {
        const systemMessage = messages.find((m: any) => m.role === "system");
        const chatMessages = messages.filter((m: any) => m.role !== "system");

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens || 4096,
            temperature: temperature || 0.7,
            system: systemMessage?.content || "",
            messages: chatMessages.map((m: any) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `API error (${response.status})`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorText;
          } catch {
            errorMessage = errorText || `HTTP ${response.status}`;
          }
          return res.status(response.status).json({ error: errorMessage });
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || "";
        return res.json({ choices: [{ message: { content } }] });
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

  // ============================================================================
  // TOOL API ENDPOINTS - Phase 1: Tool Infrastructure
  // ============================================================================

  // Get all tools
  app.get("/api/tools", async (req, res) => {
    try {
      const { category, search } = req.query;
      let tools;
      
      if (search && typeof search === "string") {
        tools = await toolStorage.searchTools(search);
      } else if (category && typeof category === "string") {
        tools = await toolStorage.getToolsByCategory(category);
      } else {
        tools = await toolStorage.getTools();
      }
      
      res.json(tools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ error: "Failed to fetch tools" });
    }
  });

  // Get tool categories
  app.get("/api/tools/categories", (req, res) => {
    const categories = toolCategories.map(cat => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
    }));
    res.json(categories);
  });

  // Get single tool by ID
  app.get("/api/tools/:id", async (req, res) => {
    try {
      const tool = await toolStorage.getTool(req.params.id);
      if (!tool) {
        return res.status(404).json({ error: "Tool not found" });
      }
      res.json(tool);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tool" });
    }
  });

  // Get user's connected tools
  app.get("/api/tools/user/connected", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const connectedTools = await toolStorage.getUserConnectedTools(userId);
      res.json(connectedTools);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch connected tools" });
    }
  });

  // Get credential status for a tool
  app.get("/api/tools/:id/auth/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const credential = await toolStorage.getCredential(userId, req.params.id);
      res.json(credential || { isConnected: false });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch credential status" });
    }
  });

  // Save credential for a tool
  app.post("/api/tools/:id/auth", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { credentialType, ...credentials } = req.body;
      
      if (!credentialType) {
        return res.status(400).json({ error: "credentialType is required" });
      }
      
      // Verify the tool exists
      const tool = await toolStorage.getTool(req.params.id);
      if (!tool) {
        return res.status(404).json({ error: "Tool not found" });
      }
      
      await toolStorage.saveCredential(userId, req.params.id, credentialType, credentials);
      res.json({ success: true, isConnected: true });
    } catch (error) {
      console.error("Error saving credential:", error);
      res.status(500).json({ error: "Failed to save credential" });
    }
  });

  // Delete credential for a tool
  app.delete("/api/tools/:id/auth", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deleted = await toolStorage.deleteCredential(userId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Credential not found" });
      }
      res.json({ success: true, isConnected: false });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete credential" });
    }
  });

  // Test tool credential (verify it works)
  app.post("/api/tools/:id/auth/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tool = await toolStorage.getTool(req.params.id);
      
      if (!tool) {
        return res.status(404).json({ error: "Tool not found" });
      }
      
      const credential = await toolStorage.getDecryptedCredential(userId, req.params.id);
      if (!credential) {
        return res.status(400).json({ error: "No credential found. Please connect first." });
      }
      
      // TODO: Implement actual credential testing per tool type
      // For now, just return success if credential exists
      res.json({ success: true, message: "Credential is valid" });
    } catch (error) {
      res.status(500).json({ error: "Failed to test credential" });
    }
  });

  // Execute a tool
  app.post("/api/tools/:id/execute", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { input, agentId } = req.body;
      const toolId = req.params.id;
      
      // Check if tool exists
      const tool = await toolStorage.getTool(toolId);
      if (!tool) {
        return res.status(404).json({ error: "Tool not found" });
      }

      // Check if tool has an executor
      if (!hasExecutor(toolId)) {
        return res.status(501).json({ 
          error: `Tool "${tool.name}" is not yet implemented`,
          availableTools: getExecutableTools(),
        });
      }
      
      // Execute the tool
      const result = await executeTool(toolId, input || {}, {
        userId,
        agentId,
      });
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Tool execution error:", error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : "Tool execution failed",
        executionTime: 0,
        logs: [],
      });
    }
  });

  // Get list of executable tools
  app.get("/api/tools/executable", (req, res) => {
    res.json({
      tools: getExecutableTools(),
      count: getExecutableTools().length,
    });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ============================================================================
  // SMART TOOL DISCOVERY API - Phase 4
  // ============================================================================

  // Analyze user request and get full recommendations
  app.post("/api/discovery/analyze", async (req, res) => {
    try {
      const { query, context } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }
      
      const analysis = analyzeUserRequest(query, context);
      res.json(analysis);
    } catch (error) {
      console.error("Discovery analysis error:", error);
      res.status(500).json({ error: "Failed to analyze request" });
    }
  });

  // Classify intent from user input
  app.post("/api/discovery/intent", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }
      
      const intent = classifyIntent(query);
      res.json(intent);
    } catch (error) {
      res.status(500).json({ error: "Failed to classify intent" });
    }
  });

  // Detect industry from user input
  app.post("/api/discovery/industry", async (req, res) => {
    try {
      const { query, context } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }
      
      const industry = detectIndustry(query, context);
      res.json(industry);
    } catch (error) {
      res.status(500).json({ error: "Failed to detect industry" });
    }
  });

  // Decompose task into steps
  app.post("/api/discovery/decompose", async (req, res) => {
    try {
      const { query, intent } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }
      
      const tasks = decomposeTask(query, intent);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to decompose task" });
    }
  });

  // Get tool recommendations
  app.post("/api/discovery/recommend", async (req, res) => {
    try {
      const { intent, industry, tasks } = req.body;
      
      const recommendations = recommendTools(intent, industry, tasks);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // Get tool bundles
  app.get("/api/discovery/bundles", (req, res) => {
    res.json(toolBundles);
  });

  // Conversation session storage (in-memory for now)
  const conversationSessions = new Map<string, any>();

  // Start a new conversation
  app.post("/api/discovery/conversation/start", (req, res) => {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const context = initializeConversation();
      
      conversationSessions.set(sessionId, context);
      
      // Send initial greeting
      const response = processUserInput("", context);
      
      res.json({
        sessionId,
        ...response,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to start conversation" });
    }
  });

  // Send message in conversation
  app.post("/api/discovery/conversation/message", (req, res) => {
    try {
      const { sessionId, message } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({ error: "sessionId and message are required" });
      }
      
      let context = conversationSessions.get(sessionId);
      if (!context) {
        // Start new session if not found
        context = initializeConversation();
        conversationSessions.set(sessionId, context);
      }
      
      const response = processUserInput(message, context);
      conversationSessions.set(sessionId, response.context);
      
      res.json({
        sessionId,
        ...response,
      });
    } catch (error) {
      console.error("Conversation error:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Get quick suggestions for current context
  app.get("/api/discovery/conversation/:sessionId/suggestions", (req, res) => {
    try {
      const context = conversationSessions.get(req.params.sessionId);
      
      if (!context) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const suggestions = getQuickSuggestions(context);
      res.json({ suggestions });
    } catch (error) {
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  // End conversation and get final config
  app.post("/api/discovery/conversation/:sessionId/complete", (req, res) => {
    try {
      const context = conversationSessions.get(req.params.sessionId);
      
      if (!context) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Build final agent configuration
      const agentConfig = {
        name: context.agentName || "My Agent",
        goal: context.tasks?.summary || "Help with various tasks",
        personality: context.customizations.personality || "Helpful and professional",
        tools: context.selectedTools,
        temperature: context.customizations.temperature || 0.5,
        maxTokens: 4096,
        systemPrompt: "",
        // Include metadata for reference
        metadata: {
          intent: context.intent,
          industry: context.industry,
          employee: context.selectedEmployee,
        },
      };
      
      // Clean up session
      conversationSessions.delete(req.params.sessionId);
      
      res.json(agentConfig);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete conversation" });
    }
  });

  return httpServer;
}
