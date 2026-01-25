/**
 * Workflow Builder System
 * Exports for workflow creation and execution
 */

export {
  // Types
  type NodeType,
  type WorkflowNode,
  type NodeConfig,
  type TriggerConfig,
  type ActionConfig,
  type ConditionConfig,
  type LoopConfig,
  type DelayConfig,
  type ParallelConfig,
  type SubworkflowConfig,
  type WorkflowConnection,
  type Workflow,
  type WorkflowVariable,
  type ExecutionStatus,
  type WorkflowExecution,
  type NodeExecutionResult,
  type ExecutionLog,
  type WorkflowTemplate,
  
  // Workflow CRUD
  createWorkflow,
  updateWorkflow,
  getWorkflow,
  listWorkflows,
  deleteWorkflow,
  
  // Node helpers
  createTriggerNode,
  createActionNode,
  createConditionNode,
  connectNodes,
  
  // Execution
  startExecution,
  executeStep,
  getExecution,
  listExecutions,
  pauseExecution,
  resumeExecution,
  cancelExecution,
  
  // Templates
  workflowTemplates,
  createFromTemplate,
} from "./workflow-engine";
