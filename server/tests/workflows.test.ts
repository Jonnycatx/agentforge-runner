/**
 * Workflow Builder Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createWorkflow,
  updateWorkflow,
  getWorkflow,
  listWorkflows,
  deleteWorkflow,
  createTriggerNode,
  createActionNode,
  createConditionNode,
  connectNodes,
  startExecution,
  executeStep,
  getExecution,
  pauseExecution,
  resumeExecution,
  cancelExecution,
  workflowTemplates,
  createFromTemplate,
} from '../workflows/workflow-engine';

describe('Workflow CRUD', () => {
  const testUser = 'test-user';

  it('should create workflow', () => {
    const workflow = createWorkflow('Test Workflow', 'A test workflow', testUser);
    expect(workflow.id).toBeDefined();
    expect(workflow.name).toBe('Test Workflow');
    expect(workflow.version).toBe(1);
  });

  it('should get workflow by id', () => {
    const workflow = createWorkflow('Get Test', 'Test', testUser);
    const retrieved = getWorkflow(workflow.id);
    expect(retrieved?.id).toBe(workflow.id);
  });

  it('should update workflow', () => {
    const workflow = createWorkflow('Update Test', 'Original', testUser);
    const updated = updateWorkflow(workflow.id, { description: 'Updated' });
    expect(updated.description).toBe('Updated');
    expect(updated.version).toBe(2);
  });

  it('should list workflows', () => {
    createWorkflow('List Test 1', 'Test', testUser);
    createWorkflow('List Test 2', 'Test', testUser);
    const workflows = listWorkflows({ createdBy: testUser });
    expect(workflows.length).toBeGreaterThanOrEqual(2);
  });

  it('should delete workflow', () => {
    const workflow = createWorkflow('Delete Test', 'Test', testUser);
    const deleted = deleteWorkflow(workflow.id);
    expect(deleted).toBe(true);
    expect(getWorkflow(workflow.id)).toBeNull();
  });
});

describe('Workflow Nodes', () => {
  it('should create trigger node', () => {
    const node = createTriggerNode('Start', { triggerType: 'manual' });
    expect(node.type).toBe('trigger');
    expect(node.id).toBeDefined();
  });

  it('should create action node', () => {
    const node = createActionNode('Run Tool', { actionType: 'tool', toolId: 'calculator' });
    expect(node.type).toBe('action');
  });

  it('should create condition node', () => {
    const node = createConditionNode('Check Value', {
      conditions: [
        { id: '1', field: 'value', operator: 'gt', value: 10, nextNode: '' }
      ]
    });
    expect(node.type).toBe('condition');
  });

  it('should connect nodes', () => {
    const trigger = createTriggerNode('Start', { triggerType: 'manual' });
    const action = createActionNode('Action', { actionType: 'tool' });
    
    const workflow = createWorkflow('Connect Test', 'Test', 'user', [trigger, action]);
    const connection = connectNodes(workflow, trigger.id, action.id);
    
    expect(connection.fromNode).toBe(trigger.id);
    expect(connection.toNode).toBe(action.id);
    expect(trigger.nextNodes).toContain(action.id);
  });
});

describe('Workflow Execution', () => {
  it('should start execution', () => {
    const trigger = createTriggerNode('Start', { triggerType: 'manual' });
    const workflow = createWorkflow('Exec Test', 'Test', 'user', [trigger]);
    
    const execution = startExecution(workflow.id, { input: 'test' });
    expect(execution.status).toBe('running');
    expect(execution.variables.input).toBe('test');
  });

  it('should execute step', async () => {
    const trigger = createTriggerNode('Start', { triggerType: 'manual' });
    const action = createActionNode('Action', { actionType: 'tool', outputVariable: 'result' });
    trigger.nextNodes.push(action.id);
    
    const workflow = createWorkflow('Step Test', 'Test', 'user', [trigger, action]);
    workflow.connections.push({ id: 'c1', fromNode: trigger.id, toNode: action.id });
    
    const execution = startExecution(workflow.id);
    
    const afterStep = await executeStep(execution.id, async (node, vars) => {
      return { executed: true };
    });
    
    expect(afterStep.completedNodes.length).toBeGreaterThan(0);
  });

  it('should pause and resume execution', () => {
    const trigger = createTriggerNode('Start', { triggerType: 'manual' });
    const workflow = createWorkflow('Pause Test', 'Test', 'user', [trigger]);
    const execution = startExecution(workflow.id);
    
    pauseExecution(execution.id);
    expect(getExecution(execution.id)?.status).toBe('paused');
    
    resumeExecution(execution.id);
    expect(getExecution(execution.id)?.status).toBe('running');
  });

  it('should cancel execution', () => {
    const trigger = createTriggerNode('Start', { triggerType: 'manual' });
    const workflow = createWorkflow('Cancel Test', 'Test', 'user', [trigger]);
    const execution = startExecution(workflow.id);
    
    cancelExecution(execution.id);
    expect(getExecution(execution.id)?.status).toBe('cancelled');
  });
});

describe('Workflow Templates', () => {
  it('should have predefined templates', () => {
    expect(workflowTemplates.length).toBeGreaterThan(0);
  });

  it('should have required template properties', () => {
    for (const template of workflowTemplates) {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.nodes.length).toBeGreaterThan(0);
    }
  });

  it('should create workflow from template', () => {
    const workflow = createFromTemplate('lead-qualification', 'My Workflow', 'user');
    expect(workflow.nodes.length).toBeGreaterThan(0);
    expect(workflow.connections.length).toBeGreaterThan(0);
  });

  it('should assign unique IDs when creating from template', () => {
    const workflow1 = createFromTemplate('daily-digest', 'Workflow 1', 'user');
    const workflow2 = createFromTemplate('daily-digest', 'Workflow 2', 'user');
    
    expect(workflow1.nodes[0].id).not.toBe(workflow2.nodes[0].id);
  });
});
