/**
 * Multi-Agent Coordination System
 * Enables agents to communicate, delegate tasks, and work as teams
 */

import { v4 as uuidv4 } from "uuid";

// Agent message types
export type MessageType = 
  | "request"      // Ask another agent to do something
  | "response"     // Reply to a request
  | "delegate"     // Hand off a task
  | "notify"       // Inform without expecting response
  | "broadcast"    // Send to all agents in team
  | "status"       // Status update
  | "error";       // Error notification

// Agent message
export interface AgentMessage {
  id: string;
  type: MessageType;
  fromAgentId: string;
  toAgentId: string | "all";  // "all" for broadcast
  subject: string;
  content: any;
  context?: SharedContext;
  replyTo?: string;  // ID of message being replied to
  priority: "low" | "normal" | "high" | "urgent";
  timestamp: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

// Shared context between agents
export interface SharedContext {
  id: string;
  name: string;
  data: Record<string, any>;
  createdBy: string;
  sharedWith: string[];
  version: number;
  lastUpdated: string;
}

// Delegation request
export interface DelegationRequest {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  taskType: string;
  taskInput: any;
  reason: string;
  priority: "low" | "normal" | "high" | "urgent";
  deadline?: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "failed";
  result?: any;
  createdAt: string;
  completedAt?: string;
}

// Agent team
export interface AgentTeam {
  id: string;
  name: string;
  description: string;
  leadAgentId: string;
  memberAgentIds: string[];
  sharedContextIds: string[];
  workflows: string[];
  createdAt: string;
  updatedAt: string;
}

// Resource lock for conflict resolution
export interface ResourceLock {
  resourceId: string;
  resourceType: string;
  lockedBy: string;  // Agent ID
  lockedAt: string;
  expiresAt: string;
  reason?: string;
}

// Message queue (in-memory, would use Redis/DB in production)
const messageQueues: Map<string, AgentMessage[]> = new Map();
const sharedContexts: Map<string, SharedContext> = new Map();
const delegations: Map<string, DelegationRequest> = new Map();
const teams: Map<string, AgentTeam> = new Map();
const resourceLocks: Map<string, ResourceLock> = new Map();

// ============================================================================
// MESSAGE SYSTEM
// ============================================================================

/**
 * Send a message to another agent
 */
export function sendMessage(message: Omit<AgentMessage, "id" | "timestamp">): AgentMessage {
  const fullMessage: AgentMessage = {
    ...message,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  
  if (message.toAgentId === "all") {
    // Broadcast to all agents in sender's teams
    const senderTeams = getAgentTeams(message.fromAgentId);
    const recipients = new Set<string>();
    
    for (const team of senderTeams) {
      for (const memberId of team.memberAgentIds) {
        if (memberId !== message.fromAgentId) {
          recipients.add(memberId);
        }
      }
    }
    
    for (const recipientId of recipients) {
      const queue = messageQueues.get(recipientId) || [];
      queue.push({ ...fullMessage, toAgentId: recipientId });
      messageQueues.set(recipientId, queue);
    }
  } else {
    const queue = messageQueues.get(message.toAgentId) || [];
    queue.push(fullMessage);
    messageQueues.set(message.toAgentId, queue);
  }
  
  return fullMessage;
}

/**
 * Get messages for an agent
 */
export function getMessages(
  agentId: string,
  options?: {
    type?: MessageType;
    unreadOnly?: boolean;
    limit?: number;
  }
): AgentMessage[] {
  let messages = messageQueues.get(agentId) || [];
  
  if (options?.type) {
    messages = messages.filter(m => m.type === options.type);
  }
  
  if (options?.limit) {
    messages = messages.slice(0, options.limit);
  }
  
  return messages;
}

/**
 * Mark messages as read (remove from queue)
 */
export function acknowledgeMessages(agentId: string, messageIds: string[]): void {
  const queue = messageQueues.get(agentId) || [];
  messageQueues.set(
    agentId,
    queue.filter(m => !messageIds.includes(m.id))
  );
}

/**
 * Reply to a message
 */
export function replyToMessage(
  originalMessage: AgentMessage,
  response: any,
  type: MessageType = "response"
): AgentMessage {
  return sendMessage({
    type,
    fromAgentId: originalMessage.toAgentId as string,
    toAgentId: originalMessage.fromAgentId,
    subject: `Re: ${originalMessage.subject}`,
    content: response,
    replyTo: originalMessage.id,
    priority: originalMessage.priority,
    context: originalMessage.context,
  });
}

// ============================================================================
// SHARED CONTEXT
// ============================================================================

/**
 * Create a shared context
 */
export function createSharedContext(
  name: string,
  createdBy: string,
  initialData: Record<string, any> = {},
  sharedWith: string[] = []
): SharedContext {
  const context: SharedContext = {
    id: uuidv4(),
    name,
    data: initialData,
    createdBy,
    sharedWith: [createdBy, ...sharedWith],
    version: 1,
    lastUpdated: new Date().toISOString(),
  };
  
  sharedContexts.set(context.id, context);
  return context;
}

/**
 * Update shared context
 */
export function updateSharedContext(
  contextId: string,
  agentId: string,
  updates: Record<string, any>
): SharedContext | null {
  const context = sharedContexts.get(contextId);
  if (!context) return null;
  
  // Check if agent has access
  if (!context.sharedWith.includes(agentId)) {
    throw new Error("Agent does not have access to this context");
  }
  
  // Merge updates
  context.data = { ...context.data, ...updates };
  context.version += 1;
  context.lastUpdated = new Date().toISOString();
  
  // Notify other agents of the update
  for (const otherAgentId of context.sharedWith) {
    if (otherAgentId !== agentId) {
      sendMessage({
        type: "notify",
        fromAgentId: agentId,
        toAgentId: otherAgentId,
        subject: `Context "${context.name}" updated`,
        content: { contextId, updates, version: context.version },
        priority: "normal",
      });
    }
  }
  
  return context;
}

/**
 * Get shared context
 */
export function getSharedContext(contextId: string, agentId: string): SharedContext | null {
  const context = sharedContexts.get(contextId);
  if (!context) return null;
  
  if (!context.sharedWith.includes(agentId)) {
    throw new Error("Agent does not have access to this context");
  }
  
  return context;
}

/**
 * Share context with additional agents
 */
export function shareContextWith(
  contextId: string,
  ownerAgentId: string,
  newAgentIds: string[]
): void {
  const context = sharedContexts.get(contextId);
  if (!context) throw new Error("Context not found");
  
  if (context.createdBy !== ownerAgentId) {
    throw new Error("Only the creator can share this context");
  }
  
  context.sharedWith = [...new Set([...context.sharedWith, ...newAgentIds])];
  
  // Notify new agents
  for (const agentId of newAgentIds) {
    sendMessage({
      type: "notify",
      fromAgentId: ownerAgentId,
      toAgentId: agentId,
      subject: `You now have access to context "${context.name}"`,
      content: { contextId, name: context.name },
      priority: "normal",
    });
  }
}

// ============================================================================
// DELEGATION
// ============================================================================

/**
 * Delegate a task to another agent
 */
export function delegateTask(
  fromAgentId: string,
  toAgentId: string,
  taskType: string,
  taskInput: any,
  reason: string,
  options?: {
    priority?: DelegationRequest["priority"];
    deadline?: string;
  }
): DelegationRequest {
  const delegation: DelegationRequest = {
    id: uuidv4(),
    fromAgentId,
    toAgentId,
    taskType,
    taskInput,
    reason,
    priority: options?.priority || "normal",
    deadline: options?.deadline,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  
  delegations.set(delegation.id, delegation);
  
  // Send delegation message
  sendMessage({
    type: "delegate",
    fromAgentId,
    toAgentId,
    subject: `Task delegation: ${taskType}`,
    content: delegation,
    priority: delegation.priority,
  });
  
  return delegation;
}

/**
 * Accept a delegated task
 */
export function acceptDelegation(delegationId: string, agentId: string): DelegationRequest {
  const delegation = delegations.get(delegationId);
  if (!delegation) throw new Error("Delegation not found");
  
  if (delegation.toAgentId !== agentId) {
    throw new Error("This delegation is not assigned to you");
  }
  
  delegation.status = "accepted";
  
  // Notify the delegator
  sendMessage({
    type: "status",
    fromAgentId: agentId,
    toAgentId: delegation.fromAgentId,
    subject: `Delegation accepted: ${delegation.taskType}`,
    content: { delegationId, status: "accepted" },
    priority: "normal",
  });
  
  return delegation;
}

/**
 * Reject a delegated task
 */
export function rejectDelegation(
  delegationId: string,
  agentId: string,
  reason: string
): DelegationRequest {
  const delegation = delegations.get(delegationId);
  if (!delegation) throw new Error("Delegation not found");
  
  if (delegation.toAgentId !== agentId) {
    throw new Error("This delegation is not assigned to you");
  }
  
  delegation.status = "rejected";
  
  // Notify the delegator
  sendMessage({
    type: "status",
    fromAgentId: agentId,
    toAgentId: delegation.fromAgentId,
    subject: `Delegation rejected: ${delegation.taskType}`,
    content: { delegationId, status: "rejected", reason },
    priority: "high",
  });
  
  return delegation;
}

/**
 * Complete a delegated task
 */
export function completeDelegation(
  delegationId: string,
  agentId: string,
  result: any
): DelegationRequest {
  const delegation = delegations.get(delegationId);
  if (!delegation) throw new Error("Delegation not found");
  
  if (delegation.toAgentId !== agentId) {
    throw new Error("This delegation is not assigned to you");
  }
  
  delegation.status = "completed";
  delegation.result = result;
  delegation.completedAt = new Date().toISOString();
  
  // Notify the delegator
  sendMessage({
    type: "response",
    fromAgentId: agentId,
    toAgentId: delegation.fromAgentId,
    subject: `Delegation completed: ${delegation.taskType}`,
    content: { delegationId, status: "completed", result },
    priority: "normal",
  });
  
  return delegation;
}

/**
 * Get delegations for an agent
 */
export function getDelegations(
  agentId: string,
  direction: "incoming" | "outgoing" | "both" = "both"
): DelegationRequest[] {
  const allDelegations = Array.from(delegations.values());
  
  switch (direction) {
    case "incoming":
      return allDelegations.filter(d => d.toAgentId === agentId);
    case "outgoing":
      return allDelegations.filter(d => d.fromAgentId === agentId);
    default:
      return allDelegations.filter(
        d => d.toAgentId === agentId || d.fromAgentId === agentId
      );
  }
}

// ============================================================================
// TEAMS
// ============================================================================

/**
 * Create an agent team
 */
export function createTeam(
  name: string,
  description: string,
  leadAgentId: string,
  memberAgentIds: string[] = []
): AgentTeam {
  const team: AgentTeam = {
    id: uuidv4(),
    name,
    description,
    leadAgentId,
    memberAgentIds: [leadAgentId, ...memberAgentIds],
    sharedContextIds: [],
    workflows: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  teams.set(team.id, team);
  
  // Notify all members
  for (const memberId of team.memberAgentIds) {
    if (memberId !== leadAgentId) {
      sendMessage({
        type: "notify",
        fromAgentId: leadAgentId,
        toAgentId: memberId,
        subject: `You've been added to team "${name}"`,
        content: { teamId: team.id, name, leadAgentId },
        priority: "normal",
      });
    }
  }
  
  return team;
}

/**
 * Add agent to team
 */
export function addToTeam(teamId: string, agentId: string, addedBy: string): void {
  const team = teams.get(teamId);
  if (!team) throw new Error("Team not found");
  
  if (!team.memberAgentIds.includes(agentId)) {
    team.memberAgentIds.push(agentId);
    team.updatedAt = new Date().toISOString();
    
    // Notify the new member
    sendMessage({
      type: "notify",
      fromAgentId: addedBy,
      toAgentId: agentId,
      subject: `You've been added to team "${team.name}"`,
      content: { teamId, name: team.name, members: team.memberAgentIds },
      priority: "normal",
    });
  }
}

/**
 * Remove agent from team
 */
export function removeFromTeam(teamId: string, agentId: string, removedBy: string): void {
  const team = teams.get(teamId);
  if (!team) throw new Error("Team not found");
  
  if (agentId === team.leadAgentId) {
    throw new Error("Cannot remove the team lead");
  }
  
  team.memberAgentIds = team.memberAgentIds.filter(id => id !== agentId);
  team.updatedAt = new Date().toISOString();
  
  // Notify the removed member
  sendMessage({
    type: "notify",
    fromAgentId: removedBy,
    toAgentId: agentId,
    subject: `You've been removed from team "${team.name}"`,
    content: { teamId, name: team.name },
    priority: "normal",
  });
}

/**
 * Get teams an agent belongs to
 */
export function getAgentTeams(agentId: string): AgentTeam[] {
  return Array.from(teams.values()).filter(
    team => team.memberAgentIds.includes(agentId)
  );
}

/**
 * Broadcast message to team
 */
export function broadcastToTeam(
  teamId: string,
  fromAgentId: string,
  subject: string,
  content: any
): void {
  const team = teams.get(teamId);
  if (!team) throw new Error("Team not found");
  
  if (!team.memberAgentIds.includes(fromAgentId)) {
    throw new Error("You are not a member of this team");
  }
  
  for (const memberId of team.memberAgentIds) {
    if (memberId !== fromAgentId) {
      sendMessage({
        type: "broadcast",
        fromAgentId,
        toAgentId: memberId,
        subject: `[${team.name}] ${subject}`,
        content,
        priority: "normal",
        metadata: { teamId },
      });
    }
  }
}

// ============================================================================
// RESOURCE LOCKING (Conflict Resolution)
// ============================================================================

/**
 * Try to acquire a lock on a resource
 */
export function acquireLock(
  resourceId: string,
  resourceType: string,
  agentId: string,
  ttlSeconds: number = 60,
  reason?: string
): ResourceLock | null {
  const existingLock = resourceLocks.get(resourceId);
  
  // Check if there's an existing valid lock
  if (existingLock) {
    const expiresAt = new Date(existingLock.expiresAt);
    if (expiresAt > new Date() && existingLock.lockedBy !== agentId) {
      // Lock is held by another agent
      return null;
    }
  }
  
  // Create new lock
  const lock: ResourceLock = {
    resourceId,
    resourceType,
    lockedBy: agentId,
    lockedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    reason,
  };
  
  resourceLocks.set(resourceId, lock);
  return lock;
}

/**
 * Release a lock
 */
export function releaseLock(resourceId: string, agentId: string): boolean {
  const lock = resourceLocks.get(resourceId);
  
  if (!lock || lock.lockedBy !== agentId) {
    return false;
  }
  
  resourceLocks.delete(resourceId);
  return true;
}

/**
 * Check if a resource is locked
 */
export function isLocked(resourceId: string): ResourceLock | null {
  const lock = resourceLocks.get(resourceId);
  
  if (!lock) return null;
  
  // Check if lock has expired
  if (new Date(lock.expiresAt) <= new Date()) {
    resourceLocks.delete(resourceId);
    return null;
  }
  
  return lock;
}

// ============================================================================
// TEAM TEMPLATES
// ============================================================================

export interface TeamTemplate {
  id: string;
  name: string;
  description: string;
  roles: {
    role: string;
    employeeType: string;
    responsibilities: string[];
  }[];
  workflows: string[];
}

export const teamTemplates: TeamTemplate[] = [
  {
    id: "sales-team",
    name: "Sales Team",
    description: "Complete sales operation with research, outreach, and support",
    roles: [
      {
        role: "Lead",
        employeeType: "sales-agent",
        responsibilities: ["Strategy", "Deal closing", "Team coordination"],
      },
      {
        role: "Researcher",
        employeeType: "research-agent",
        responsibilities: ["Lead research", "Competitor analysis", "Market intelligence"],
      },
      {
        role: "Outreach",
        employeeType: "email-agent",
        responsibilities: ["Cold outreach", "Follow-ups", "Email sequences"],
      },
    ],
    workflows: ["lead-qualification", "outreach-sequence", "deal-pipeline"],
  },
  {
    id: "content-team",
    name: "Content Team",
    description: "Content creation and distribution pipeline",
    roles: [
      {
        role: "Lead",
        employeeType: "pm-agent",
        responsibilities: ["Content calendar", "Task assignment", "Quality review"],
      },
      {
        role: "Researcher",
        employeeType: "research-agent",
        responsibilities: ["Topic research", "SEO analysis", "Competitor content"],
      },
      {
        role: "Social",
        employeeType: "social-media-agent",
        responsibilities: ["Platform posting", "Engagement", "Analytics"],
      },
    ],
    workflows: ["content-pipeline", "social-publishing", "analytics-report"],
  },
  {
    id: "support-team",
    name: "Customer Support Team",
    description: "Multi-tier customer support with escalation",
    roles: [
      {
        role: "Tier 1",
        employeeType: "support-agent",
        responsibilities: ["Initial response", "FAQ handling", "Ticket routing"],
      },
      {
        role: "Tier 2",
        employeeType: "support-agent",
        responsibilities: ["Complex issues", "Technical support", "Escalation handling"],
      },
      {
        role: "Analyst",
        employeeType: "data-agent",
        responsibilities: ["Ticket analysis", "Trend detection", "Report generation"],
      },
    ],
    workflows: ["ticket-triage", "escalation-flow", "satisfaction-survey"],
  },
  {
    id: "finance-team",
    name: "Finance Team",
    description: "Financial operations and reporting",
    roles: [
      {
        role: "Lead",
        employeeType: "financial-agent",
        responsibilities: ["Financial strategy", "Budget oversight", "Reporting"],
      },
      {
        role: "Analyst",
        employeeType: "data-agent",
        responsibilities: ["Data analysis", "Forecasting", "Variance analysis"],
      },
      {
        role: "Trader",
        employeeType: "trading-agent",
        responsibilities: ["Market monitoring", "Portfolio tracking", "Alerts"],
      },
    ],
    workflows: ["monthly-close", "expense-processing", "financial-reporting"],
  },
];

/**
 * Create team from template
 */
export function createTeamFromTemplate(
  templateId: string,
  teamName: string,
  leadAgentId: string,
  agentMappings: Record<string, string>  // role -> agentId
): AgentTeam {
  const template = teamTemplates.find(t => t.id === templateId);
  if (!template) throw new Error("Template not found");
  
  const memberIds = Object.values(agentMappings);
  if (!memberIds.includes(leadAgentId)) {
    memberIds.push(leadAgentId);
  }
  
  return createTeam(teamName, template.description, leadAgentId, memberIds);
}
