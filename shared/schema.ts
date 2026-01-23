import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (users, sessions)
export * from "./models/auth";

// Model Provider configuration
export const modelProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["openai", "anthropic", "groq", "google", "xai", "ollama", "custom"]),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  models: z.array(z.object({
    id: z.string(),
    name: z.string(),
    contextLength: z.number().optional(),
    costPer1kTokens: z.number().optional(),
  })).optional(),
  isConnected: z.boolean().default(false),
});

export type ModelProvider = z.infer<typeof modelProviderSchema>;

// Agent configuration schema
export const agentConfigSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  goal: z.string(),
  personality: z.string().optional(),
  tools: z.array(z.string()).default([]),
  knowledge: z.array(z.string()).default([]),
  modelId: z.string().optional(),
  providerId: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().default(4096),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  isPublic: z.boolean().default(false),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;

// Agent table for persistence
export const agents = pgTable("agents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }),
  name: text("name").notNull(),
  description: text("description"),
  goal: text("goal").notNull(),
  personality: text("personality"),
  tools: jsonb("tools").$type<string[]>().default([]),
  knowledge: jsonb("knowledge").$type<string[]>().default([]),
  modelId: text("model_id"),
  providerId: text("provider_id"),
  systemPrompt: text("system_prompt"),
  temperature: text("temperature").default("0.7"),
  maxTokens: text("max_tokens").default("4096"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Chat message schema
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Builder conversation state
export const builderStateSchema = z.object({
  messages: z.array(chatMessageSchema),
  currentAgent: agentConfigSchema.partial().optional(),
  step: z.enum(["greeting", "goal", "personality", "tools", "model", "review", "complete"]).default("greeting"),
});

export type BuilderState = z.infer<typeof builderStateSchema>;

// Default model providers (pre-configured)
export const defaultProviders: Omit<ModelProvider, "apiKey" | "isConnected">[] = [
  {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { id: "gpt-4o", name: "GPT-4o", contextLength: 128000, costPer1kTokens: 0.005 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextLength: 128000, costPer1kTokens: 0.00015 },
      { id: "o1", name: "o1", contextLength: 200000, costPer1kTokens: 0.015 },
      { id: "o1-mini", name: "o1 Mini", contextLength: 128000, costPer1kTokens: 0.003 },
      { id: "o1-preview", name: "o1 Preview", contextLength: 128000, costPer1kTokens: 0.015 },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextLength: 128000, costPer1kTokens: 0.01 },
      { id: "gpt-4", name: "GPT-4", contextLength: 8192, costPer1kTokens: 0.03 },
      { id: "gpt-4-32k", name: "GPT-4 32K", contextLength: 32768, costPer1kTokens: 0.06 },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextLength: 16385, costPer1kTokens: 0.0005 },
      { id: "gpt-3.5-turbo-16k", name: "GPT-3.5 Turbo 16K", contextLength: 16385, costPer1kTokens: 0.001 },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextLength: 200000, costPer1kTokens: 0.015 },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", contextLength: 200000, costPer1kTokens: 0.015 },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextLength: 200000, costPer1kTokens: 0.0008 },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", contextLength: 200000, costPer1kTokens: 0.00025 },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "claude-2.1", name: "Claude 2.1", contextLength: 200000, costPer1kTokens: 0.008 },
      { id: "claude-2.0", name: "Claude 2.0", contextLength: 100000, costPer1kTokens: 0.008 },
      { id: "claude-instant-1.2", name: "Claude Instant 1.2", contextLength: 100000, costPer1kTokens: 0.0008 },
    ],
  },
  {
    id: "groq",
    name: "Groq (Free)",
    type: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama3-70b-8192", name: "Llama 3 70B", contextLength: 8192, costPer1kTokens: 0 },
      { id: "llama3-8b-8192", name: "Llama 3 8B", contextLength: 8192, costPer1kTokens: 0 },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextLength: 32768, costPer1kTokens: 0 },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", contextLength: 8192, costPer1kTokens: 0 },
      { id: "gemma-7b-it", name: "Gemma 7B", contextLength: 8192, costPer1kTokens: 0 },
      { id: "whisper-large-v3", name: "Whisper Large v3", contextLength: 448, costPer1kTokens: 0 },
      { id: "llama-guard-3-8b", name: "Llama Guard 3 8B", contextLength: 8192, costPer1kTokens: 0 },
    ],
  },
  {
    id: "google",
    name: "Google AI",
    type: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextLength: 1048576, costPer1kTokens: 0 },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", contextLength: 1048576, costPer1kTokens: 0 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextLength: 2097152, costPer1kTokens: 0.00125 },
      { id: "gemini-1.5-pro-latest", name: "Gemini 1.5 Pro Latest", contextLength: 2097152, costPer1kTokens: 0.00125 },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextLength: 1048576, costPer1kTokens: 0.000075 },
      { id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash Latest", contextLength: 1048576, costPer1kTokens: 0.000075 },
      { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", contextLength: 1048576, costPer1kTokens: 0 },
      { id: "gemini-1.0-pro", name: "Gemini 1.0 Pro", contextLength: 32768, costPer1kTokens: 0.0005 },
      { id: "gemini-1.0-pro-vision", name: "Gemini 1.0 Pro Vision", contextLength: 16384, costPer1kTokens: 0.0005 },
      { id: "text-embedding-004", name: "Text Embedding 004", contextLength: 2048, costPer1kTokens: 0 },
    ],
  },
  {
    id: "xai",
    name: "xAI",
    type: "xai",
    baseUrl: "https://api.x.ai/v1",
    models: [
      { id: "grok-3", name: "Grok 3", contextLength: 131072, costPer1kTokens: 0.003 },
      { id: "grok-3-fast", name: "Grok 3 Fast", contextLength: 131072, costPer1kTokens: 0.005 },
      { id: "grok-3-mini", name: "Grok 3 Mini", contextLength: 131072, costPer1kTokens: 0.0003 },
      { id: "grok-3-mini-fast", name: "Grok 3 Mini Fast", contextLength: 131072, costPer1kTokens: 0.0006 },
      { id: "grok-2", name: "Grok 2", contextLength: 131072, costPer1kTokens: 0.002 },
      { id: "grok-2-latest", name: "Grok 2 Latest", contextLength: 131072, costPer1kTokens: 0.002 },
      { id: "grok-2-mini", name: "Grok 2 Mini", contextLength: 131072, costPer1kTokens: 0.0002 },
      { id: "grok-2-vision", name: "Grok 2 Vision", contextLength: 32768, costPer1kTokens: 0.002 },
      { id: "grok-beta", name: "Grok Beta", contextLength: 131072, costPer1kTokens: 0.005 },
      { id: "grok-vision-beta", name: "Grok Vision Beta", contextLength: 8192, costPer1kTokens: 0.005 },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    type: "ollama",
    baseUrl: "http://localhost:11434",
    models: [
      { id: "llama3.2", name: "Llama 3.2", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama3.2:1b", name: "Llama 3.2 1B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama3.1", name: "Llama 3.1", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama3.1:70b", name: "Llama 3.1 70B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "mistral", name: "Mistral 7B", contextLength: 32768, costPer1kTokens: 0 },
      { id: "mixtral", name: "Mixtral 8x7B", contextLength: 32768, costPer1kTokens: 0 },
      { id: "codellama", name: "Code Llama", contextLength: 16384, costPer1kTokens: 0 },
      { id: "deepseek-coder-v2", name: "DeepSeek Coder V2", contextLength: 131072, costPer1kTokens: 0 },
      { id: "phi3", name: "Phi-3", contextLength: 4096, costPer1kTokens: 0 },
      { id: "gemma2", name: "Gemma 2", contextLength: 8192, costPer1kTokens: 0 },
    ],
  },
];

// Available tools for agents
export const availableTools = [
  { id: "web_search", name: "Web Search", description: "Search the internet for information" },
  { id: "code_interpreter", name: "Code Interpreter", description: "Execute Python code" },
  { id: "file_reader", name: "File Reader", description: "Read and parse files" },
  { id: "image_analysis", name: "Image Analysis", description: "Analyze and describe images" },
  { id: "html_generator", name: "HTML Generator", description: "Generate HTML/CSS/JS code" },
  { id: "api_caller", name: "API Caller", description: "Make HTTP requests to APIs" },
  { id: "database_query", name: "Database Query", description: "Query SQL databases" },
  { id: "text_to_speech", name: "Text to Speech", description: "Convert text to audio" },
  { id: "calculator", name: "Calculator", description: "Perform mathematical calculations" },
];
