/**
 * Tool Registry Helper Functions
 * Provides easy access to tool definitions
 */

import { toolRegistry, type ToolDefinitionInput } from "@shared/schema";

// Re-export the registry
export { toolRegistry };

/**
 * Get all tools in a specific category
 */
export function getToolsByCategory(category: string): ToolDefinitionInput[] {
  return toolRegistry.filter(t => t.category === category);
}

/**
 * Get a single tool by ID
 */
export function getToolById(id: string): ToolDefinitionInput | undefined {
  return toolRegistry.find(t => t.id === id);
}

/**
 * Search tools by name or description
 */
export function searchTools(query: string): ToolDefinitionInput[] {
  const lowerQuery = query.toLowerCase();
  return toolRegistry.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    (t.tags || []).some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all tool categories
 */
export function getCategories(): string[] {
  return [...new Set(toolRegistry.map(t => t.category))];
}

/**
 * Get tools that require authentication
 */
export function getToolsRequiringAuth(): ToolDefinitionInput[] {
  return toolRegistry.filter(t => t.authType && t.authType !== "none");
}
