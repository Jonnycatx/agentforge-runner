import type { ModelProvider, AgentConfig, ChatMessage } from "@shared/schema";

interface InferenceMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface InferenceOptions {
  provider: ModelProvider;
  model: string;
  messages: InferenceMessage[];
  temperature?: number;
  maxTokens?: number;
  onStream?: (chunk: string) => void;
}

interface InferenceResult {
  content: string;
  success: boolean;
  error?: string;
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    if (!response.ok) return [];
    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch {
    return [];
  }
}

function getProviderEndpoint(provider: ModelProvider, defaultEndpoint: string): string {
  if (provider.baseUrl) {
    return provider.baseUrl;
  }
  return defaultEndpoint;
}

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: InferenceMessage[],
  temperature: number,
  maxTokens: number
): Promise<InferenceResult> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { content: "", success: false, error: `API error: ${error}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content, success: true };
  } catch (error) {
    return { 
      content: "", 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: InferenceMessage[],
  temperature: number,
  maxTokens: number
): Promise<InferenceResult> {
  try {
    const systemMessage = messages.find(m => m.role === "system");
    const chatMessages = messages.filter(m => m.role !== "system");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMessage?.content || "",
        messages: chatMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { content: "", success: false, error: `API error: ${error}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    return { content, success: true };
  } catch (error) {
    return { 
      content: "", 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

async function callOllama(
  model: string,
  messages: InferenceMessage[],
  temperature: number,
  endpoint: string = "http://localhost:11434/api/chat"
): Promise<InferenceResult> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { content: "", success: false, error: `Ollama error: ${error}` };
    }

    const data = await response.json();
    const content = data.message?.content || "";
    return { content, success: true };
  } catch (error) {
    return { 
      content: "", 
      success: false, 
      error: error instanceof Error ? error.message : "Connection failed. Is Ollama running?" 
    };
  }
}

async function callGoogle(
  apiKey: string,
  model: string,
  messages: InferenceMessage[],
  temperature: number,
  maxTokens: number,
  baseUrl?: string
): Promise<InferenceResult> {
  try {
    const systemMessage = messages.find(m => m.role === "system");
    const chatMessages = messages.filter(m => m.role !== "system");

    const contents = chatMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    let endpoint: string;
    if (baseUrl) {
      const cleanBase = baseUrl.replace(/\/+$/, "");
      if (cleanBase.includes(":generateContent")) {
        endpoint = `${cleanBase}?key=${apiKey}`;
      } else if (cleanBase.includes("/models/")) {
        endpoint = `${cleanBase}:generateContent?key=${apiKey}`;
      } else if (cleanBase.includes("/models")) {
        endpoint = `${cleanBase}/${model}:generateContent?key=${apiKey}`;
      } else {
        endpoint = `${cleanBase}/models/${model}:generateContent?key=${apiKey}`;
      }
    } else {
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    }

    const response = await fetch(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { content: "", success: false, error: `Google API error: ${error}` };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { content, success: true };
  } catch (error) {
    return { 
      content: "", 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function runInference(options: InferenceOptions): Promise<InferenceResult> {
  const { provider, model, messages, temperature = 0.7, maxTokens = 4096 } = options;

  if (!provider.isConnected && provider.type !== "ollama") {
    return { content: "", success: false, error: "Provider not connected" };
  }

  const defaultEndpoints: Record<string, string> = {
    openai: "https://api.openai.com/v1/chat/completions",
    groq: "https://api.groq.com/openai/v1/chat/completions",
    xai: "https://api.x.ai/v1/chat/completions",
  };

  switch (provider.type) {
    case "openai":
    case "groq":
    case "xai":
      return callOpenAICompatible(
        getProviderEndpoint(provider, defaultEndpoints[provider.type]),
        provider.apiKey || "",
        model,
        messages,
        temperature,
        maxTokens
      );

    case "anthropic":
      return callAnthropic(
        provider.apiKey || "",
        model,
        messages,
        temperature,
        maxTokens
      );

    case "ollama":
      return callOllama(
        model, 
        messages, 
        temperature,
        provider.baseUrl || "http://localhost:11434/api/chat"
      );

    case "google":
      return callGoogle(
        provider.apiKey || "",
        model,
        messages,
        temperature,
        maxTokens,
        provider.baseUrl
      );

    default:
      if (provider.baseUrl) {
        return callOpenAICompatible(
          provider.baseUrl,
          provider.apiKey || "",
          model,
          messages,
          temperature,
          maxTokens
        );
      }
      return { content: "", success: false, error: "Unknown provider type" };
  }
}

export function buildSystemPrompt(agent: Partial<AgentConfig>): string {
  const parts: string[] = [];

  if (agent.systemPrompt) {
    parts.push(agent.systemPrompt);
  } else {
    parts.push(`You are ${agent.name || "an AI assistant"}.`);
    
    if (agent.goal) {
      parts.push(`Your primary goal is: ${agent.goal}`);
    }
    
    if (agent.personality) {
      parts.push(`Your communication style is: ${agent.personality}`);
    }
    
    if (agent.tools && agent.tools.length > 0) {
      parts.push(`You have access to these capabilities: ${agent.tools.join(", ")}`);
    }
  }

  return parts.join("\n\n");
}

export function convertChatHistory(
  messages: ChatMessage[],
  systemPrompt: string
): InferenceMessage[] {
  const result: InferenceMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of messages) {
    result.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  }

  return result;
}
