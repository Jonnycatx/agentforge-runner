import { type AgentConfig } from "@shared/schema";
import { agents } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

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

export const storage = new DatabaseStorage();
