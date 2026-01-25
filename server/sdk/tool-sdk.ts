/**
 * Custom Tool SDK
 * Framework for building, testing, and publishing custom tools
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  
  // Input/output schema
  inputs: ToolParameter[];
  outputs: ToolParameter[];
  
  // Authentication
  authType: "none" | "api_key" | "oauth2" | "basic" | "custom";
  authConfig?: {
    fields?: { name: string; type: string; label: string; required: boolean }[];
    oauthScopes?: string[];
    oauthAuthUrl?: string;
    oauthTokenUrl?: string;
  };
  
  // Execution
  runtime: "javascript" | "python" | "http" | "grpc";
  handler: string;  // Function name or URL
  timeout: number;  // ms
  
  // Metadata
  tags: string[];
  documentation?: string;
  examples?: ToolExample[];
  
  // Marketplace
  isPublic: boolean;
  downloads?: number;
  rating?: number;
  pricing?: "free" | "paid";
}

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object" | "file";
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  schema?: Record<string, any>;  // JSON Schema for complex types
}

export interface ToolExample {
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput: any;
}

// ============================================================================
// TOOL BUILDER
// ============================================================================

/**
 * Builder class for creating tool definitions
 */
export class ToolBuilder {
  private tool: Partial<ToolDefinition> = {};
  
  constructor(id?: string) {
    this.tool.id = id || uuidv4();
    this.tool.version = "1.0.0";
    this.tool.inputs = [];
    this.tool.outputs = [];
    this.tool.tags = [];
    this.tool.examples = [];
    this.tool.timeout = 30000;
    this.tool.isPublic = false;
    this.tool.authType = "none";
    this.tool.runtime = "javascript";
  }
  
  name(name: string): ToolBuilder {
    this.tool.name = name;
    return this;
  }
  
  description(description: string): ToolBuilder {
    this.tool.description = description;
    return this;
  }
  
  version(version: string): ToolBuilder {
    this.tool.version = version;
    return this;
  }
  
  category(category: string): ToolBuilder {
    this.tool.category = category;
    return this;
  }
  
  author(author: ToolDefinition["author"]): ToolBuilder {
    this.tool.author = author;
    return this;
  }
  
  input(param: ToolParameter): ToolBuilder {
    this.tool.inputs!.push(param);
    return this;
  }
  
  output(param: ToolParameter): ToolBuilder {
    this.tool.outputs!.push(param);
    return this;
  }
  
  auth(type: ToolDefinition["authType"], config?: ToolDefinition["authConfig"]): ToolBuilder {
    this.tool.authType = type;
    this.tool.authConfig = config;
    return this;
  }
  
  runtime(runtime: ToolDefinition["runtime"]): ToolBuilder {
    this.tool.runtime = runtime;
    return this;
  }
  
  handler(handler: string): ToolBuilder {
    this.tool.handler = handler;
    return this;
  }
  
  timeout(ms: number): ToolBuilder {
    this.tool.timeout = ms;
    return this;
  }
  
  tag(...tags: string[]): ToolBuilder {
    this.tool.tags!.push(...tags);
    return this;
  }
  
  documentation(doc: string): ToolBuilder {
    this.tool.documentation = doc;
    return this;
  }
  
  example(example: ToolExample): ToolBuilder {
    this.tool.examples!.push(example);
    return this;
  }
  
  public(isPublic: boolean = true): ToolBuilder {
    this.tool.isPublic = isPublic;
    return this;
  }
  
  build(): ToolDefinition {
    // Validate required fields
    if (!this.tool.name) throw new Error("Tool name is required");
    if (!this.tool.description) throw new Error("Tool description is required");
    if (!this.tool.category) throw new Error("Tool category is required");
    if (!this.tool.author) throw new Error("Tool author is required");
    if (!this.tool.handler) throw new Error("Tool handler is required");
    
    return this.tool as ToolDefinition;
  }
}

// ============================================================================
// TOOL TESTING
// ============================================================================

export interface TestCase {
  name: string;
  input: Record<string, any>;
  expectedOutput?: any;
  expectedError?: string;
  timeout?: number;
}

export interface TestResult {
  testCase: string;
  passed: boolean;
  duration: number;
  output?: any;
  error?: string;
  expectedOutput?: any;
}

export interface TestSuiteResult {
  toolId: string;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

/**
 * Test runner for tools
 */
export class ToolTester {
  private tool: ToolDefinition;
  private executor: (input: Record<string, any>) => Promise<any>;
  
  constructor(tool: ToolDefinition, executor: (input: Record<string, any>) => Promise<any>) {
    this.tool = tool;
    this.executor = executor;
  }
  
  /**
   * Run a single test case
   */
  async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Validate inputs against schema
      this.validateInputs(testCase.input);
      
      // Execute with timeout
      const timeout = testCase.timeout || this.tool.timeout;
      const output = await this.executeWithTimeout(testCase.input, timeout);
      
      // Check expected output
      let passed = true;
      if (testCase.expectedOutput !== undefined) {
        passed = this.compareOutputs(output, testCase.expectedOutput);
      }
      if (testCase.expectedError) {
        passed = false;  // Expected an error but got none
      }
      
      return {
        testCase: testCase.name,
        passed,
        duration: Date.now() - startTime,
        output,
        expectedOutput: testCase.expectedOutput,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if error was expected
      const passed = testCase.expectedError 
        ? errorMessage.includes(testCase.expectedError)
        : false;
      
      return {
        testCase: testCase.name,
        passed,
        duration: Date.now() - startTime,
        error: errorMessage,
        expectedOutput: testCase.expectedOutput,
      };
    }
  }
  
  /**
   * Run all test cases
   */
  async runAllTests(testCases: TestCase[]): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    for (const testCase of testCases) {
      results.push(await this.runTest(testCase));
    }
    
    return {
      toolId: this.tool.id,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      duration: Date.now() - startTime,
      results,
    };
  }
  
  /**
   * Run tool's built-in examples as tests
   */
  async runExampleTests(): Promise<TestSuiteResult> {
    const testCases: TestCase[] = (this.tool.examples || []).map(ex => ({
      name: ex.name,
      input: ex.input,
      expectedOutput: ex.expectedOutput,
    }));
    
    return this.runAllTests(testCases);
  }
  
  private validateInputs(input: Record<string, any>): void {
    for (const param of this.tool.inputs) {
      if (param.required && !(param.name in input)) {
        throw new Error(`Missing required input: ${param.name}`);
      }
      
      if (param.name in input) {
        const value = input[param.name];
        
        // Type checking
        switch (param.type) {
          case "string":
            if (typeof value !== "string") {
              throw new Error(`Input ${param.name} must be a string`);
            }
            break;
          case "number":
            if (typeof value !== "number") {
              throw new Error(`Input ${param.name} must be a number`);
            }
            break;
          case "boolean":
            if (typeof value !== "boolean") {
              throw new Error(`Input ${param.name} must be a boolean`);
            }
            break;
          case "array":
            if (!Array.isArray(value)) {
              throw new Error(`Input ${param.name} must be an array`);
            }
            break;
          case "object":
            if (typeof value !== "object" || value === null || Array.isArray(value)) {
              throw new Error(`Input ${param.name} must be an object`);
            }
            break;
        }
        
        // Enum validation
        if (param.enum && !param.enum.includes(value)) {
          throw new Error(`Input ${param.name} must be one of: ${param.enum.join(", ")}`);
        }
      }
    }
  }
  
  private async executeWithTimeout(input: Record<string, any>, timeout: number): Promise<any> {
    return Promise.race([
      this.executor(input),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Execution timed out")), timeout)
      ),
    ]);
  }
  
  private compareOutputs(actual: any, expected: any): boolean {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
}

// ============================================================================
// TOOL MARKETPLACE
// ============================================================================

export interface MarketplaceTool extends ToolDefinition {
  publishedAt: string;
  updatedAt: string;
  downloads: number;
  rating: number;
  reviews: ToolReview[];
  verified: boolean;
}

export interface ToolReview {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// Storage
const marketplaceTools: Map<string, MarketplaceTool> = new Map();
const userTools: Map<string, string[]> = new Map();  // userId -> toolIds

/**
 * Publish tool to marketplace
 */
export function publishTool(
  tool: ToolDefinition,
  publisherId: string
): MarketplaceTool {
  const marketplaceTool: MarketplaceTool = {
    ...tool,
    isPublic: true,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    downloads: 0,
    rating: 0,
    reviews: [],
    verified: false,
  };
  
  marketplaceTools.set(tool.id, marketplaceTool);
  
  // Track publisher's tools
  const tools = userTools.get(publisherId) || [];
  tools.push(tool.id);
  userTools.set(publisherId, tools);
  
  return marketplaceTool;
}

/**
 * Search marketplace tools
 */
export function searchMarketplace(options?: {
  query?: string;
  category?: string;
  tags?: string[];
  minRating?: number;
  verified?: boolean;
  limit?: number;
  offset?: number;
}): { tools: MarketplaceTool[]; total: number } {
  let tools = Array.from(marketplaceTools.values());
  
  if (options?.query) {
    const q = options.query.toLowerCase();
    tools = tools.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  }
  if (options?.category) {
    tools = tools.filter(t => t.category === options.category);
  }
  if (options?.tags?.length) {
    tools = tools.filter(t => 
      options.tags!.some(tag => t.tags.includes(tag))
    );
  }
  if (options?.minRating) {
    tools = tools.filter(t => t.rating >= options.minRating!);
  }
  if (options?.verified !== undefined) {
    tools = tools.filter(t => t.verified === options.verified);
  }
  
  const total = tools.length;
  
  // Sort by downloads
  tools.sort((a, b) => b.downloads - a.downloads);
  
  // Pagination
  const offset = options?.offset || 0;
  const limit = options?.limit || 20;
  tools = tools.slice(offset, offset + limit);
  
  return { tools, total };
}

/**
 * Install tool (increment download count)
 */
export function installTool(toolId: string, userId: string): void {
  const tool = marketplaceTools.get(toolId);
  if (!tool) throw new Error("Tool not found");
  
  tool.downloads++;
  
  // Track user's installed tools
  const installed = userTools.get(`installed:${userId}`) || [];
  if (!installed.includes(toolId)) {
    installed.push(toolId);
    userTools.set(`installed:${userId}`, installed);
  }
}

/**
 * Add review
 */
export function addReview(
  toolId: string,
  userId: string,
  rating: number,
  comment: string
): ToolReview {
  const tool = marketplaceTools.get(toolId);
  if (!tool) throw new Error("Tool not found");
  
  const review: ToolReview = {
    id: uuidv4(),
    userId,
    rating: Math.max(1, Math.min(5, rating)),
    comment,
    createdAt: new Date().toISOString(),
  };
  
  tool.reviews.push(review);
  
  // Recalculate average rating
  tool.rating = tool.reviews.reduce((sum, r) => sum + r.rating, 0) / tool.reviews.length;
  
  return review;
}

// ============================================================================
// TOOL SCAFFOLDING
// ============================================================================

export interface ToolScaffold {
  definition: string;  // TypeScript/JavaScript
  implementation: string;
  tests: string;
  readme: string;
}

/**
 * Generate tool scaffolding
 */
export function generateScaffold(
  name: string,
  description: string,
  category: string,
  inputs: ToolParameter[],
  outputs: ToolParameter[]
): ToolScaffold {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  
  // Definition file
  const definition = `// ${name} Tool Definition
import { ToolBuilder } from "@agentforge/sdk";

export const ${id}Tool = new ToolBuilder("${id}")
  .name("${name}")
  .description("${description}")
  .category("${category}")
  .author({ name: "Your Name", email: "you@example.com" })
${inputs.map(i => `  .input({
    name: "${i.name}",
    type: "${i.type}",
    description: "${i.description}",
    required: ${i.required},
  })`).join("\n")}
${outputs.map(o => `  .output({
    name: "${o.name}",
    type: "${o.type}",
    description: "${o.description}",
    required: ${o.required},
  })`).join("\n")}
  .handler("execute")
  .tag("custom")
  .build();
`;

  // Implementation file
  const implementation = `// ${name} Tool Implementation
import { ToolExecutionResult } from "@agentforge/sdk";

export interface ${name.replace(/\s/g, "")}Input {
${inputs.map(i => `  ${i.name}${i.required ? "" : "?"}: ${i.type};`).join("\n")}
}

export interface ${name.replace(/\s/g, "")}Output {
${outputs.map(o => `  ${o.name}: ${o.type};`).join("\n")}
}

export async function execute(
  input: ${name.replace(/\s/g, "")}Input
): Promise<ToolExecutionResult<${name.replace(/\s/g, "")}Output>> {
  try {
    // TODO: Implement your tool logic here
    
    return {
      success: true,
      result: {
${outputs.map(o => `        ${o.name}: undefined, // TODO: Set output value`).join("\n")}
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
`;

  // Test file
  const tests = `// ${name} Tool Tests
import { ToolTester } from "@agentforge/sdk";
import { ${id}Tool } from "./definition";
import { execute } from "./implementation";

describe("${name}", () => {
  const tester = new ToolTester(${id}Tool, execute);

  test("should execute successfully", async () => {
    const result = await tester.runTest({
      name: "basic test",
      input: {
${inputs.filter(i => i.required).map(i => `        ${i.name}: /* TODO: provide test value */`).join(",\n")}
      },
    });
    
    expect(result.passed).toBe(true);
  });

  test("should validate required inputs", async () => {
    const result = await tester.runTest({
      name: "missing required input",
      input: {},
      expectedError: "Missing required input",
    });
    
    expect(result.passed).toBe(true);
  });
});
`;

  // README
  const readme = `# ${name}

${description}

## Installation

\`\`\`bash
npm install @agentforge/tool-${id}
\`\`\`

## Usage

\`\`\`typescript
import { ${id}Tool, execute } from "@agentforge/tool-${id}";

const result = await execute({
${inputs.filter(i => i.required).map(i => `  ${i.name}: /* your value */,`).join("\n")}
});

if (result.success) {
  console.log(result.result);
}
\`\`\`

## Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
${inputs.map(i => `| ${i.name} | ${i.type} | ${i.required ? "Yes" : "No"} | ${i.description} |`).join("\n")}

## Outputs

| Name | Type | Description |
|------|------|-------------|
${outputs.map(o => `| ${o.name} | ${o.type} | ${o.description} |`).join("\n")}

## License

MIT
`;

  return {
    definition,
    implementation,
    tests,
    readme,
  };
}

// ToolBuilder and ToolTester are already exported via class declaration
