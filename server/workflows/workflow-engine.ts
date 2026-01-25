/**
 * Workflow Builder System
 * Visual workflow editor with nodes, conditions, and execution
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export type NodeType = 
  | "trigger"     // Starting point
  | "action"      // Execute something
  | "condition"   // Branch based on condition
  | "loop"        // Iterate over items
  | "delay"       // Wait for time
  | "parallel"    // Run multiple branches
  | "merge"       // Merge parallel branches
  | "subworkflow" // Run another workflow
  | "end";        // Terminal node

// Workflow node
export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  config: NodeConfig;
  position: { x: number; y: number };
  nextNodes: string[];  // IDs of connected nodes
}

// Node configurations by type
export type NodeConfig = 
  | TriggerConfig
  | ActionConfig
  | ConditionConfig
  | LoopConfig
  | DelayConfig
  | ParallelConfig
  | SubworkflowConfig
  | {};

export interface TriggerConfig {
  triggerType: "manual" | "schedule" | "webhook" | "event";
  schedule?: string;  // Cron expression
  webhookPath?: string;
  eventType?: string;
}

export interface ActionConfig {
  actionType: "tool" | "agent" | "api" | "transform" | "notify";
  toolId?: string;
  agentId?: string;
  apiConfig?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    bodyTemplate?: string;
  };
  transformScript?: string;
  notifyConfig?: {
    channel: "email" | "slack" | "webhook";
    recipient: string;
    messageTemplate: string;
  };
  inputMapping?: Record<string, string>;  // Maps workflow variables to action inputs
  outputVariable?: string;  // Variable name to store result
}

export interface ConditionConfig {
  conditions: {
    id: string;
    field: string;
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains" | "regex" | "exists";
    value: any;
    nextNode: string;  // Node to go to if condition is true
  }[];
  defaultNode?: string;  // Node to go to if no conditions match
}

export interface LoopConfig {
  loopType: "forEach" | "while" | "times";
  sourceVariable?: string;  // For forEach - variable containing array
  condition?: string;       // For while - condition expression
  times?: number;           // For times - number of iterations
  itemVariable?: string;    // Variable name for current item
  indexVariable?: string;   // Variable name for current index
  bodyNode: string;         // First node of loop body
  exitNode: string;         // Node after loop completes
}

export interface DelayConfig {
  delayType: "fixed" | "until" | "dynamic";
  fixedMs?: number;
  untilTime?: string;
  dynamicExpression?: string;
}

export interface ParallelConfig {
  branches: {
    id: string;
    name: string;
    startNode: string;
  }[];
  waitAll: boolean;  // Wait for all branches or just first
}

export interface SubworkflowConfig {
  workflowId: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
}

// Connection between nodes
export interface WorkflowConnection {
  id: string;
  fromNode: string;
  toNode: string;
  label?: string;  // For conditions
}

// Complete workflow definition
export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: number;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables: WorkflowVariable[];
  triggers: string[];  // IDs of trigger nodes
  metadata: {
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    category?: string;
  };
  settings: {
    maxExecutionTime: number;  // ms
    retryOnFailure: boolean;
    retryCount: number;
    retryDelay: number;
    logLevel: "none" | "errors" | "all";
  };
}

// Workflow variable
export interface WorkflowVariable {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object" | "any";
  defaultValue?: any;
  description?: string;
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

export type ExecutionStatus = 
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  variables: Record<string, any>;
  currentNodes: string[];
  completedNodes: string[];
  nodeResults: Record<string, NodeExecutionResult>;
  startedAt: string;
  completedAt?: string;
  error?: string;
  logs: ExecutionLog[];
}

export interface NodeExecutionResult {
  nodeId: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

export interface ExecutionLog {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  nodeId?: string;
  message: string;
  data?: any;
}

// Storage
const workflows: Map<string, Workflow> = new Map();
const executions: Map<string, WorkflowExecution> = new Map();

// ============================================================================
// WORKFLOW CRUD
// ============================================================================

/**
 * Create a new workflow
 */
export function createWorkflow(
  name: string,
  description: string,
  createdBy: string,
  nodes: WorkflowNode[] = [],
  connections: WorkflowConnection[] = []
): Workflow {
  const workflow: Workflow = {
    id: uuidv4(),
    name,
    description,
    version: 1,
    nodes,
    connections,
    variables: [],
    triggers: nodes.filter(n => n.type === "trigger").map(n => n.id),
    metadata: {
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    },
    settings: {
      maxExecutionTime: 3600000,  // 1 hour
      retryOnFailure: true,
      retryCount: 3,
      retryDelay: 5000,
      logLevel: "errors",
    },
  };
  
  workflows.set(workflow.id, workflow);
  return workflow;
}

/**
 * Update a workflow (creates new version)
 */
export function updateWorkflow(
  workflowId: string,
  updates: Partial<Omit<Workflow, "id" | "version" | "metadata">>
): Workflow {
  const workflow = workflows.get(workflowId);
  if (!workflow) throw new Error("Workflow not found");
  
  const updated: Workflow = {
    ...workflow,
    ...updates,
    version: workflow.version + 1,
    triggers: (updates.nodes || workflow.nodes)
      .filter(n => n.type === "trigger")
      .map(n => n.id),
    metadata: {
      ...workflow.metadata,
      updatedAt: new Date().toISOString(),
    },
  };
  
  workflows.set(workflowId, updated);
  return updated;
}

/**
 * Get a workflow
 */
export function getWorkflow(workflowId: string): Workflow | null {
  return workflows.get(workflowId) || null;
}

/**
 * List all workflows
 */
export function listWorkflows(options?: {
  createdBy?: string;
  category?: string;
  tags?: string[];
}): Workflow[] {
  let result = Array.from(workflows.values());
  
  if (options?.createdBy) {
    result = result.filter(w => w.metadata.createdBy === options.createdBy);
  }
  if (options?.category) {
    result = result.filter(w => w.metadata.category === options.category);
  }
  if (options?.tags?.length) {
    result = result.filter(w => 
      options.tags!.some(tag => w.metadata.tags.includes(tag))
    );
  }
  
  return result;
}

/**
 * Delete a workflow
 */
export function deleteWorkflow(workflowId: string): boolean {
  return workflows.delete(workflowId);
}

// ============================================================================
// NODE HELPERS
// ============================================================================

/**
 * Create a trigger node
 */
export function createTriggerNode(
  name: string,
  config: TriggerConfig,
  position: { x: number; y: number } = { x: 100, y: 100 }
): WorkflowNode {
  return {
    id: uuidv4(),
    type: "trigger",
    name,
    config,
    position,
    nextNodes: [],
  };
}

/**
 * Create an action node
 */
export function createActionNode(
  name: string,
  config: ActionConfig,
  position: { x: number; y: number } = { x: 200, y: 100 }
): WorkflowNode {
  return {
    id: uuidv4(),
    type: "action",
    name,
    config,
    position,
    nextNodes: [],
  };
}

/**
 * Create a condition node
 */
export function createConditionNode(
  name: string,
  config: ConditionConfig,
  position: { x: number; y: number } = { x: 200, y: 100 }
): WorkflowNode {
  return {
    id: uuidv4(),
    type: "condition",
    name,
    config,
    position,
    nextNodes: [],
  };
}

/**
 * Connect two nodes
 */
export function connectNodes(
  workflow: Workflow,
  fromNodeId: string,
  toNodeId: string,
  label?: string
): WorkflowConnection {
  const fromNode = workflow.nodes.find(n => n.id === fromNodeId);
  if (!fromNode) throw new Error("Source node not found");
  
  const toNode = workflow.nodes.find(n => n.id === toNodeId);
  if (!toNode) throw new Error("Target node not found");
  
  // Add to nextNodes
  if (!fromNode.nextNodes.includes(toNodeId)) {
    fromNode.nextNodes.push(toNodeId);
  }
  
  // Create connection
  const connection: WorkflowConnection = {
    id: uuidv4(),
    fromNode: fromNodeId,
    toNode: toNodeId,
    label,
  };
  
  workflow.connections.push(connection);
  return connection;
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

/**
 * Start workflow execution
 */
export function startExecution(
  workflowId: string,
  initialVariables: Record<string, any> = {},
  triggerId?: string
): WorkflowExecution {
  const workflow = workflows.get(workflowId);
  if (!workflow) throw new Error("Workflow not found");
  
  // Initialize variables with defaults
  const variables: Record<string, any> = {};
  for (const v of workflow.variables) {
    variables[v.name] = initialVariables[v.name] ?? v.defaultValue;
  }
  Object.assign(variables, initialVariables);
  
  // Determine starting nodes
  const startNodes = triggerId 
    ? [triggerId]
    : workflow.triggers.length > 0 
      ? [workflow.triggers[0]]
      : workflow.nodes.filter(n => n.type === "trigger").map(n => n.id);
  
  const execution: WorkflowExecution = {
    id: uuidv4(),
    workflowId,
    workflowVersion: workflow.version,
    status: "running",
    variables,
    currentNodes: startNodes,
    completedNodes: [],
    nodeResults: {},
    startedAt: new Date().toISOString(),
    logs: [{
      timestamp: new Date().toISOString(),
      level: "info",
      message: `Workflow execution started`,
      data: { workflowId, version: workflow.version },
    }],
  };
  
  executions.set(execution.id, execution);
  return execution;
}

/**
 * Execute the next step in a workflow
 */
export async function executeStep(
  executionId: string,
  executeAction: (node: WorkflowNode, variables: Record<string, any>) => Promise<any>
): Promise<WorkflowExecution> {
  const execution = executions.get(executionId);
  if (!execution) throw new Error("Execution not found");
  
  if (execution.status !== "running") {
    return execution;
  }
  
  const workflow = workflows.get(execution.workflowId);
  if (!workflow) throw new Error("Workflow not found");
  
  const nextNodes: string[] = [];
  
  for (const nodeId of execution.currentNodes) {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    // Start node execution
    execution.nodeResults[nodeId] = {
      nodeId,
      status: "running",
      startedAt: new Date().toISOString(),
    };
    
    try {
      let result: any;
      
      switch (node.type) {
        case "trigger":
          // Triggers just pass through
          result = { triggered: true };
          break;
          
        case "action":
          result = await executeAction(node, execution.variables);
          // Store result in variable if configured
          const actionConfig = node.config as ActionConfig;
          if (actionConfig.outputVariable) {
            execution.variables[actionConfig.outputVariable] = result;
          }
          break;
          
        case "condition":
          result = evaluateCondition(node.config as ConditionConfig, execution.variables);
          break;
          
        case "loop":
          result = executeLoopStep(node, execution);
          break;
          
        case "delay":
          const delayConfig = node.config as DelayConfig;
          if (delayConfig.delayType === "fixed" && delayConfig.fixedMs) {
            await new Promise(resolve => setTimeout(resolve, delayConfig.fixedMs));
          }
          result = { delayed: true };
          break;
          
        case "end":
          result = { ended: true };
          break;
          
        default:
          result = {};
      }
      
      // Mark node as completed
      execution.nodeResults[nodeId] = {
        ...execution.nodeResults[nodeId],
        status: "completed",
        completedAt: new Date().toISOString(),
        result,
      };
      
      execution.completedNodes.push(nodeId);
      
      // Determine next nodes
      if (node.type === "condition") {
        const condResult = result as { nextNode?: string };
        if (condResult.nextNode) {
          nextNodes.push(condResult.nextNode);
        }
      } else if (node.type !== "end") {
        nextNodes.push(...node.nextNodes);
      }
      
      // Log
      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: "info",
        nodeId,
        message: `Node "${node.name}" completed`,
        data: result,
      });
      
    } catch (error) {
      execution.nodeResults[nodeId] = {
        ...execution.nodeResults[nodeId],
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      
      execution.logs.push({
        timestamp: new Date().toISOString(),
        level: "error",
        nodeId,
        message: `Node "${node.name}" failed: ${error}`,
      });
      
      // Check if we should retry or fail
      if (!workflow.settings.retryOnFailure) {
        execution.status = "failed";
        execution.error = `Node "${node.name}" failed: ${error}`;
      }
    }
  }
  
  // Update current nodes
  execution.currentNodes = [...new Set(nextNodes)];
  
  // Check if workflow is complete
  if (execution.currentNodes.length === 0) {
    execution.status = "completed";
    execution.completedAt = new Date().toISOString();
    execution.logs.push({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Workflow execution completed",
    });
  }
  
  return execution;
}

/**
 * Evaluate condition node
 */
function evaluateCondition(
  config: ConditionConfig,
  variables: Record<string, any>
): { nextNode?: string; matchedCondition?: string } {
  for (const condition of config.conditions) {
    const fieldValue = getNestedValue(variables, condition.field);
    let matches = false;
    
    switch (condition.operator) {
      case "eq":
        matches = fieldValue === condition.value;
        break;
      case "neq":
        matches = fieldValue !== condition.value;
        break;
      case "gt":
        matches = fieldValue > condition.value;
        break;
      case "gte":
        matches = fieldValue >= condition.value;
        break;
      case "lt":
        matches = fieldValue < condition.value;
        break;
      case "lte":
        matches = fieldValue <= condition.value;
        break;
      case "contains":
        matches = String(fieldValue).includes(String(condition.value));
        break;
      case "not_contains":
        matches = !String(fieldValue).includes(String(condition.value));
        break;
      case "regex":
        matches = new RegExp(condition.value).test(String(fieldValue));
        break;
      case "exists":
        matches = fieldValue !== undefined && fieldValue !== null;
        break;
    }
    
    if (matches) {
      return { nextNode: condition.nextNode, matchedCondition: condition.id };
    }
  }
  
  return { nextNode: config.defaultNode };
}

/**
 * Execute loop step
 */
function executeLoopStep(
  node: WorkflowNode,
  execution: WorkflowExecution
): { continue: boolean; item?: any; index?: number } {
  const config = node.config as LoopConfig;
  const loopState = execution.variables[`__loop_${node.id}`] || { index: 0 };
  
  switch (config.loopType) {
    case "forEach": {
      const items = execution.variables[config.sourceVariable!] as any[];
      if (!Array.isArray(items) || loopState.index >= items.length) {
        return { continue: false };
      }
      
      if (config.itemVariable) {
        execution.variables[config.itemVariable] = items[loopState.index];
      }
      if (config.indexVariable) {
        execution.variables[config.indexVariable] = loopState.index;
      }
      
      loopState.index++;
      execution.variables[`__loop_${node.id}`] = loopState;
      
      return { continue: true, item: items[loopState.index - 1], index: loopState.index - 1 };
    }
    
    case "times": {
      if (loopState.index >= (config.times || 0)) {
        return { continue: false };
      }
      
      if (config.indexVariable) {
        execution.variables[config.indexVariable] = loopState.index;
      }
      
      loopState.index++;
      execution.variables[`__loop_${node.id}`] = loopState;
      
      return { continue: true, index: loopState.index - 1 };
    }
    
    default:
      return { continue: false };
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

/**
 * Get execution status
 */
export function getExecution(executionId: string): WorkflowExecution | null {
  return executions.get(executionId) || null;
}

/**
 * List executions for a workflow
 */
export function listExecutions(workflowId: string): WorkflowExecution[] {
  return Array.from(executions.values())
    .filter(e => e.workflowId === workflowId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

/**
 * Pause execution
 */
export function pauseExecution(executionId: string): void {
  const execution = executions.get(executionId);
  if (execution && execution.status === "running") {
    execution.status = "paused";
  }
}

/**
 * Resume execution
 */
export function resumeExecution(executionId: string): void {
  const execution = executions.get(executionId);
  if (execution && execution.status === "paused") {
    execution.status = "running";
  }
}

/**
 * Cancel execution
 */
export function cancelExecution(executionId: string): void {
  const execution = executions.get(executionId);
  if (execution && ["running", "paused", "pending"].includes(execution.status)) {
    execution.status = "cancelled";
    execution.completedAt = new Date().toISOString();
  }
}

// ============================================================================
// WORKFLOW TEMPLATES
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: Omit<WorkflowNode, "id">[];
  connections: { fromIndex: number; toIndex: number; label?: string }[];
  variables: WorkflowVariable[];
  tags: string[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "lead-qualification",
    name: "Lead Qualification Pipeline",
    description: "Automatically research and qualify leads",
    category: "sales",
    nodes: [
      { type: "trigger", name: "New Lead", config: { triggerType: "webhook" }, position: { x: 100, y: 100 }, nextNodes: [] },
      { type: "action", name: "Research Company", config: { actionType: "tool", toolId: "company_search", outputVariable: "companyInfo" }, position: { x: 300, y: 100 }, nextNodes: [] },
      { type: "condition", name: "Qualified?", config: { conditions: [{ id: "1", field: "companyInfo.employees", operator: "gte", value: 50, nextNode: "" }] }, position: { x: 500, y: 100 }, nextNodes: [] },
      { type: "action", name: "Add to CRM", config: { actionType: "api" }, position: { x: 700, y: 50 }, nextNodes: [] },
      { type: "action", name: "Send Rejection", config: { actionType: "tool", toolId: "email_send" }, position: { x: 700, y: 150 }, nextNodes: [] },
    ],
    connections: [
      { fromIndex: 0, toIndex: 1 },
      { fromIndex: 1, toIndex: 2 },
      { fromIndex: 2, toIndex: 3, label: "Yes" },
      { fromIndex: 2, toIndex: 4, label: "No" },
    ],
    variables: [
      { name: "leadEmail", type: "string" },
      { name: "companyInfo", type: "object" },
    ],
    tags: ["sales", "leads", "automation"],
  },
  {
    id: "daily-digest",
    name: "Daily News Digest",
    description: "Collect and summarize daily news",
    category: "research",
    nodes: [
      { type: "trigger", name: "Daily Schedule", config: { triggerType: "schedule", schedule: "0 8 * * *" }, position: { x: 100, y: 100 }, nextNodes: [] },
      { type: "action", name: "Search News", config: { actionType: "tool", toolId: "news_search", outputVariable: "articles" }, position: { x: 300, y: 100 }, nextNodes: [] },
      { type: "loop", name: "For Each Article", config: { loopType: "forEach", sourceVariable: "articles", itemVariable: "article", bodyNode: "", exitNode: "" }, position: { x: 500, y: 100 }, nextNodes: [] },
      { type: "action", name: "Summarize", config: { actionType: "agent", outputVariable: "summaries" }, position: { x: 700, y: 100 }, nextNodes: [] },
      { type: "action", name: "Send Email", config: { actionType: "tool", toolId: "email_send" }, position: { x: 900, y: 100 }, nextNodes: [] },
    ],
    connections: [
      { fromIndex: 0, toIndex: 1 },
      { fromIndex: 1, toIndex: 2 },
      { fromIndex: 2, toIndex: 3 },
      { fromIndex: 3, toIndex: 4 },
    ],
    variables: [
      { name: "topics", type: "array", defaultValue: ["technology", "business"] },
      { name: "articles", type: "array" },
      { name: "summaries", type: "array" },
    ],
    tags: ["research", "news", "daily"],
  },
  {
    id: "customer-onboarding",
    name: "Customer Onboarding",
    description: "Automated customer onboarding sequence",
    category: "support",
    nodes: [
      { type: "trigger", name: "New Customer", config: { triggerType: "webhook" }, position: { x: 100, y: 100 }, nextNodes: [] },
      { type: "action", name: "Send Welcome", config: { actionType: "tool", toolId: "email_send" }, position: { x: 300, y: 100 }, nextNodes: [] },
      { type: "delay", name: "Wait 1 Day", config: { delayType: "fixed", fixedMs: 86400000 }, position: { x: 500, y: 100 }, nextNodes: [] },
      { type: "action", name: "Check Activity", config: { actionType: "api" }, position: { x: 700, y: 100 }, nextNodes: [] },
      { type: "condition", name: "Active?", config: { conditions: [] }, position: { x: 900, y: 100 }, nextNodes: [] },
      { type: "action", name: "Send Tips", config: { actionType: "tool", toolId: "email_send" }, position: { x: 1100, y: 50 }, nextNodes: [] },
      { type: "action", name: "Send Nudge", config: { actionType: "tool", toolId: "email_send" }, position: { x: 1100, y: 150 }, nextNodes: [] },
    ],
    connections: [
      { fromIndex: 0, toIndex: 1 },
      { fromIndex: 1, toIndex: 2 },
      { fromIndex: 2, toIndex: 3 },
      { fromIndex: 3, toIndex: 4 },
      { fromIndex: 4, toIndex: 5, label: "Yes" },
      { fromIndex: 4, toIndex: 6, label: "No" },
    ],
    variables: [
      { name: "customerEmail", type: "string" },
      { name: "customerName", type: "string" },
    ],
    tags: ["support", "onboarding", "email"],
  },
];

/**
 * Create workflow from template
 */
export function createFromTemplate(
  templateId: string,
  name: string,
  createdBy: string
): Workflow {
  const template = workflowTemplates.find(t => t.id === templateId);
  if (!template) throw new Error("Template not found");
  
  // Create nodes with IDs
  const nodes: WorkflowNode[] = template.nodes.map((n, i) => ({
    ...n,
    id: uuidv4(),
  }));
  
  // Create connections with actual node IDs
  const connections: WorkflowConnection[] = template.connections.map(c => ({
    id: uuidv4(),
    fromNode: nodes[c.fromIndex].id,
    toNode: nodes[c.toIndex].id,
    label: c.label,
  }));
  
  // Update nextNodes
  for (const conn of connections) {
    const fromNode = nodes.find(n => n.id === conn.fromNode);
    if (fromNode && !fromNode.nextNodes.includes(conn.toNode)) {
      fromNode.nextNodes.push(conn.toNode);
    }
  }
  
  const workflow = createWorkflow(name, template.description, createdBy, nodes, connections);
  workflow.variables = [...template.variables];
  workflow.metadata.tags = [...template.tags];
  workflow.metadata.category = template.category;
  
  return workflow;
}
