import { type User, type InsertUser, type AgentConfig, agentConfigSchema } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Agents
  getAgents(): Promise<AgentConfig[]>;
  getAgent(id: string): Promise<AgentConfig | undefined>;
  createAgent(agent: Omit<AgentConfig, "id" | "createdAt" | "updatedAt">): Promise<AgentConfig>;
  updateAgent(id: string, updates: Partial<AgentConfig>): Promise<AgentConfig | undefined>;
  deleteAgent(id: string): Promise<boolean>;
  getPublicAgents(): Promise<AgentConfig[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private agents: Map<string, AgentConfig>;

  constructor() {
    this.users = new Map();
    this.agents = new Map();

    // Seed with sample agents
    this.seedSampleAgents();
  }

  private seedSampleAgents() {
    const sampleAgents: AgentConfig[] = [
      {
        id: "sample-1",
        name: "Web Design Assistant",
        description: "Helps with HTML/CSS generation and website migration",
        goal: "Assist users in building and migrating websites",
        personality: "Professional and helpful",
        tools: ["html_generator", "file_reader", "image_analysis"],
        knowledge: [],
        modelId: "gpt-4o",
        providerId: "openai",
        temperature: 0.7,
        maxTokens: 4096,
        isPublic: true,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      },
      {
        id: "sample-2",
        name: "Data Analyst",
        description: "Analyzes data and creates visualizations",
        goal: "Help users understand their data through analysis and charts",
        personality: "Precise and thorough",
        tools: ["code_interpreter", "calculator", "file_reader"],
        knowledge: [],
        modelId: "claude-3-5-sonnet",
        providerId: "anthropic",
        temperature: 0.5,
        maxTokens: 4096,
        isPublic: true,
        createdAt: "2024-01-10T14:30:00Z",
        updatedAt: "2024-01-10T14:30:00Z",
      },
      {
        id: "sample-3",
        name: "Research Assistant",
        description: "Searches the web and summarizes findings",
        goal: "Find and synthesize information from various sources",
        personality: "Curious and thorough",
        tools: ["web_search", "file_reader"],
        knowledge: [],
        modelId: "llama-3.1-70b",
        providerId: "groq",
        temperature: 0.7,
        maxTokens: 4096,
        isPublic: true,
        createdAt: "2024-01-08T09:15:00Z",
        updatedAt: "2024-01-08T09:15:00Z",
      },
      {
        id: "sample-4",
        name: "Code Reviewer",
        description: "Reviews code and suggests improvements",
        goal: "Analyze code quality and provide actionable feedback",
        personality: "Constructive and detailed",
        tools: ["code_interpreter", "file_reader"],
        knowledge: [],
        modelId: "gpt-4o",
        providerId: "openai",
        temperature: 0.3,
        maxTokens: 4096,
        isPublic: true,
        createdAt: "2024-01-05T16:45:00Z",
        updatedAt: "2024-01-05T16:45:00Z",
      },
    ];

    for (const agent of sampleAgents) {
      this.agents.set(agent.id, agent);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Agent methods
  async getAgents(): Promise<AgentConfig[]> {
    return Array.from(this.agents.values());
  }

  async getAgent(id: string): Promise<AgentConfig | undefined> {
    return this.agents.get(id);
  }

  async createAgent(
    agentData: Omit<AgentConfig, "id" | "createdAt" | "updatedAt">
  ): Promise<AgentConfig> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const agent: AgentConfig = {
      ...agentData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(
    id: string,
    updates: Partial<AgentConfig>
  ): Promise<AgentConfig | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    const updatedAgent: AgentConfig = {
      ...agent,
      ...updates,
      id, // Prevent ID from being changed
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  async deleteAgent(id: string): Promise<boolean> {
    return this.agents.delete(id);
  }

  async getPublicAgents(): Promise<AgentConfig[]> {
    return Array.from(this.agents.values()).filter((agent) => agent.isPublic);
  }
}

export const storage = new MemStorage();
