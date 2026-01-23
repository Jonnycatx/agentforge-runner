import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentConfig, ModelProvider, ChatMessage, BuilderState } from "@shared/schema";
import { defaultProviders } from "@shared/schema";

interface AgentStore {
  // Model providers
  providers: ModelProvider[];
  selectedProviderId: string | null;
  selectedModelId: string | null;
  addProvider: (provider: ModelProvider) => void;
  updateProvider: (id: string, updates: Partial<ModelProvider>) => void;
  removeProvider: (id: string) => void;
  selectProvider: (id: string | null) => void;
  selectModel: (id: string | null) => void;

  // Agents
  agents: AgentConfig[];
  currentAgent: Partial<AgentConfig> | null;
  addAgent: (agent: AgentConfig) => void;
  updateAgent: (id: string, updates: Partial<AgentConfig>) => void;
  removeAgent: (id: string) => void;
  setCurrentAgent: (agent: Partial<AgentConfig> | null) => void;

  // Builder state
  builderState: BuilderState;
  addBuilderMessage: (message: ChatMessage) => void;
  setBuilderStep: (step: BuilderState["step"]) => void;
  resetBuilder: () => void;
  updateBuilderAgent: (updates: Partial<AgentConfig>) => void;
}

const initialBuilderState: BuilderState = {
  messages: [],
  currentAgent: undefined,
  step: "greeting",
};

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      // Initialize providers with defaults (no API keys)
      providers: defaultProviders.map((p) => ({
        ...p,
        apiKey: undefined,
        isConnected: false,
      })),
      selectedProviderId: null,
      selectedModelId: null,

      addProvider: (provider) =>
        set((state) => ({
          providers: [...state.providers, provider],
        })),

      updateProvider: (id, updates) =>
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      removeProvider: (id) =>
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
        })),

      selectProvider: (id) => set({ selectedProviderId: id }),
      selectModel: (id) => set({ selectedModelId: id }),

      // Agents
      agents: [],
      currentAgent: null,

      addAgent: (agent) =>
        set((state) => ({
          agents: [...state.agents, agent],
        })),

      updateAgent: (id, updates) =>
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      removeAgent: (id) =>
        set((state) => ({
          agents: state.agents.filter((a) => a.id !== id),
        })),

      setCurrentAgent: (agent) => set({ currentAgent: agent }),

      // Builder state
      builderState: initialBuilderState,

      addBuilderMessage: (message) =>
        set((state) => ({
          builderState: {
            ...state.builderState,
            messages: [...state.builderState.messages, message],
          },
        })),

      setBuilderStep: (step) =>
        set((state) => ({
          builderState: {
            ...state.builderState,
            step,
          },
        })),

      resetBuilder: () =>
        set({
          builderState: initialBuilderState,
          currentAgent: null,
        }),

      updateBuilderAgent: (updates) =>
        set((state) => ({
          builderState: {
            ...state.builderState,
            currentAgent: {
              ...state.builderState.currentAgent,
              ...updates,
            },
          },
        })),
    }),
    {
      name: "agentforge-storage",
      partialize: (state) => ({
        providers: state.providers,
        agents: state.agents,
        selectedProviderId: state.selectedProviderId,
        selectedModelId: state.selectedModelId,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AgentStore>;
        // Old default URLs that should be cleared (backend has these hardcoded)
        const oldDefaultUrls = [
          "https://api.openai.com/v1",
          "https://api.anthropic.com/v1",
          "https://api.groq.com/openai/v1",
          "https://generativelanguage.googleapis.com/v1beta",
          "https://api.x.ai/v1",
        ];
        // Merge providers: use default models but preserve user's API keys and connection status
        const mergedProviders = defaultProviders.map((defaultProvider) => {
          const cached = persisted.providers?.find((p) => p.id === defaultProvider.id);
          // Clear baseUrl if it was an old default (not user-entered custom URL)
          const cachedBaseUrl = cached?.baseUrl;
          const shouldClearBaseUrl = cachedBaseUrl && oldDefaultUrls.includes(cachedBaseUrl);
          return {
            ...defaultProvider,
            apiKey: cached?.apiKey,
            baseUrl: shouldClearBaseUrl ? undefined : cachedBaseUrl,
            isConnected: cached?.isConnected || false,
            // Always use latest models from defaults
            models: defaultProvider.models,
          };
        });
        return {
          ...currentState,
          ...persisted,
          providers: mergedProviders,
        };
      },
    }
  )
);
