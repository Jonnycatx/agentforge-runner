/**
 * Enterprise Features
 * Teams, RBAC, audit logging, and compliance
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// ORGANIZATION & TEAMS
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  settings: OrganizationSettings;
  subscription: SubscriptionInfo;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  allowPublicAgents: boolean;
  requireApprovalForAgents: boolean;
  allowedProviders: string[];  // Whitelist of AI providers
  maxAgentsPerUser: number;
  maxToolsPerAgent: number;
  auditLogRetentionDays: number;
  ssoEnabled: boolean;
  ssoConfig?: SSOConfig;
  ipAllowlist?: string[];
}

export interface SSOConfig {
  provider: "saml" | "oidc";
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  oidcDiscoveryUrl?: string;
}

export interface SubscriptionInfo {
  plan: "free" | "pro" | "team" | "enterprise";
  status: "active" | "past_due" | "cancelled";
  seats: number;
  usedSeats: number;
  features: string[];
  billingEmail?: string;
  trialEndsAt?: string;
  renewsAt?: string;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  memberIds: string[];
  leaderId: string;
  permissions: TeamPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface TeamPermissions {
  canCreateAgents: boolean;
  canDeleteAgents: boolean;
  canShareAgents: boolean;
  canAccessAllAgents: boolean;
  canManageMembers: boolean;
  canViewAuditLogs: boolean;
  canManageCredentials: boolean;
}

// Storage
const organizations: Map<string, Organization> = new Map();
const orgTeams: Map<string, Team[]> = new Map();
const userOrgs: Map<string, string[]> = new Map();  // userId -> orgIds

/**
 * Create organization
 */
export function createOrganization(
  name: string,
  creatorId: string,
  plan: SubscriptionInfo["plan"] = "free"
): Organization {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  
  const org: Organization = {
    id: uuidv4(),
    name,
    slug,
    settings: {
      allowPublicAgents: false,
      requireApprovalForAgents: false,
      allowedProviders: ["openai", "anthropic", "groq", "ollama"],
      maxAgentsPerUser: plan === "free" ? 5 : plan === "pro" ? 20 : 100,
      maxToolsPerAgent: plan === "free" ? 10 : 50,
      auditLogRetentionDays: plan === "enterprise" ? 365 : 90,
      ssoEnabled: plan === "enterprise",
    },
    subscription: {
      plan,
      status: "active",
      seats: plan === "free" ? 1 : plan === "pro" ? 5 : plan === "team" ? 20 : 100,
      usedSeats: 1,
      features: getPlanFeatures(plan),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  organizations.set(org.id, org);
  
  // Add creator to org
  addUserToOrg(creatorId, org.id);
  
  return org;
}

function getPlanFeatures(plan: SubscriptionInfo["plan"]): string[] {
  const features = ["basic_agents", "chat_interface"];
  
  if (plan !== "free") {
    features.push("tool_integrations", "scheduling", "custom_templates");
  }
  if (plan === "team" || plan === "enterprise") {
    features.push("team_collaboration", "shared_knowledge_base", "workflows");
  }
  if (plan === "enterprise") {
    features.push("sso", "audit_logs", "compliance", "priority_support", "custom_integrations");
  }
  
  return features;
}

/**
 * Add user to organization
 */
export function addUserToOrg(userId: string, orgId: string): void {
  const userOrgList = userOrgs.get(userId) || [];
  if (!userOrgList.includes(orgId)) {
    userOrgList.push(orgId);
    userOrgs.set(userId, userOrgList);
    
    // Update seat count
    const org = organizations.get(orgId);
    if (org) {
      org.subscription.usedSeats++;
    }
  }
}

/**
 * Remove user from organization
 */
export function removeUserFromOrg(userId: string, orgId: string): void {
  const userOrgList = userOrgs.get(userId) || [];
  const index = userOrgList.indexOf(orgId);
  if (index !== -1) {
    userOrgList.splice(index, 1);
    userOrgs.set(userId, userOrgList);
    
    const org = organizations.get(orgId);
    if (org) {
      org.subscription.usedSeats--;
    }
  }
}

/**
 * Get user's organizations
 */
export function getUserOrganizations(userId: string): Organization[] {
  const orgIds = userOrgs.get(userId) || [];
  return orgIds
    .map(id => organizations.get(id))
    .filter((o): o is Organization => o !== undefined);
}

/**
 * Create team
 */
export function createTeam(
  orgId: string,
  name: string,
  leaderId: string,
  description?: string
): Team {
  const team: Team = {
    id: uuidv4(),
    organizationId: orgId,
    name,
    description,
    memberIds: [leaderId],
    leaderId,
    permissions: {
      canCreateAgents: true,
      canDeleteAgents: false,
      canShareAgents: true,
      canAccessAllAgents: false,
      canManageMembers: false,
      canViewAuditLogs: false,
      canManageCredentials: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const teams = orgTeams.get(orgId) || [];
  teams.push(team);
  orgTeams.set(orgId, teams);
  
  return team;
}

/**
 * Get organization teams
 */
export function getOrganizationTeams(orgId: string): Team[] {
  return orgTeams.get(orgId) || [];
}

// ============================================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================================

export type Permission = 
  | "agents:create"
  | "agents:read"
  | "agents:update"
  | "agents:delete"
  | "agents:run"
  | "agents:share"
  | "tools:manage"
  | "tools:execute"
  | "knowledge:create"
  | "knowledge:read"
  | "knowledge:update"
  | "knowledge:delete"
  | "workflows:create"
  | "workflows:read"
  | "workflows:update"
  | "workflows:delete"
  | "workflows:run"
  | "team:manage"
  | "team:view"
  | "org:manage"
  | "org:billing"
  | "audit:view"
  | "credentials:manage";

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;  // Built-in vs custom role
}

export interface UserRole {
  userId: string;
  roleId: string;
  scope: "organization" | "team" | "agent";
  scopeId: string;  // Org ID, Team ID, or Agent ID
  assignedAt: string;
  assignedBy: string;
}

// System roles
const systemRoles: Role[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Full access to organization",
    permissions: [
      "agents:create", "agents:read", "agents:update", "agents:delete", "agents:run", "agents:share",
      "tools:manage", "tools:execute",
      "knowledge:create", "knowledge:read", "knowledge:update", "knowledge:delete",
      "workflows:create", "workflows:read", "workflows:update", "workflows:delete", "workflows:run",
      "team:manage", "team:view",
      "org:manage", "org:billing",
      "audit:view", "credentials:manage",
    ],
    isSystem: true,
  },
  {
    id: "admin",
    name: "Admin",
    description: "Manage teams and agents",
    permissions: [
      "agents:create", "agents:read", "agents:update", "agents:delete", "agents:run", "agents:share",
      "tools:manage", "tools:execute",
      "knowledge:create", "knowledge:read", "knowledge:update", "knowledge:delete",
      "workflows:create", "workflows:read", "workflows:update", "workflows:delete", "workflows:run",
      "team:manage", "team:view",
      "audit:view", "credentials:manage",
    ],
    isSystem: true,
  },
  {
    id: "member",
    name: "Member",
    description: "Create and use agents",
    permissions: [
      "agents:create", "agents:read", "agents:update", "agents:run",
      "tools:execute",
      "knowledge:read",
      "workflows:read", "workflows:run",
      "team:view",
    ],
    isSystem: true,
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access",
    permissions: [
      "agents:read", "agents:run",
      "tools:execute",
      "knowledge:read",
      "workflows:read",
      "team:view",
    ],
    isSystem: true,
  },
];

const userRoles: Map<string, UserRole[]> = new Map();
const customRoles: Map<string, Role[]> = new Map();

/**
 * Assign role to user
 */
export function assignRole(
  userId: string,
  roleId: string,
  scope: UserRole["scope"],
  scopeId: string,
  assignedBy: string
): UserRole {
  const userRole: UserRole = {
    userId,
    roleId,
    scope,
    scopeId,
    assignedAt: new Date().toISOString(),
    assignedBy,
  };
  
  const roles = userRoles.get(userId) || [];
  roles.push(userRole);
  userRoles.set(userId, roles);
  
  return userRole;
}

/**
 * Check if user has permission
 */
export function hasPermission(
  userId: string,
  permission: Permission,
  scope: UserRole["scope"],
  scopeId: string
): boolean {
  const roles = userRoles.get(userId) || [];
  
  for (const userRole of roles) {
    if (userRole.scope !== scope || userRole.scopeId !== scopeId) continue;
    
    // Find the role definition
    const role = systemRoles.find(r => r.id === userRole.roleId) ||
      (customRoles.get(scopeId) || []).find(r => r.id === userRole.roleId);
    
    if (role?.permissions.includes(permission)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get user permissions for scope
 */
export function getUserPermissions(
  userId: string,
  scope: UserRole["scope"],
  scopeId: string
): Permission[] {
  const permissions = new Set<Permission>();
  const roles = userRoles.get(userId) || [];
  
  for (const userRole of roles) {
    if (userRole.scope !== scope || userRole.scopeId !== scopeId) continue;
    
    const role = systemRoles.find(r => r.id === userRole.roleId) ||
      (customRoles.get(scopeId) || []).find(r => r.id === userRole.roleId);
    
    if (role) {
      role.permissions.forEach(p => permissions.add(p));
    }
  }
  
  return Array.from(permissions);
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  organizationId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

const auditLogs: Map<string, AuditLogEntry[]> = new Map();

/**
 * Create audit log entry
 */
export function logAuditEvent(
  orgId: string,
  userId: string,
  action: string,
  resourceType: string,
  details: Record<string, any>,
  options?: {
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
  }
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    organizationId: orgId,
    userId,
    action,
    resourceType,
    resourceId: options?.resourceId,
    details,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
    success: options?.success ?? true,
    errorMessage: options?.errorMessage,
  };
  
  const logs = auditLogs.get(orgId) || [];
  logs.push(entry);
  
  // Enforce retention (in production, use database with TTL)
  const org = organizations.get(orgId);
  const retentionDays = org?.settings.auditLogRetentionDays || 90;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  
  auditLogs.set(
    orgId,
    logs.filter(l => new Date(l.timestamp) > cutoffDate)
  );
  
  return entry;
}

/**
 * Get audit logs
 */
export function getAuditLogs(
  orgId: string,
  options?: {
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): { logs: AuditLogEntry[]; total: number } {
  let logs = auditLogs.get(orgId) || [];
  
  // Apply filters
  if (options?.userId) {
    logs = logs.filter(l => l.userId === options.userId);
  }
  if (options?.action) {
    logs = logs.filter(l => l.action === options.action);
  }
  if (options?.resourceType) {
    logs = logs.filter(l => l.resourceType === options.resourceType);
  }
  if (options?.resourceId) {
    logs = logs.filter(l => l.resourceId === options.resourceId);
  }
  if (options?.startDate) {
    logs = logs.filter(l => l.timestamp >= options.startDate!);
  }
  if (options?.endDate) {
    logs = logs.filter(l => l.timestamp <= options.endDate!);
  }
  
  const total = logs.length;
  
  // Sort by timestamp descending
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Pagination
  const offset = options?.offset || 0;
  const limit = options?.limit || 50;
  logs = logs.slice(offset, offset + limit);
  
  return { logs, total };
}

// ============================================================================
// COMPLIANCE REPORTING
// ============================================================================

export interface ComplianceReport {
  id: string;
  organizationId: string;
  reportType: "activity" | "access" | "data" | "security";
  period: { start: string; end: string };
  generatedAt: string;
  summary: Record<string, any>;
  details: Record<string, any>[];
}

/**
 * Generate compliance report
 */
export function generateComplianceReport(
  orgId: string,
  reportType: ComplianceReport["reportType"],
  startDate: string,
  endDate: string
): ComplianceReport {
  const { logs } = getAuditLogs(orgId, { startDate, endDate, limit: 10000 });
  
  let summary: Record<string, any> = {};
  let details: Record<string, any>[] = [];
  
  switch (reportType) {
    case "activity":
      // User activity summary
      const userActivity: Record<string, number> = {};
      const actionCounts: Record<string, number> = {};
      
      for (const log of logs) {
        userActivity[log.userId] = (userActivity[log.userId] || 0) + 1;
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      }
      
      summary = {
        totalEvents: logs.length,
        uniqueUsers: Object.keys(userActivity).length,
        topActions: Object.entries(actionCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
      };
      
      details = logs.map(l => ({
        timestamp: l.timestamp,
        user: l.userId,
        action: l.action,
        resource: l.resourceType,
        success: l.success,
      }));
      break;
      
    case "access":
      // Access patterns
      const accessByResource: Record<string, number> = {};
      const failedAccess = logs.filter(l => !l.success);
      
      for (const log of logs) {
        const key = `${log.resourceType}:${log.action}`;
        accessByResource[key] = (accessByResource[key] || 0) + 1;
      }
      
      summary = {
        totalAccess: logs.length,
        failedAttempts: failedAccess.length,
        accessByResource: Object.entries(accessByResource)
          .sort((a, b) => b[1] - a[1]),
      };
      
      details = failedAccess.map(l => ({
        timestamp: l.timestamp,
        user: l.userId,
        action: l.action,
        error: l.errorMessage,
        ip: l.ipAddress,
      }));
      break;
      
    case "security":
      // Security events
      const securityEvents = logs.filter(l => 
        l.action.includes("login") ||
        l.action.includes("permission") ||
        l.action.includes("credential") ||
        !l.success
      );
      
      summary = {
        securityEvents: securityEvents.length,
        failedLogins: logs.filter(l => l.action === "login" && !l.success).length,
        permissionChanges: logs.filter(l => l.action.includes("permission")).length,
      };
      
      details = securityEvents.map(l => ({
        timestamp: l.timestamp,
        user: l.userId,
        event: l.action,
        success: l.success,
        ip: l.ipAddress,
      }));
      break;
      
    default:
      summary = { totalEvents: logs.length };
      details = logs;
  }
  
  return {
    id: uuidv4(),
    organizationId: orgId,
    reportType,
    period: { start: startDate, end: endDate },
    generatedAt: new Date().toISOString(),
    summary,
    details,
  };
}

// ============================================================================
// USAGE ANALYTICS
// ============================================================================

export interface UsageAnalytics {
  organizationId: string;
  period: { start: string; end: string };
  agents: {
    total: number;
    active: number;
    created: number;
  };
  tasks: {
    total: number;
    completed: number;
    failed: number;
    avgDuration: number;
  };
  tools: {
    totalExecutions: number;
    byTool: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
  };
  apiCalls: {
    total: number;
    byProvider: Record<string, number>;
    estimatedCost: number;
  };
}

/**
 * Get usage analytics
 */
export function getUsageAnalytics(
  orgId: string,
  startDate: string,
  endDate: string
): UsageAnalytics {
  const { logs } = getAuditLogs(orgId, { startDate, endDate, limit: 10000 });
  
  // Aggregate metrics
  const toolExecutions: Record<string, number> = {};
  const apiCalls: Record<string, number> = {};
  const activeUsers = new Set<string>();
  
  for (const log of logs) {
    activeUsers.add(log.userId);
    
    if (log.action === "tool:execute" && log.details.toolId) {
      toolExecutions[log.details.toolId] = (toolExecutions[log.details.toolId] || 0) + 1;
    }
    if (log.action === "api:call" && log.details.provider) {
      apiCalls[log.details.provider] = (apiCalls[log.details.provider] || 0) + 1;
    }
  }
  
  return {
    organizationId: orgId,
    period: { start: startDate, end: endDate },
    agents: {
      total: 0,  // Would query from database
      active: 0,
      created: logs.filter(l => l.action === "agent:create").length,
    },
    tasks: {
      total: logs.filter(l => l.resourceType === "task").length,
      completed: logs.filter(l => l.action === "task:complete").length,
      failed: logs.filter(l => l.action === "task:fail").length,
      avgDuration: 0,  // Would calculate from task data
    },
    tools: {
      totalExecutions: Object.values(toolExecutions).reduce((a, b) => a + b, 0),
      byTool: toolExecutions,
    },
    users: {
      total: 0,  // Would query from database
      active: activeUsers.size,
    },
    apiCalls: {
      total: Object.values(apiCalls).reduce((a, b) => a + b, 0),
      byProvider: apiCalls,
      estimatedCost: 0,  // Would calculate based on pricing
    },
  };
}
