const BACKEND_URL = "http://127.0.0.1:8765";

export interface AgentConfig {
  name: string;
  goal: string;
  personality: string;
  avatar: string;
  provider: string;
  model: string;
  apiKey: string;
  temperature: number;
}

export interface ChatResponse {
  response: string;
}

export interface HealthResponse {
  status: string;
  agent_loaded: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  async health(): Promise<HealthResponse> {
    const res = await fetch(`${this.baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error("Backend not available");
    return res.json();
  }

  async loadConfig(configPath: string): Promise<AgentConfig> {
    const res = await fetch(`${this.baseUrl}/load-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: configPath }),
    });
    if (!res.ok) throw new Error("Failed to load config");
    return res.json();
  }

  async getConfig(): Promise<AgentConfig | null> {
    const res = await fetch(`${this.baseUrl}/config`, {
      method: "GET",
    });
    if (!res.ok) return null;
    return res.json();
  }

  async chat(content: string): Promise<ChatResponse> {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  }

  async setProvider(provider: string, apiKey?: string, model?: string): Promise<void> {
    await fetch(`${this.baseUrl}/config/provider`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, api_key: apiKey, model }),
    });
  }

  async waitForBackend(maxRetries: number = 10): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.health();
        return true;
      } catch {
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
    return false;
  }
}

export const api = new ApiClient();
