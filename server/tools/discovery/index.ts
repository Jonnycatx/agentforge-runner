/**
 * Smart Tool Discovery System
 * Entry point for all discovery functionality
 */

// Intent Classification
export {
  classifyIntent,
  detectMultipleIntents,
  generateClassificationPrompt,
  intentCategories,
  intentDefinitions,
  type IntentCategory,
  type IntentClassification,
  type MultiIntentResult,
} from "./intent-classifier";

// Industry Detection
export {
  detectIndustry,
  getIndustryToolPack,
  generateIndustryPrompt,
  industries,
  industryDefinitions,
  type Industry,
  type IndustryDetection,
} from "./industry-detector";

// Task Decomposition
export {
  decomposeTask,
  generateDecompositionPrompt,
  type TaskStep,
  type TaskDecomposition,
} from "./task-decomposer";

// Tool Recommendation
export {
  recommendTools,
  getToolDetails,
  areToolsCompatible,
  suggestComplementaryTools,
  toolBundles,
  type ToolRecommendation,
  type RecommendationResult,
  type ToolBundle,
} from "./tool-recommender";

// Conversation Builder
export {
  initializeConversation,
  processUserInput,
  getQuickSuggestions,
  type ConversationState,
  type ConversationContext,
  type ConversationMessage,
  type ConversationResponse,
  type ConversationAction,
} from "./conversation-builder";

/**
 * High-level discovery function - analyzes user input and returns full recommendations
 */
export function analyzeUserRequest(userInput: string, additionalContext?: string) {
  const { classifyIntent } = require("./intent-classifier");
  const { detectIndustry } = require("./industry-detector");
  const { decomposeTask } = require("./task-decomposer");
  const { recommendTools } = require("./tool-recommender");
  
  // Classify intent
  const intent = classifyIntent(userInput);
  
  // Detect industry
  const industry = detectIndustry(userInput, additionalContext);
  
  // Decompose tasks
  const tasks = decomposeTask(userInput, intent.primary);
  
  // Get recommendations
  const recommendations = recommendTools(intent, industry, tasks);
  
  return {
    intent,
    industry,
    tasks,
    recommendations,
    summary: generateSummary(intent, industry, tasks, recommendations),
  };
}

/**
 * Generate a human-readable summary
 */
function generateSummary(
  intent: any,
  industry: any,
  tasks: any,
  recommendations: any
): string {
  const parts: string[] = [];
  
  // Intent summary
  parts.push(`**Intent:** ${intent.primary.replace(/_/g, " ")} (${Math.round(intent.confidence * 100)}% confidence)`);
  
  // Industry
  if (industry.confidence > 0.3) {
    parts.push(`**Industry:** ${industry.primary.replace(/_/g, " ")}`);
  }
  
  // Task complexity
  parts.push(`**Complexity:** ${tasks.totalComplexity} (${tasks.steps.length} steps)`);
  
  // Recommended tools
  const essentialTools = recommendations.essential.slice(0, 5).map((t: any) => t.name);
  parts.push(`**Essential Tools:** ${essentialTools.join(", ")}`);
  
  // Warnings
  if (recommendations.warnings.length > 0) {
    parts.push(`**Notes:** ${recommendations.warnings.join("; ")}`);
  }
  
  return parts.join("\n");
}
