import { type AgentConfig, type ToolDefinition, type ToolDefinitionInput, type ToolCredential, toolRegistry } from "@shared/schema";
import { agents, tools, toolCredentials, toolExecutions } from "@shared/schema";
import { db, isMockMode } from "./db";
import { eq, and, or, isNull, like, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

export interface IStorage {
  // Agents
  getAgents(userId?: string): Promise<AgentConfig[]>;
  getAgent(id: string): Promise<AgentConfig | undefined>;
  createAgent(agent: Omit<AgentConfig, "id" | "createdAt" | "updatedAt">, userId?: string): Promise<AgentConfig>;
  updateAgent(id: string, updates: Partial<AgentConfig>): Promise<AgentConfig | undefined>;
  deleteAgent(id: string): Promise<boolean>;
  getPublicAgents(): Promise<AgentConfig[]>;
  getUserAgents(userId: string): Promise<AgentConfig[]>;
}

// Helper to convert DB agent to AgentConfig
function dbToConfig(dbAgent: typeof agents.$inferSelect): AgentConfig {
  return {
    id: dbAgent.id,
    userId: dbAgent.userId || undefined,
    name: dbAgent.name,
    description: dbAgent.description || undefined,
    goal: dbAgent.goal,
    personality: dbAgent.personality || undefined,
    tools: (dbAgent.tools as string[]) || [],
    knowledge: (dbAgent.knowledge as string[]) || [],
    modelId: dbAgent.modelId || undefined,
    providerId: dbAgent.providerId || undefined,
    systemPrompt: dbAgent.systemPrompt || undefined,
    temperature: parseFloat(dbAgent.temperature || "0.7"),
    maxTokens: parseInt(dbAgent.maxTokens || "4096", 10),
    isPublic: dbAgent.isPublic || false,
    createdAt: dbAgent.createdAt?.toISOString(),
    updatedAt: dbAgent.updatedAt?.toISOString(),
  };
}

export class DatabaseStorage implements IStorage {
  async getAgents(userId?: string): Promise<AgentConfig[]> {
    let result;
    if (userId) {
      // Get user's own agents + public agents
      result = await db.select().from(agents).where(
        or(eq(agents.userId, userId), eq(agents.isPublic, true))
      );
    } else {
      // Get all public agents
      result = await db.select().from(agents).where(eq(agents.isPublic, true));
    }
    return result.map(dbToConfig);
  }

  async getAgent(id: string): Promise<AgentConfig | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent ? dbToConfig(agent) : undefined;
  }

  async createAgent(
    agentData: Omit<AgentConfig, "id" | "createdAt" | "updatedAt">,
    userId?: string
  ): Promise<AgentConfig> {
    const id = randomUUID();
    const [agent] = await db
      .insert(agents)
      .values({
        id,
        userId: userId || null,
        name: agentData.name,
        description: agentData.description || null,
        goal: agentData.goal,
        personality: agentData.personality || null,
        tools: agentData.tools || [],
        knowledge: agentData.knowledge || [],
        modelId: agentData.modelId || null,
        providerId: agentData.providerId || null,
        systemPrompt: agentData.systemPrompt || null,
        temperature: String(agentData.temperature ?? 0.7),
        maxTokens: String(agentData.maxTokens ?? 4096),
        isPublic: agentData.isPublic ?? false,
      })
      .returning();
    return dbToConfig(agent);
  }

  async updateAgent(
    id: string,
    updates: Partial<AgentConfig>
  ): Promise<AgentConfig | undefined> {
    const updateData: any = { updatedAt: new Date() };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.goal !== undefined) updateData.goal = updates.goal;
    if (updates.personality !== undefined) updateData.personality = updates.personality;
    if (updates.tools !== undefined) updateData.tools = updates.tools;
    if (updates.knowledge !== undefined) updateData.knowledge = updates.knowledge;
    if (updates.modelId !== undefined) updateData.modelId = updates.modelId;
    if (updates.providerId !== undefined) updateData.providerId = updates.providerId;
    if (updates.systemPrompt !== undefined) updateData.systemPrompt = updates.systemPrompt;
    if (updates.temperature !== undefined) updateData.temperature = String(updates.temperature);
    if (updates.maxTokens !== undefined) updateData.maxTokens = String(updates.maxTokens);
    if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;

    const [agent] = await db
      .update(agents)
      .set(updateData)
      .where(eq(agents.id, id))
      .returning();

    return agent ? dbToConfig(agent) : undefined;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id)).returning();
    return result.length > 0;
  }

  async getPublicAgents(): Promise<AgentConfig[]> {
    const result = await db.select().from(agents).where(eq(agents.isPublic, true));
    return result.map(dbToConfig);
  }

  async getUserAgents(userId: string): Promise<AgentConfig[]> {
    const result = await db.select().from(agents).where(eq(agents.userId, userId));
    return result.map(dbToConfig);
  }
}

// ============================================================================
// TOOL STORAGE - Phase 1: Tool Infrastructure
// ============================================================================

// Encryption key for credentials (in production, use environment variable)
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || "agentforge-default-key-change-me!";

function getEncryptionKey(): Buffer {
  return scryptSync(ENCRYPTION_KEY, "salt", 32);
}

function encryptCredential(data: string): string {
  const iv = randomBytes(16);
  const key = getEncryptionKey();
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptCredential(encrypted: string): string {
  const [ivHex, encryptedData] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Helper to convert DB tool to ToolDefinition
function dbToToolDefinition(dbTool: typeof tools.$inferSelect): ToolDefinition {
  return {
    id: dbTool.id,
    name: dbTool.name,
    description: dbTool.description,
    longDescription: dbTool.longDescription || undefined,
    category: dbTool.category as ToolDefinition["category"],
    icon: dbTool.icon,
    authType: (dbTool.authType || "none") as ToolDefinition["authType"],
    authConfig: dbTool.authConfig || undefined,
    inputs: (dbTool.inputs as ToolDefinition["inputs"]) || [],
    outputs: (dbTool.outputs as ToolDefinition["outputs"]) || [],
    isEnabled: dbTool.isEnabled ?? true,
    isPremium: dbTool.isPremium ?? false,
    rateLimit: dbTool.rateLimit || undefined,
    dependencies: (dbTool.dependencies as string[]) || [],
    tags: (dbTool.tags as string[]) || [],
  };
}

export interface IToolStorage {
  // Tools
  getTools(): Promise<ToolDefinitionInput[]>;
  getTool(id: string): Promise<ToolDefinitionInput | undefined>;
  getToolsByCategory(category: string): Promise<ToolDefinitionInput[]>;
  searchTools(query: string): Promise<ToolDefinitionInput[]>;
  seedTools(): Promise<void>;
  
  // Credentials
  getCredential(userId: string, toolId: string): Promise<{ isConnected: boolean; expiresAt?: string } | undefined>;
  saveCredential(userId: string, toolId: string, credentialType: string, data: object): Promise<void>;
  deleteCredential(userId: string, toolId: string): Promise<boolean>;
  getUserConnectedTools(userId: string): Promise<string[]>;
  getDecryptedCredential(userId: string, toolId: string): Promise<object | undefined>;
  
  // Execution History
  logExecution(params: {
    userId?: string;
    agentId?: string;
    toolId: string;
    input: any;
    output: any;
    success: boolean;
    error?: string;
    executionTime: number;
  }): Promise<void>;
}

export class ToolStorage implements IToolStorage {
  // Get all tools from registry (in-memory for performance)
  async getTools(): Promise<ToolDefinitionInput[]> {
    return toolRegistry;
  }

  // Get single tool by ID
  async getTool(id: string): Promise<ToolDefinitionInput | undefined> {
    return toolRegistry.find(t => t.id === id);
  }

  // Get tools by category
  async getToolsByCategory(category: string): Promise<ToolDefinitionInput[]> {
    return toolRegistry.filter(t => t.category === category);
  }

  // Search tools by name, description, or tags
  async searchTools(query: string): Promise<ToolDefinitionInput[]> {
    const lowerQuery = query.toLowerCase();
    return toolRegistry.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Seed tools to database (for persistence/customization)
  async seedTools(): Promise<void> {
    for (const tool of toolRegistry) {
      try {
        // Cast to any to avoid strict type checking since toolRegistry uses input types
        await db.insert(tools).values({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          longDescription: tool.longDescription || null,
          category: tool.category,
          icon: tool.icon,
          authType: tool.authType || "none",
          authConfig: tool.authConfig as any || null,
          inputs: (tool.inputs || []) as any,
          outputs: (tool.outputs || []) as any,
          isEnabled: tool.isEnabled ?? true,
          isPremium: tool.isPremium ?? false,
          rateLimit: tool.rateLimit as any || null,
          dependencies: (tool.dependencies || []) as any,
          tags: (tool.tags || []) as any,
        }).onConflictDoNothing();
      } catch (error) {
        // Tool may already exist, ignore
      }
    }
  }

  // Get credential status for a tool
  async getCredential(userId: string, toolId: string): Promise<{ isConnected: boolean; expiresAt?: string } | undefined> {
    const [cred] = await db.select({
      isConnected: toolCredentials.isConnected,
      expiresAt: toolCredentials.expiresAt,
    })
    .from(toolCredentials)
    .where(and(
      eq(toolCredentials.userId, userId),
      eq(toolCredentials.toolId, toolId)
    ));
    
    if (!cred) return undefined;
    
    return {
      isConnected: cred.isConnected ?? false,
      expiresAt: cred.expiresAt?.toISOString(),
    };
  }

  // Save encrypted credential
  async saveCredential(userId: string, toolId: string, credentialType: string, data: object): Promise<void> {
    const encryptedData = encryptCredential(JSON.stringify(data));
    const id = randomUUID();
    
    // Upsert credential
    const existing = await db.select({ id: toolCredentials.id })
      .from(toolCredentials)
      .where(and(
        eq(toolCredentials.userId, userId),
        eq(toolCredentials.toolId, toolId)
      ));
    
    if (existing.length > 0) {
      await db.update(toolCredentials)
        .set({
          encryptedData,
          credentialType,
          isConnected: true,
          updatedAt: new Date(),
        })
        .where(eq(toolCredentials.id, existing[0].id));
    } else {
      await db.insert(toolCredentials).values({
        id,
        userId,
        toolId,
        credentialType,
        encryptedData,
        isConnected: true,
      });
    }
  }

  // Delete credential
  async deleteCredential(userId: string, toolId: string): Promise<boolean> {
    const result = await db.delete(toolCredentials)
      .where(and(
        eq(toolCredentials.userId, userId),
        eq(toolCredentials.toolId, toolId)
      ))
      .returning();
    return result.length > 0;
  }

  // Get all connected tool IDs for a user
  async getUserConnectedTools(userId: string): Promise<string[]> {
    const creds = await db.select({ toolId: toolCredentials.toolId })
      .from(toolCredentials)
      .where(and(
        eq(toolCredentials.userId, userId),
        eq(toolCredentials.isConnected, true)
      ));
    return creds.map((c: { toolId: string }) => c.toolId);
  }

  // Get decrypted credential for execution
  async getDecryptedCredential(userId: string, toolId: string): Promise<object | undefined> {
    const [cred] = await db.select({ encryptedData: toolCredentials.encryptedData })
      .from(toolCredentials)
      .where(and(
        eq(toolCredentials.userId, userId),
        eq(toolCredentials.toolId, toolId),
        eq(toolCredentials.isConnected, true)
      ));
    
    if (!cred) return undefined;
    
    try {
      return JSON.parse(decryptCredential(cred.encryptedData));
    } catch {
      return undefined;
    }
  }

  // Log tool execution
  async logExecution(params: {
    userId?: string;
    agentId?: string;
    toolId: string;
    input: any;
    output: any;
    success: boolean;
    error?: string;
    executionTime: number;
  }): Promise<void> {
    await db.insert(toolExecutions).values({
      id: randomUUID(),
      userId: params.userId || null,
      agentId: params.agentId || null,
      toolId: params.toolId,
      input: params.input,
      output: params.output,
      success: params.success,
      error: params.error || null,
      executionTime: String(params.executionTime),
    });
  }
}

// Mock in-memory storage for development without database
class MockStorage implements IStorage {
  private agents: Map<string, AgentConfig> = new Map();

  async getAgents(userId?: string): Promise<AgentConfig[]> {
    return Array.from(this.agents.values()).filter(
      a => !userId || a.userId === userId || a.isPublic
    );
  }

  async getAgent(id: string): Promise<AgentConfig | undefined> {
    return this.agents.get(id);
  }

  async createAgent(agent: Omit<AgentConfig, "id" | "createdAt" | "updatedAt">, userId?: string): Promise<AgentConfig> {
    const now = new Date().toISOString();
    const newAgent: AgentConfig = {
      ...agent,
      id: randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
    };
    this.agents.set(newAgent.id, newAgent);
    return newAgent;
  }

  async updateAgent(id: string, updates: Partial<AgentConfig>): Promise<AgentConfig | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    const updated = { ...agent, ...updates, updatedAt: new Date().toISOString() };
    this.agents.set(id, updated);
    return updated;
  }

  async deleteAgent(id: string): Promise<boolean> {
    return this.agents.delete(id);
  }

  async getPublicAgents(): Promise<AgentConfig[]> {
    return Array.from(this.agents.values()).filter(a => a.isPublic);
  }

  async getUserAgents(userId: string): Promise<AgentConfig[]> {
    return Array.from(this.agents.values()).filter(a => a.userId === userId);
  }
}

class MockToolStorage implements IToolStorage {
  private credentials: Map<string, any> = new Map();
  private credentialData: Map<string, object> = new Map();

  async getTools(): Promise<ToolDefinitionInput[]> {
    return toolRegistry;
  }

  async getTool(id: string): Promise<ToolDefinitionInput | undefined> {
    return toolRegistry.find(t => t.id === id);
  }

  async getToolsByCategory(category: string): Promise<ToolDefinitionInput[]> {
    return toolRegistry.filter(t => t.category === category);
  }

  async searchTools(query: string): Promise<ToolDefinitionInput[]> {
    const q = query.toLowerCase();
    return toolRegistry.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags?.some((tag: string) => tag.toLowerCase().includes(q))
    );
  }

  async seedTools(): Promise<void> {
    // No-op in mock mode - tools are already in registry
  }

  async getCredential(userId: string, toolId: string): Promise<{ isConnected: boolean; expiresAt?: string } | undefined> {
    const cred = this.credentials.get(`${userId}-${toolId}`);
    if (cred) {
      return { isConnected: true, expiresAt: cred.expiresAt };
    }
    return undefined;
  }

  async saveCredential(userId: string, toolId: string, credentialType: string, data: object): Promise<void> {
    const key = `${userId}-${toolId}`;
    this.credentials.set(key, {
      id: randomUUID(),
      userId: userId,
      toolId,
      credentialType,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.credentialData.set(key, data);
  }

  async getDecryptedCredential(userId: string, toolId: string): Promise<object | undefined> {
    return this.credentialData.get(`${userId}-${toolId}`);
  }

  async deleteCredential(userId: string, toolId: string): Promise<boolean> {
    const key = `${userId}-${toolId}`;
    this.credentialData.delete(key);
    return this.credentials.delete(key);
  }

  async getUserConnectedTools(userId: string): Promise<string[]> {
    const prefix = `${userId}-`;
    return Array.from(this.credentials.keys())
      .filter(k => k.startsWith(prefix))
      .map(k => k.replace(prefix, ''));
  }

  async logExecution(params: any): Promise<void> {
    // No-op in mock mode
    console.log(`[Mock] Tool execution: ${params.toolId} - ${params.success ? 'success' : 'failed'}`);
  }
}

// Use mock storage when database is not available
export const storage = isMockMode ? new MockStorage() : new DatabaseStorage();
export const toolStorage = isMockMode ? new MockToolStorage() : new ToolStorage();
