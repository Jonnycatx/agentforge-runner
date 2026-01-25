/**
 * Multi-Agent Coordination Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  sendMessage,
  getMessages,
  acknowledgeMessages,
  replyToMessage,
  createSharedContext,
  updateSharedContext,
  getSharedContext,
  shareContextWith,
  delegateTask,
  acceptDelegation,
  rejectDelegation,
  completeDelegation,
  getDelegations,
  createTeam,
  addToTeam,
  removeFromTeam,
  getAgentTeams,
  broadcastToTeam,
  acquireLock,
  releaseLock,
  isLocked,
  teamTemplates,
  createTeamFromTemplate,
} from '../multi-agent/coordinator';

describe('Message System', () => {
  const agentA = 'agent-a';
  const agentB = 'agent-b';

  it('should send message between agents', () => {
    const message = sendMessage({
      type: 'request',
      fromAgentId: agentA,
      toAgentId: agentB,
      subject: 'Test message',
      content: { data: 'hello' },
      priority: 'normal',
    });

    expect(message.id).toBeDefined();
    expect(message.timestamp).toBeDefined();
  });

  it('should receive messages', () => {
    sendMessage({
      type: 'notify',
      fromAgentId: agentA,
      toAgentId: agentB,
      subject: 'Notification',
      content: { info: 'test' },
      priority: 'normal',
    });

    const messages = getMessages(agentB);
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should filter messages by type', () => {
    const messages = getMessages(agentB, { type: 'notify' });
    expect(messages.every(m => m.type === 'notify')).toBe(true);
  });

  it('should acknowledge and remove messages', () => {
    const before = getMessages(agentB);
    const toAck = before.slice(0, 1).map(m => m.id);
    acknowledgeMessages(agentB, toAck);
    const after = getMessages(agentB);
    expect(after.some(m => toAck.includes(m.id))).toBe(false);
  });

  it('should reply to messages', () => {
    const original = sendMessage({
      type: 'request',
      fromAgentId: agentA,
      toAgentId: agentB,
      subject: 'Question',
      content: { question: 'test?' },
      priority: 'normal',
    });

    const reply = replyToMessage(original, { answer: 'yes' });
    expect(reply.replyTo).toBe(original.id);
    expect(reply.toAgentId).toBe(agentA);
  });
});

describe('Shared Context', () => {
  const agentA = 'context-agent-a';
  const agentB = 'context-agent-b';

  it('should create shared context', () => {
    const context = createSharedContext('Test Context', agentA, { key: 'value' });
    expect(context.id).toBeDefined();
    expect(context.data.key).toBe('value');
    expect(context.version).toBe(1);
  });

  it('should update shared context', () => {
    const context = createSharedContext('Update Test', agentA, { count: 1 });
    const updated = updateSharedContext(context.id, agentA, { count: 2 });
    expect(updated?.data.count).toBe(2);
    expect(updated?.version).toBe(2);
  });

  it('should retrieve shared context', () => {
    const context = createSharedContext('Retrieve Test', agentA, { data: 'test' });
    const retrieved = getSharedContext(context.id, agentA);
    expect(retrieved?.id).toBe(context.id);
  });

  it('should share context with other agents', () => {
    const context = createSharedContext('Share Test', agentA, {});
    shareContextWith(context.id, agentA, [agentB]);
    const retrieved = getSharedContext(context.id, agentB);
    expect(retrieved).not.toBeNull();
  });

  it('should deny access to unauthorized agents', () => {
    const context = createSharedContext('Private Context', agentA, {});
    expect(() => getSharedContext(context.id, 'unauthorized-agent')).toThrow();
  });
});

describe('Delegation System', () => {
  const delegator = 'delegator-agent';
  const delegatee = 'delegatee-agent';

  it('should create delegation', () => {
    const delegation = delegateTask(
      delegator,
      delegatee,
      'research',
      { topic: 'AI' },
      'Need expertise in this area'
    );
    expect(delegation.id).toBeDefined();
    expect(delegation.status).toBe('pending');
  });

  it('should accept delegation', () => {
    const delegation = delegateTask(delegator, delegatee, 'analysis', {}, 'test');
    const accepted = acceptDelegation(delegation.id, delegatee);
    expect(accepted.status).toBe('accepted');
  });

  it('should reject delegation', () => {
    const delegation = delegateTask(delegator, delegatee, 'complex-task', {}, 'test');
    const rejected = rejectDelegation(delegation.id, delegatee, 'Too busy');
    expect(rejected.status).toBe('rejected');
  });

  it('should complete delegation', () => {
    const delegation = delegateTask(delegator, delegatee, 'simple-task', {}, 'test');
    acceptDelegation(delegation.id, delegatee);
    const completed = completeDelegation(delegation.id, delegatee, { result: 'done' });
    expect(completed.status).toBe('completed');
    expect(completed.result).toEqual({ result: 'done' });
  });

  it('should get delegations by direction', () => {
    delegateTask(delegator, delegatee, 'outgoing-test', {}, 'test');
    
    const outgoing = getDelegations(delegator, 'outgoing');
    expect(outgoing.some(d => d.fromAgentId === delegator)).toBe(true);
    
    const incoming = getDelegations(delegatee, 'incoming');
    expect(incoming.some(d => d.toAgentId === delegatee)).toBe(true);
  });
});

describe('Team System', () => {
  const leader = 'team-leader';
  const member1 = 'team-member-1';
  const member2 = 'team-member-2';

  it('should create team', () => {
    const team = createTeam('Test Team', 'A test team', leader);
    expect(team.id).toBeDefined();
    expect(team.leadAgentId).toBe(leader);
    expect(team.memberAgentIds).toContain(leader);
  });

  it('should add member to team', () => {
    const team = createTeam('Add Member Test', 'Test', leader);
    addToTeam(team.id, member1, leader);
    const teams = getAgentTeams(member1);
    expect(teams.some(t => t.id === team.id)).toBe(true);
  });

  it('should remove member from team', () => {
    const team = createTeam('Remove Test', 'Test', leader, [member1]);
    removeFromTeam(team.id, member1, leader);
    const teams = getAgentTeams(member1);
    expect(teams.some(t => t.id === team.id)).toBe(false);
  });

  it('should not remove team leader', () => {
    const team = createTeam('Leader Test', 'Test', leader);
    expect(() => removeFromTeam(team.id, leader, leader)).toThrow();
  });

  it('should have team templates', () => {
    expect(teamTemplates.length).toBeGreaterThan(0);
    expect(teamTemplates.every(t => t.roles.length > 0)).toBe(true);
  });

  it('should create team from template', () => {
    const team = createTeamFromTemplate(
      'sales-team',
      'My Sales Team',
      leader,
      { 'Lead': leader, 'Researcher': member1 }
    );
    expect(team.name).toBe('My Sales Team');
  });
});

describe('Resource Locking', () => {
  const agentA = 'lock-agent-a';
  const agentB = 'lock-agent-b';

  it('should acquire lock', () => {
    const lock = acquireLock('resource-1', 'document', agentA, 60);
    expect(lock).not.toBeNull();
    expect(lock?.lockedBy).toBe(agentA);
  });

  it('should prevent other agents from acquiring lock', () => {
    acquireLock('resource-2', 'document', agentA, 60);
    const secondLock = acquireLock('resource-2', 'document', agentB, 60);
    expect(secondLock).toBeNull();
  });

  it('should release lock', () => {
    acquireLock('resource-3', 'document', agentA, 60);
    const released = releaseLock('resource-3', agentA);
    expect(released).toBe(true);
    
    const newLock = acquireLock('resource-3', 'document', agentB, 60);
    expect(newLock).not.toBeNull();
  });

  it('should check if resource is locked', () => {
    acquireLock('resource-4', 'document', agentA, 60);
    const lockStatus = isLocked('resource-4');
    expect(lockStatus).not.toBeNull();
    expect(lockStatus?.lockedBy).toBe(agentA);
  });

  it('should allow same agent to re-acquire lock', () => {
    acquireLock('resource-5', 'document', agentA, 60);
    const newLock = acquireLock('resource-5', 'document', agentA, 60);
    expect(newLock).not.toBeNull();
  });
});
