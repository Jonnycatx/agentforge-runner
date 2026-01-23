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

// Default model providers (pre-configured) - 15 models each, most recent first
export const defaultProviders: Omit<ModelProvider, "apiKey" | "isConnected">[] = [
  {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { id: "gpt-5.2-codex", name: "GPT-5.2 Codex", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "codex-mini-latest", name: "Codex Mini", contextLength: 200000, costPer1kTokens: 0.0015 },
      { id: "o3-pro", name: "o3 Pro", contextLength: 200000, costPer1kTokens: 0.02 },
      { id: "o3", name: "o3", contextLength: 200000, costPer1kTokens: 0.01 },
      { id: "o3-mini", name: "o3 Mini", contextLength: 200000, costPer1kTokens: 0.0011 },
      { id: "o4-mini", name: "o4 Mini", contextLength: 200000, costPer1kTokens: 0.0011 },
      { id: "gpt-4.1", name: "GPT-4.1", contextLength: 1047576, costPer1kTokens: 0.002 },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", contextLength: 1047576, costPer1kTokens: 0.0004 },
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", contextLength: 1047576, costPer1kTokens: 0.0001 },
      { id: "o1", name: "o1", contextLength: 200000, costPer1kTokens: 0.015 },
      { id: "o1-mini", name: "o1 Mini", contextLength: 128000, costPer1kTokens: 0.003 },
      { id: "o1-pro", name: "o1 Pro", contextLength: 200000, costPer1kTokens: 0.15 },
      { id: "gpt-4o", name: "GPT-4o", contextLength: 128000, costPer1kTokens: 0.005 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextLength: 128000, costPer1kTokens: 0.00015 },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextLength: 128000, costPer1kTokens: 0.01 },
      { id: "gpt-4", name: "GPT-4", contextLength: 8192, costPer1kTokens: 0.03 },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    models: [
      { id: "claude-sonnet-4-5-20250514", name: "Claude Sonnet 4.5", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "claude-opus-4-5-20250514", name: "Claude Opus 4.5", contextLength: 200000, costPer1kTokens: 0.015 },
      { id: "claude-cowork-1-20250514", name: "Claude CoWork", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextLength: 200000, costPer1kTokens: 0.015 },
      { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet v2", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextLength: 200000, costPer1kTokens: 0.0008 },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", contextLength: 200000, costPer1kTokens: 0.015 },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", contextLength: 200000, costPer1kTokens: 0.003 },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", contextLength: 200000, costPer1kTokens: 0.00025 },
      { id: "claude-2.1", name: "Claude 2.1", contextLength: 200000, costPer1kTokens: 0.008 },
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
      { id: "llama-3.3-70b-specdec", name: "Llama 3.3 70B SpecDec", contextLength: 8192, costPer1kTokens: 0 },
      { id: "llama-3.2-90b-vision-preview", name: "Llama 3.2 90B Vision", contextLength: 8192, costPer1kTokens: 0 },
      { id: "llama-3.2-11b-vision-preview", name: "Llama 3.2 11B Vision", contextLength: 8192, costPer1kTokens: 0 },
      { id: "llama-3.2-3b-preview", name: "Llama 3.2 3B", contextLength: 8192, costPer1kTokens: 0 },
      { id: "llama-3.2-1b-preview", name: "Llama 3.2 1B", contextLength: 8192, costPer1kTokens: 0 },
      { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama3-70b-8192", name: "Llama 3 70B", contextLength: 8192, costPer1kTokens: 0 },
      { id: "llama3-8b-8192", name: "Llama 3 8B", contextLength: 8192, costPer1kTokens: 0 },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextLength: 32768, costPer1kTokens: 0 },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", contextLength: 8192, costPer1kTokens: 0 },
      { id: "gemma-7b-it", name: "Gemma 7B", contextLength: 8192, costPer1kTokens: 0 },
      { id: "whisper-large-v3", name: "Whisper Large v3", contextLength: 448, costPer1kTokens: 0 },
      { id: "whisper-large-v3-turbo", name: "Whisper Large v3 Turbo", contextLength: 448, costPer1kTokens: 0 },
    ],
  },
  {
    id: "google",
    name: "Google AI",
    type: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: [
      { id: "gemini-2.5-pro-preview-05-06", name: "Gemini 2.5 Pro", contextLength: 1048576, costPer1kTokens: 0.00125 },
      { id: "gemini-2.5-flash-preview-05-20", name: "Gemini 2.5 Flash", contextLength: 1048576, costPer1kTokens: 0 },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextLength: 1048576, costPer1kTokens: 0 },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", contextLength: 1048576, costPer1kTokens: 0 },
      { id: "gemini-2.0-flash-thinking-exp", name: "Gemini 2.0 Flash Thinking", contextLength: 1048576, costPer1kTokens: 0 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextLength: 2097152, costPer1kTokens: 0.00125 },
      { id: "gemini-1.5-pro-latest", name: "Gemini 1.5 Pro Latest", contextLength: 2097152, costPer1kTokens: 0.00125 },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextLength: 1048576, costPer1kTokens: 0.000075 },
      { id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash Latest", contextLength: 1048576, costPer1kTokens: 0.000075 },
      { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", contextLength: 1048576, costPer1kTokens: 0 },
      { id: "gemini-1.0-pro", name: "Gemini 1.0 Pro", contextLength: 32768, costPer1kTokens: 0.0005 },
      { id: "gemini-1.0-pro-vision", name: "Gemini 1.0 Pro Vision", contextLength: 16384, costPer1kTokens: 0.0005 },
      { id: "text-embedding-004", name: "Text Embedding 004", contextLength: 2048, costPer1kTokens: 0 },
      { id: "embedding-001", name: "Embedding 001", contextLength: 2048, costPer1kTokens: 0 },
      { id: "aqa", name: "AQA (Attributed QA)", contextLength: 7168, costPer1kTokens: 0 },
    ],
  },
  {
    id: "xai",
    name: "xAI",
    type: "xai",
    baseUrl: "https://api.x.ai/v1",
    models: [
      { id: "grok-3", name: "Grok 3 (Recommended)", contextLength: 131072, costPer1kTokens: 0.003 },
      { id: "grok-3-latest", name: "Grok 3 Latest", contextLength: 131072, costPer1kTokens: 0.003 },
      { id: "grok-3-mini-beta", name: "Grok 3 Mini Beta", contextLength: 131072, costPer1kTokens: 0.0003 },
      { id: "grok-4", name: "Grok 4", contextLength: 256000, costPer1kTokens: 0.003 },
      { id: "grok-4-latest", name: "Grok 4 Latest", contextLength: 256000, costPer1kTokens: 0.003 },
      { id: "grok-4-1-fast-reasoning", name: "Grok 4.1 Fast Reasoning", contextLength: 2000000, costPer1kTokens: 0.003 },
      { id: "grok-4-1-fast-non-reasoning", name: "Grok 4.1 Fast Non-Reasoning", contextLength: 2000000, costPer1kTokens: 0.003 },
      { id: "grok-4-fast-reasoning", name: "Grok 4 Fast Reasoning", contextLength: 2000000, costPer1kTokens: 0.003 },
      { id: "grok-4-fast-non-reasoning", name: "Grok 4 Fast Non-Reasoning", contextLength: 2000000, costPer1kTokens: 0.003 },
      { id: "grok-code-fast-1", name: "Grok Code Fast 1", contextLength: 256000, costPer1kTokens: 0.003 },
      { id: "grok-2-latest", name: "Grok 2 Latest", contextLength: 131072, costPer1kTokens: 0.002 },
      { id: "grok-2-image-1212", name: "Grok 2 Image", contextLength: 32768, costPer1kTokens: 0.002 },
      { id: "grok-beta", name: "Grok Beta", contextLength: 131072, costPer1kTokens: 0.005 },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    type: "ollama",
    baseUrl: "http://localhost:11434",
    models: [
      { id: "llama3.3", name: "Llama 3.3 70B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama3.2", name: "Llama 3.2", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama3.2:1b", name: "Llama 3.2 1B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama3.2-vision", name: "Llama 3.2 Vision", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama3.1", name: "Llama 3.1 8B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "llama3.1:70b", name: "Llama 3.1 70B", contextLength: 131072, costPer1kTokens: 0 },
      { id: "qwen2.5", name: "Qwen 2.5", contextLength: 131072, costPer1kTokens: 0 },
      { id: "qwen2.5-coder", name: "Qwen 2.5 Coder", contextLength: 131072, costPer1kTokens: 0 },
      { id: "deepseek-r1", name: "DeepSeek R1", contextLength: 131072, costPer1kTokens: 0 },
      { id: "deepseek-coder-v2", name: "DeepSeek Coder V2", contextLength: 131072, costPer1kTokens: 0 },
      { id: "mistral", name: "Mistral 7B", contextLength: 32768, costPer1kTokens: 0 },
      { id: "mixtral", name: "Mixtral 8x7B", contextLength: 32768, costPer1kTokens: 0 },
      { id: "codellama", name: "Code Llama", contextLength: 16384, costPer1kTokens: 0 },
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
