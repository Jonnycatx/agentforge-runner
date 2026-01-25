/**
 * Tool Recommendation Engine
 * Intelligently recommends tools based on intent, industry, and tasks
 */

import { toolRegistry } from "@shared/schema";
import type { IntentClassification } from "./intent-classifier";
import type { IndustryDetection, Industry } from "./industry-detector";
import type { TaskDecomposition } from "./task-decomposer";

// Tool recommendation
export interface ToolRecommendation {
  toolId: string;
  name: string;
  category: string;
  score: number;
  reasons: string[];
  isEssential: boolean;
  isNiceToHave: boolean;
  authRequired: boolean;
}

// Full recommendation result
export interface RecommendationResult {
  essential: ToolRecommendation[];
  recommended: ToolRecommendation[];
  optional: ToolRecommendation[];
  bundles: ToolBundle[];
  minimumViableToolkit: string[];
  explanation: string;
  warnings: string[];
}

// Pre-defined tool bundles
export interface ToolBundle {
  id: string;
  name: string;
  description: string;
  tools: string[];
  category: string;
  useCases: string[];
}

// Tool compatibility matrix - which tools work well together
const toolCompatibility: Record<string, string[]> = {
  web_search: ["web_scrape", "pdf_generator", "file_write", "news_search"],
  web_scrape: ["web_search", "data_transform", "csv_write", "file_write"],
  email_read: ["email_send", "email_categorize", "email_draft", "calendar_events"],
  email_send: ["email_read", "email_draft", "pdf_generator", "file_read"],
  csv_read: ["csv_write", "data_transform", "excel_write", "calculator"],
  data_transform: ["csv_read", "csv_write", "excel_read", "excel_write", "calculator"],
  pdf_read: ["file_write", "data_transform", "image_ocr"],
  market_data: ["calculator", "csv_write", "excel_write", "news_search"],
  calendar_events: ["email_send", "email_read"],
  company_search: ["web_search", "email_send", "pdf_generator"],
};

// Pre-defined bundles
export const toolBundles: ToolBundle[] = [
  {
    id: "research-bundle",
    name: "Research Powerhouse",
    description: "Everything you need for deep research and reporting",
    tools: ["web_search", "web_scrape", "news_search", "pdf_read", "file_write"],
    category: "research",
    useCases: ["Market research", "Competitive analysis", "News monitoring"],
  },
  {
    id: "email-bundle",
    name: "Email Master",
    description: "Complete email management and automation",
    tools: ["email_read", "email_send", "email_categorize", "email_draft", "email_unsubscribe"],
    category: "email",
    useCases: ["Inbox zero", "Email campaigns", "Customer communication"],
  },
  {
    id: "data-bundle",
    name: "Data Wizard",
    description: "Process, transform, and analyze any data",
    tools: ["csv_read", "csv_write", "excel_read", "excel_write", "data_transform", "calculator"],
    category: "data",
    useCases: ["Data cleaning", "Report generation", "Analytics"],
  },
  {
    id: "sales-bundle",
    name: "Sales Accelerator",
    description: "Tools for prospecting and outreach",
    tools: ["company_search", "web_search", "email_send", "email_draft", "pdf_generator"],
    category: "sales",
    useCases: ["Lead research", "Cold outreach", "Proposal creation"],
  },
  {
    id: "finance-bundle",
    name: "Finance Toolkit",
    description: "Financial analysis and tracking",
    tools: ["market_data", "calculator", "excel_read", "excel_write", "csv_tools", "pdf_read"],
    category: "finance",
    useCases: ["Portfolio tracking", "Financial reporting", "Invoice processing"],
  },
  {
    id: "content-bundle",
    name: "Content Creator",
    description: "Create and publish content",
    tools: ["web_search", "file_write", "pdf_generator", "web_screenshot"],
    category: "content",
    useCases: ["Blog writing", "Report creation", "Documentation"],
  },
  {
    id: "automation-bundle",
    name: "Automation Suite",
    description: "Automate browser and web tasks",
    tools: ["browser_automation", "web_scrape", "web_screenshot", "http_request"],
    category: "automation",
    useCases: ["Form filling", "Data extraction", "Web monitoring"],
  },
  {
    id: "legal-bundle",
    name: "Legal Assistant",
    description: "Document review and analysis",
    tools: ["pdf_read", "file_read", "file_write", "web_search"],
    category: "legal",
    useCases: ["Contract review", "Document analysis", "Research"],
  },
];

/**
 * Main recommendation function
 */
export function recommendTools(
  intent?: IntentClassification,
  industry?: IndustryDetection,
  tasks?: TaskDecomposition
): RecommendationResult {
  const scores: Record<string, { score: number; reasons: string[] }> = {};
  const warnings: string[] = [];
  
  // Initialize scores for all tools
  for (const tool of toolRegistry) {
    scores[tool.id] = { score: 0, reasons: [] };
  }
  
  // Score based on intent
  if (intent) {
    for (const category of intent.suggestedToolCategories) {
      const categoryTools = toolRegistry.filter(t => t.category === category);
      for (const tool of categoryTools) {
        scores[tool.id].score += 3;
        scores[tool.id].reasons.push(`Matches ${intent.primary} intent`);
      }
    }
  }
  
  // Score based on industry
  if (industry) {
    for (const toolId of industry.recommended_tools) {
      if (scores[toolId]) {
        scores[toolId].score += 4;
        scores[toolId].reasons.push(`Recommended for ${industry.primary} industry`);
      }
    }
  }
  
  // Score based on task decomposition
  if (tasks) {
    for (const toolId of tasks.requiredTools) {
      if (scores[toolId]) {
        scores[toolId].score += 5;
        scores[toolId].reasons.push("Required for task execution");
      }
    }
    for (const toolId of tasks.optionalTools) {
      if (scores[toolId]) {
        scores[toolId].score += 2;
        scores[toolId].reasons.push("Useful for task");
      }
    }
  }
  
  // Add compatibility bonuses
  const highScoreTools = Object.entries(scores)
    .filter(([_, data]) => data.score >= 3)
    .map(([id]) => id);
    
  for (const toolId of highScoreTools) {
    const compatible = toolCompatibility[toolId] || [];
    for (const compatibleTool of compatible) {
      if (scores[compatibleTool]) {
        scores[compatibleTool].score += 1;
        scores[compatibleTool].reasons.push(`Works well with ${toolId}`);
      }
    }
  }
  
  // Build recommendations
  const allRecommendations: ToolRecommendation[] = Object.entries(scores)
    .filter(([_, data]) => data.score > 0)
    .map(([toolId, data]) => {
      const tool = toolRegistry.find(t => t.id === toolId)!;
      return {
        toolId,
        name: tool.name,
        category: tool.category,
        score: data.score,
        reasons: [...new Set(data.reasons)],
        isEssential: data.score >= 5,
        isNiceToHave: data.score >= 2 && data.score < 5,
        authRequired: tool.authType !== "none",
      };
    })
    .sort((a, b) => b.score - a.score);
  
  // Categorize recommendations
  const essential = allRecommendations.filter(r => r.isEssential);
  const recommended = allRecommendations.filter(r => !r.isEssential && r.score >= 3);
  const optional = allRecommendations.filter(r => r.score >= 1 && r.score < 3);
  
  // Find matching bundles
  const matchingBundles = findMatchingBundles(
    allRecommendations.map(r => r.toolId),
    intent?.primary,
    industry?.primary
  );
  
  // Calculate minimum viable toolkit
  const minimumViable = calculateMinimumViableToolkit(essential, tasks);
  
  // Generate explanation
  const explanation = generateExplanation(essential, recommended, intent, industry);
  
  // Add warnings
  if (essential.some(t => t.authRequired)) {
    warnings.push("Some essential tools require authentication setup");
  }
  if (tasks && tasks.totalComplexity === "expert") {
    warnings.push("This is a complex task that may require multiple tool integrations");
  }
  
  return {
    essential,
    recommended,
    optional,
    bundles: matchingBundles,
    minimumViableToolkit: minimumViable,
    explanation,
    warnings,
  };
}

/**
 * Find bundles that match the recommended tools
 */
function findMatchingBundles(
  recommendedToolIds: string[],
  intent?: string,
  industry?: Industry
): ToolBundle[] {
  return toolBundles
    .map(bundle => {
      const overlap = bundle.tools.filter(t => recommendedToolIds.includes(t));
      const overlapScore = overlap.length / bundle.tools.length;
      return { bundle, overlapScore };
    })
    .filter(({ overlapScore }) => overlapScore >= 0.3)
    .sort((a, b) => b.overlapScore - a.overlapScore)
    .slice(0, 3)
    .map(({ bundle }) => bundle);
}

/**
 * Calculate the minimum set of tools needed
 */
function calculateMinimumViableToolkit(
  essential: ToolRecommendation[],
  tasks?: TaskDecomposition
): string[] {
  const minimum = new Set<string>();
  
  // Add all essential tools
  for (const tool of essential) {
    minimum.add(tool.toolId);
  }
  
  // If tasks specified, ensure we have tools for each step
  if (tasks) {
    for (const step of tasks.steps) {
      if (step.toolId) {
        minimum.add(step.toolId);
      }
    }
  }
  
  // Ensure at least basic capability
  if (minimum.size === 0) {
    minimum.add("web_search");
  }
  
  return Array.from(minimum);
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(
  essential: ToolRecommendation[],
  recommended: ToolRecommendation[],
  intent?: IntentClassification,
  industry?: IndustryDetection
): string {
  const parts: string[] = [];
  
  if (intent) {
    parts.push(`Based on your ${intent.primary.replace(/_/g, " ")} goals`);
  }
  
  if (industry) {
    parts.push(`and ${industry.primary.replace(/_/g, " ")} industry context`);
  }
  
  if (essential.length > 0) {
    const essentialNames = essential.slice(0, 3).map(t => t.name);
    parts.push(`you'll need ${essentialNames.join(", ")}`);
  }
  
  if (recommended.length > 0) {
    const recNames = recommended.slice(0, 2).map(t => t.name);
    parts.push(`and may benefit from ${recNames.join(" and ")}`);
  }
  
  return parts.join(", ") + ".";
}

/**
 * Get tool by ID from registry
 */
export function getToolDetails(toolId: string) {
  return toolRegistry.find(t => t.id === toolId);
}

/**
 * Check tool compatibility
 */
export function areToolsCompatible(tool1: string, tool2: string): boolean {
  const compatible1 = toolCompatibility[tool1] || [];
  const compatible2 = toolCompatibility[tool2] || [];
  return compatible1.includes(tool2) || compatible2.includes(tool1);
}

/**
 * Suggest complementary tools
 */
export function suggestComplementaryTools(existingTools: string[]): string[] {
  const suggestions = new Set<string>();
  
  for (const toolId of existingTools) {
    const compatible = toolCompatibility[toolId] || [];
    for (const comp of compatible) {
      if (!existingTools.includes(comp)) {
        suggestions.add(comp);
      }
    }
  }
  
  return Array.from(suggestions);
}
