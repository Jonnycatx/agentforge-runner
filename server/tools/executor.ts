/**
 * Tool Execution Engine - Phase 1.3
 * Handles the execution of all registered tools
 */

import { type ToolDefinition, type ToolExecutionResult, toolRegistry } from "@shared/schema";
import { toolStorage } from "../storage";

// Tool executor function type
type ToolExecutor = (
  input: Record<string, any>,
  credentials?: Record<string, any>
) => Promise<ToolExecutionResult>;

// Registry of tool executors
const executors: Record<string, ToolExecutor> = {};

/**
 * Register a tool executor
 */
export function registerExecutor(toolId: string, executor: ToolExecutor) {
  executors[toolId] = executor;
}

/**
 * Execute a tool by ID
 */
export async function executeTool(
  toolId: string,
  input: Record<string, any>,
  options: {
    userId?: string;
    agentId?: string;
  } = {}
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    // Get tool definition
    const tool = toolRegistry.find(t => t.id === toolId);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolId}`,
        executionTime: Date.now() - startTime,
        logs: [`Error: Tool "${toolId}" not found in registry`],
      };
    }

    logs.push(`Starting execution of tool: ${tool.name}`);

    // Get credentials if required
    let credentials: Record<string, any> | undefined;
    if (tool.authType !== "none" && options.userId) {
      credentials = await toolStorage.getDecryptedCredential(options.userId, toolId) as Record<string, any> | undefined;
      if (!credentials) {
        return {
          success: false,
          error: `Tool "${tool.name}" requires authentication. Please connect first.`,
          executionTime: Date.now() - startTime,
          logs: [...logs, "Error: Missing credentials"],
        };
      }
      logs.push("Credentials loaded");
    }

    // Get executor
    const executor = executors[toolId];
    if (!executor) {
      return {
        success: false,
        error: `No executor registered for tool: ${toolId}`,
        executionTime: Date.now() - startTime,
        logs: [...logs, `Error: No executor for "${toolId}"`],
      };
    }

    // Validate required inputs
    const missingInputs = (tool.inputs || [])
      .filter(i => i.required && input[i.name] === undefined)
      .map(i => i.name);

    if (missingInputs.length > 0) {
      return {
        success: false,
        error: `Missing required inputs: ${missingInputs.join(", ")}`,
        executionTime: Date.now() - startTime,
        logs: [...logs, `Error: Missing inputs: ${missingInputs.join(", ")}`],
      };
    }

    logs.push("Executing tool...");

    // Execute the tool
    const result = await executor(input, credentials);
    result.logs = [...logs, ...(result.logs || [])];
    result.executionTime = Date.now() - startTime;

    // Log execution to database
    if (options.userId) {
      await toolStorage.logExecution({
        userId: options.userId,
        agentId: options.agentId,
        toolId,
        input,
        output: result.output,
        success: result.success,
        error: result.error,
        executionTime: result.executionTime,
      });
    }

    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return {
      success: false,
      error: errorMessage,
      executionTime,
      logs: [...logs, `Fatal error: ${errorMessage}`],
    };
  }
}

/**
 * Check if a tool has an executor registered
 */
export function hasExecutor(toolId: string): boolean {
  return toolId in executors;
}

/**
 * Get list of tools with executors
 */
export function getExecutableTools(): string[] {
  return Object.keys(executors);
}
