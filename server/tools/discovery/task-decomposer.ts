/**
 * Task Decomposition Engine
 * Breaks down complex user requests into executable steps
 */

import type { IntentCategory } from "./intent-classifier";

// Task step definition
export interface TaskStep {
  id: string;
  order: number;
  action: string;
  description: string;
  toolId: string | null;
  toolCategory: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[]; // IDs of steps this depends on
  canParallelize: boolean;
  estimatedComplexity: "trivial" | "simple" | "moderate" | "complex";
}

// Task decomposition result
export interface TaskDecomposition {
  originalRequest: string;
  summary: string;
  steps: TaskStep[];
  executionOrder: string[][]; // Groups of step IDs that can run in parallel
  totalComplexity: "simple" | "moderate" | "complex" | "expert";
  requiredTools: string[];
  optionalTools: string[];
  warnings: string[];
}

// Common action patterns and their tool mappings
const actionPatterns: {
  pattern: RegExp;
  action: string;
  toolId: string;
  toolCategory: string;
  complexity: TaskStep["estimatedComplexity"];
}[] = [
  // Web/Search actions
  { pattern: /search (?:for|the web|online|internet)/i, action: "web_search", toolId: "web_search", toolCategory: "web", complexity: "simple" },
  { pattern: /(?:google|look up|find online)/i, action: "web_search", toolId: "web_search", toolCategory: "web", complexity: "simple" },
  { pattern: /scrape|extract (?:from|data)/i, action: "web_scrape", toolId: "web_scrape", toolCategory: "web", complexity: "moderate" },
  { pattern: /screenshot|capture (?:page|website)/i, action: "web_screenshot", toolId: "web_screenshot", toolCategory: "web", complexity: "simple" },
  { pattern: /fill (?:out|in) (?:form|fields)|submit form/i, action: "browser_automation", toolId: "browser_automation", toolCategory: "web", complexity: "complex" },
  
  // Email actions
  { pattern: /(?:read|check|get) (?:my )?emails?/i, action: "email_read", toolId: "email_read", toolCategory: "email", complexity: "simple" },
  { pattern: /(?:send|write|compose) (?:an? )?emails?/i, action: "email_send", toolId: "email_send", toolCategory: "email", complexity: "moderate" },
  { pattern: /(?:categorize|organize|sort) (?:my )?emails?/i, action: "email_categorize", toolId: "email_categorize", toolCategory: "email", complexity: "moderate" },
  { pattern: /draft (?:a )?(?:reply|response|email)/i, action: "email_draft", toolId: "email_draft", toolCategory: "email", complexity: "moderate" },
  { pattern: /unsubscribe/i, action: "email_unsubscribe", toolId: "email_unsubscribe", toolCategory: "email", complexity: "simple" },
  
  // Data actions
  { pattern: /(?:read|open|load|import) (?:a )?csv/i, action: "csv_read", toolId: "csv_read", toolCategory: "data", complexity: "trivial" },
  { pattern: /(?:write|create|export|save) (?:to )?csv/i, action: "csv_write", toolId: "csv_write", toolCategory: "data", complexity: "simple" },
  { pattern: /(?:read|open|load) (?:an? )?excel/i, action: "excel_read", toolId: "excel_read", toolCategory: "data", complexity: "trivial" },
  { pattern: /(?:write|create|export) (?:to )?excel/i, action: "excel_write", toolId: "excel_write", toolCategory: "data", complexity: "simple" },
  { pattern: /(?:transform|clean|filter|sort|group|aggregate) (?:the )?data/i, action: "data_transform", toolId: "data_transform", toolCategory: "data", complexity: "moderate" },
  
  // File actions
  { pattern: /(?:read|open|load) (?:a )?file/i, action: "file_read", toolId: "file_read", toolCategory: "files", complexity: "trivial" },
  { pattern: /(?:write|create|save) (?:a )?file/i, action: "file_write", toolId: "file_write", toolCategory: "files", complexity: "simple" },
  { pattern: /(?:search|find) files?/i, action: "file_search", toolId: "file_search", toolCategory: "files", complexity: "simple" },
  { pattern: /(?:read|extract|parse) (?:a )?pdf/i, action: "pdf_read", toolId: "pdf_read", toolCategory: "files", complexity: "simple" },
  { pattern: /(?:generate|create|make) (?:a )?pdf/i, action: "pdf_generator", toolId: "pdf_generator", toolCategory: "files", complexity: "moderate" },
  { pattern: /(?:ocr|extract text from image)/i, action: "image_ocr", toolId: "image_ocr", toolCategory: "files", complexity: "moderate" },
  
  // Research actions
  { pattern: /(?:search|find) news/i, action: "news_search", toolId: "news_search", toolCategory: "search", complexity: "simple" },
  { pattern: /(?:research|look up) compan(?:y|ies)/i, action: "company_search", toolId: "company_search", toolCategory: "search", complexity: "moderate" },
  
  // Finance actions
  { pattern: /(?:get|check|fetch) (?:stock|market|price)/i, action: "market_data", toolId: "market_data", toolCategory: "finance", complexity: "simple" },
  { pattern: /calculate|compute|math/i, action: "calculator", toolId: "calculator", toolCategory: "finance", complexity: "trivial" },
  
  // Calendar actions
  { pattern: /(?:schedule|create|add) (?:a )?(?:meeting|event|appointment)/i, action: "calendar_events", toolId: "calendar_events", toolCategory: "calendar", complexity: "simple" },
  { pattern: /(?:check|view|list) (?:my )?calendar/i, action: "calendar_events", toolId: "calendar_events", toolCategory: "calendar", complexity: "simple" },
  
  // Code actions
  { pattern: /(?:run|execute) (?:code|script)/i, action: "code_execute", toolId: "code_execute", toolCategory: "dev", complexity: "moderate" },
  { pattern: /(?:make|call) (?:an? )?(?:api|http) (?:request|call)/i, action: "http_request", toolId: "http_request", toolCategory: "dev", complexity: "moderate" },
];

/**
 * Decompose a user request into executable steps
 */
export function decomposeTask(
  userRequest: string,
  primaryIntent?: IntentCategory
): TaskDecomposition {
  const steps: TaskStep[] = [];
  const requiredTools = new Set<string>();
  const optionalTools = new Set<string>();
  const warnings: string[] = [];
  
  // Normalize input
  const input = userRequest.toLowerCase();
  
  // Split into potential sub-tasks
  const subTasks = splitIntoSubTasks(userRequest);
  
  let stepOrder = 1;
  let previousStepId: string | null = null;
  
  for (const subTask of subTasks) {
    // Match against action patterns
    const matchedActions = findMatchingActions(subTask);
    
    if (matchedActions.length === 0) {
      // Try to infer from context
      const inferredAction = inferAction(subTask, primaryIntent);
      if (inferredAction) {
        matchedActions.push(inferredAction);
      }
    }
    
    for (const action of matchedActions) {
      const stepId = `step_${stepOrder}`;
      
      // Determine dependencies
      const dependencies: string[] = [];
      if (previousStepId && !action.canParallelize) {
        dependencies.push(previousStepId);
      }
      
      // Analyze inputs and outputs
      const { inputs, outputs } = analyzeDataFlow(subTask, action.action);
      
      steps.push({
        id: stepId,
        order: stepOrder,
        action: action.action,
        description: subTask.trim(),
        toolId: action.toolId,
        toolCategory: action.toolCategory,
        inputs,
        outputs,
        dependencies,
        canParallelize: action.canParallelize || false,
        estimatedComplexity: action.complexity,
      });
      
      if (action.toolId) {
        requiredTools.add(action.toolId);
      }
      
      previousStepId = stepId;
      stepOrder++;
    }
  }
  
  // If no steps found, create a generic research step
  if (steps.length === 0) {
    steps.push({
      id: "step_1",
      order: 1,
      action: "research",
      description: userRequest,
      toolId: "web_search",
      toolCategory: "web",
      inputs: [userRequest],
      outputs: ["research_results"],
      dependencies: [],
      canParallelize: false,
      estimatedComplexity: "simple",
    });
    requiredTools.add("web_search");
  }
  
  // Build execution order (group parallelizable steps)
  const executionOrder = buildExecutionOrder(steps);
  
  // Calculate total complexity
  const totalComplexity = calculateTotalComplexity(steps);
  
  // Add optional tools based on context
  if (input.includes("report") || input.includes("document")) {
    optionalTools.add("pdf_generator");
    optionalTools.add("file_write");
  }
  if (input.includes("schedule") || input.includes("meeting")) {
    optionalTools.add("calendar_events");
  }
  
  return {
    originalRequest: userRequest,
    summary: generateSummary(steps),
    steps,
    executionOrder,
    totalComplexity,
    requiredTools: Array.from(requiredTools),
    optionalTools: Array.from(optionalTools),
    warnings,
  };
}

/**
 * Split user request into sub-tasks
 */
function splitIntoSubTasks(request: string): string[] {
  // Split by common task separators
  const separators = /(?:,\s*(?:then|and then|after that|next))|(?:\.\s*(?:then|also|and))|(?:\s+then\s+)|(?:\s+and\s+then\s+)|(?:;\s*)/gi;
  
  let parts = request.split(separators).map(s => s.trim()).filter(s => s.length > 0);
  
  // If no splits, check for implicit multiple tasks
  if (parts.length === 1) {
    // Check for "and" connections that indicate parallel tasks
    const andSplit = request.split(/\s+and\s+/gi);
    if (andSplit.length > 1 && andSplit.every(p => p.length > 10)) {
      parts = andSplit.map(s => s.trim());
    }
  }
  
  return parts.length > 0 ? parts : [request];
}

/**
 * Find matching actions for a sub-task
 */
function findMatchingActions(subTask: string): {
  action: string;
  toolId: string;
  toolCategory: string;
  complexity: TaskStep["estimatedComplexity"];
  canParallelize?: boolean;
}[] {
  const matches: typeof actionPatterns = [];
  
  for (const pattern of actionPatterns) {
    if (pattern.pattern.test(subTask)) {
      matches.push(pattern);
    }
  }
  
  return matches.map(m => ({
    action: m.action,
    toolId: m.toolId,
    toolCategory: m.toolCategory,
    complexity: m.complexity,
    canParallelize: false,
  }));
}

/**
 * Infer action from context when no pattern matches
 */
function inferAction(
  subTask: string,
  primaryIntent?: IntentCategory
): {
  action: string;
  toolId: string;
  toolCategory: string;
  complexity: TaskStep["estimatedComplexity"];
  canParallelize?: boolean;
} | null {
  const task = subTask.toLowerCase();
  
  // Intent-based inference
  if (primaryIntent === "information_gathering" || primaryIntent === "research") {
    return { action: "web_search", toolId: "web_search", toolCategory: "web", complexity: "simple" };
  }
  if (primaryIntent === "communication") {
    return { action: "email_send", toolId: "email_send", toolCategory: "email", complexity: "moderate" };
  }
  if (primaryIntent === "data_processing") {
    return { action: "data_transform", toolId: "data_transform", toolCategory: "data", complexity: "moderate" };
  }
  if (primaryIntent === "content_creation") {
    return { action: "file_write", toolId: "file_write", toolCategory: "files", complexity: "simple" };
  }
  
  // Keyword-based inference
  if (task.includes("data") || task.includes("spreadsheet") || task.includes("table")) {
    return { action: "data_transform", toolId: "data_transform", toolCategory: "data", complexity: "moderate" };
  }
  if (task.includes("email") || task.includes("message")) {
    return { action: "email_send", toolId: "email_send", toolCategory: "email", complexity: "moderate" };
  }
  if (task.includes("research") || task.includes("find") || task.includes("search")) {
    return { action: "web_search", toolId: "web_search", toolCategory: "web", complexity: "simple" };
  }
  
  return null;
}

/**
 * Analyze data flow for a step
 */
function analyzeDataFlow(
  subTask: string,
  action: string
): { inputs: string[]; outputs: string[] } {
  const inputs: string[] = [];
  const outputs: string[] = [];
  
  // Extract potential inputs (URLs, file names, etc.)
  const urlMatch = subTask.match(/https?:\/\/[^\s]+/g);
  if (urlMatch) inputs.push(...urlMatch);
  
  const fileMatch = subTask.match(/\b[\w-]+\.(csv|xlsx|pdf|txt|json)\b/gi);
  if (fileMatch) inputs.push(...fileMatch);
  
  // Define standard outputs by action
  const outputMap: Record<string, string[]> = {
    web_search: ["search_results"],
    web_scrape: ["scraped_data"],
    web_screenshot: ["screenshot_image"],
    email_read: ["emails"],
    email_send: ["send_confirmation"],
    csv_read: ["csv_data"],
    csv_write: ["csv_file"],
    data_transform: ["transformed_data"],
    pdf_read: ["pdf_text"],
    pdf_generator: ["pdf_file"],
    market_data: ["market_quotes"],
    calculator: ["calculation_result"],
  };
  
  outputs.push(...(outputMap[action] || ["result"]));
  
  return { inputs, outputs };
}

/**
 * Build execution order with parallel groups
 */
function buildExecutionOrder(steps: TaskStep[]): string[][] {
  const order: string[][] = [];
  const completed = new Set<string>();
  const remaining = new Set(steps.map(s => s.id));
  
  while (remaining.size > 0) {
    const group: string[] = [];
    
    for (const stepId of remaining) {
      const step = steps.find(s => s.id === stepId)!;
      const depsComplete = step.dependencies.every(d => completed.has(d));
      
      if (depsComplete) {
        group.push(stepId);
      }
    }
    
    if (group.length === 0) {
      // Circular dependency or error - just add remaining
      group.push(...remaining);
    }
    
    order.push(group);
    for (const id of group) {
      completed.add(id);
      remaining.delete(id);
    }
  }
  
  return order;
}

/**
 * Calculate total task complexity
 */
function calculateTotalComplexity(
  steps: TaskStep[]
): "simple" | "moderate" | "complex" | "expert" {
  const complexityScores: Record<TaskStep["estimatedComplexity"], number> = {
    trivial: 1,
    simple: 2,
    moderate: 3,
    complex: 4,
  };
  
  const totalScore = steps.reduce(
    (sum, step) => sum + complexityScores[step.estimatedComplexity],
    0
  );
  
  const avgScore = totalScore / steps.length;
  
  if (steps.length >= 5 || avgScore >= 3.5) return "expert";
  if (steps.length >= 3 || avgScore >= 2.5) return "complex";
  if (steps.length >= 2 || avgScore >= 1.5) return "moderate";
  return "simple";
}

/**
 * Generate a human-readable summary
 */
function generateSummary(steps: TaskStep[]): string {
  if (steps.length === 1) {
    return `This task involves ${steps[0].action.replace(/_/g, " ")}.`;
  }
  
  const actions = steps.map(s => s.action.replace(/_/g, " "));
  const uniqueActions = [...new Set(actions)];
  
  if (uniqueActions.length <= 3) {
    return `This task involves ${uniqueActions.slice(0, -1).join(", ")} and ${uniqueActions.slice(-1)}.`;
  }
  
  return `This is a ${steps.length}-step task involving ${uniqueActions.slice(0, 3).join(", ")}, and more.`;
}

/**
 * Generate LLM prompt for task decomposition
 */
export function generateDecompositionPrompt(userRequest: string): string {
  return `Break down the following user request into specific, executable steps.

User Request: "${userRequest}"

For each step, identify:
1. The specific action to take
2. Which tool would be needed
3. What inputs are required
4. What outputs will be produced
5. Dependencies on other steps

Respond in JSON format:
{
  "summary": "Brief description of the overall task",
  "steps": [
    {
      "order": 1,
      "action": "action_name",
      "description": "What this step does",
      "tool": "tool_id",
      "inputs": ["input1", "input2"],
      "outputs": ["output1"],
      "depends_on": [],
      "can_parallelize": false
    }
  ],
  "warnings": ["Any concerns or limitations"],
  "alternatives": ["Alternative approaches if any"]
}`;
}
