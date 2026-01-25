/**
 * Enterprise Features Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createOrganization,
  addUserToOrg,
  removeUserFromOrg,
  getUserOrganizations,
  createTeam,
  getOrganizationTeams,
  assignRole,
  hasPermission,
  getUserPermissions,
  logAuditEvent,
  getAuditLogs,
  generateComplianceReport,
  getUsageAnalytics,
} from '../enterprise/organization';

describe('Organization Management', () => {
  const userId = 'test-user-1';

  it('should create organization', () => {
    const org = createOrganization('Test Org', userId);
    expect(org.id).toBeDefined();
    expect(org.name).toBe('Test Org');
    expect(org.subscription.status).toBe('active');
  });

  it('should create organization with plan', () => {
    const proOrg = createOrganization('Pro Org', userId, 'pro');
    expect(proOrg.subscription.plan).toBe('pro');
    expect(proOrg.settings.maxAgentsPerUser).toBe(20);
    
    const enterpriseOrg = createOrganization('Enterprise Org', userId, 'enterprise');
    expect(enterpriseOrg.subscription.plan).toBe('enterprise');
    expect(enterpriseOrg.settings.ssoEnabled).toBe(true);
  });

  it('should add user to organization', () => {
    const org = createOrganization('Add User Org', userId);
    const newUser = 'new-user-1';
    addUserToOrg(newUser, org.id);
    
    const orgs = getUserOrganizations(newUser);
    expect(orgs.some(o => o.id === org.id)).toBe(true);
  });

  it('should remove user from organization', () => {
    const org = createOrganization('Remove User Org', userId);
    const userToRemove = 'user-to-remove';
    addUserToOrg(userToRemove, org.id);
    removeUserFromOrg(userToRemove, org.id);
    
    const orgs = getUserOrganizations(userToRemove);
    expect(orgs.some(o => o.id === org.id)).toBe(false);
  });

  it('should get user organizations', () => {
    const org1 = createOrganization('Multi Org 1', userId);
    const org2 = createOrganization('Multi Org 2', userId);
    
    const orgs = getUserOrganizations(userId);
    expect(orgs.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Team Management', () => {
  it('should create team', () => {
    const org = createOrganization('Team Org', 'owner');
    const team = createTeam(org.id, 'Dev Team', 'owner', 'Development team');
    
    expect(team.id).toBeDefined();
    expect(team.name).toBe('Dev Team');
    expect(team.leaderId).toBe('owner');
  });

  it('should get organization teams', () => {
    const org = createOrganization('Teams Org', 'owner');
    createTeam(org.id, 'Team 1', 'owner');
    createTeam(org.id, 'Team 2', 'owner');
    
    const teams = getOrganizationTeams(org.id);
    expect(teams.length).toBe(2);
  });

  it('should have default permissions', () => {
    const org = createOrganization('Perms Org', 'owner');
    const team = createTeam(org.id, 'Team', 'owner');
    
    expect(team.permissions.canCreateAgents).toBe(true);
    expect(team.permissions.canDeleteAgents).toBe(false);
  });
});

describe('Role-Based Access Control', () => {
  const orgOwner = 'rbac-owner';
  const member = 'rbac-member';

  it('should assign role', () => {
    const org = createOrganization('RBAC Org', orgOwner);
    const role = assignRole(member, 'member', 'organization', org.id, orgOwner);
    
    expect(role.roleId).toBe('member');
    expect(role.scope).toBe('organization');
  });

  it('should check permission', () => {
    const org = createOrganization('Permission Org', orgOwner);
    assignRole(member, 'member', 'organization', org.id, orgOwner);
    
    const canCreate = hasPermission(member, 'agents:create', 'organization', org.id);
    const canManage = hasPermission(member, 'org:manage', 'organization', org.id);
    
    expect(canCreate).toBe(true);
    expect(canManage).toBe(false);
  });

  it('should get user permissions', () => {
    const org = createOrganization('Get Perms Org', orgOwner);
    assignRole(member, 'admin', 'organization', org.id, orgOwner);
    
    const permissions = getUserPermissions(member, 'organization', org.id);
    expect(permissions).toContain('agents:create');
    expect(permissions).toContain('team:manage');
  });

  it('should return false for unauthorized', () => {
    const org = createOrganization('Unauth Org', orgOwner);
    const unauthorized = 'unauthorized-user';
    
    const result = hasPermission(unauthorized, 'agents:create', 'organization', org.id);
    expect(result).toBe(false);
  });
});

describe('Audit Logging', () => {
  it('should log audit event', () => {
    const org = createOrganization('Audit Org', 'owner');
    const event = logAuditEvent(
      org.id,
      'owner',
      'agent:create',
      'agent',
      { agentName: 'Test Agent' },
      { resourceId: 'agent-1' }
    );
    
    expect(event.id).toBeDefined();
    expect(event.action).toBe('agent:create');
  });

  it('should get audit logs', () => {
    const org = createOrganization('Get Audit Org', 'owner');
    logAuditEvent(org.id, 'owner', 'action1', 'resource', {});
    logAuditEvent(org.id, 'owner', 'action2', 'resource', {});
    
    const { logs, total } = getAuditLogs(org.id);
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter audit logs', () => {
    const org = createOrganization('Filter Audit Org', 'owner');
    logAuditEvent(org.id, 'user-a', 'create', 'agent', {});
    logAuditEvent(org.id, 'user-b', 'delete', 'agent', {});
    
    const { logs } = getAuditLogs(org.id, { userId: 'user-a' });
    expect(logs.every(l => l.userId === 'user-a')).toBe(true);
  });

  it('should log failures', () => {
    const org = createOrganization('Fail Audit Org', 'owner');
    const event = logAuditEvent(
      org.id,
      'owner',
      'unauthorized_action',
      'resource',
      {},
      { success: false, errorMessage: 'Permission denied' }
    );
    
    expect(event.success).toBe(false);
    expect(event.errorMessage).toBe('Permission denied');
  });
});

describe('Compliance Reporting', () => {
  it('should generate activity report', () => {
    const org = createOrganization('Report Org', 'owner');
    logAuditEvent(org.id, 'owner', 'action', 'resource', {});
    
    const report = generateComplianceReport(
      org.id,
      'activity',
      new Date(Date.now() - 86400000).toISOString(),
      new Date().toISOString()
    );
    
    expect(report.reportType).toBe('activity');
    expect(report.summary.totalEvents).toBeGreaterThanOrEqual(1);
  });

  it('should generate access report', () => {
    const org = createOrganization('Access Report Org', 'owner');
    logAuditEvent(org.id, 'owner', 'login', 'user', {}, { success: true });
    logAuditEvent(org.id, 'owner', 'login', 'user', {}, { success: false, errorMessage: 'Bad password' });
    
    const report = generateComplianceReport(
      org.id,
      'access',
      new Date(Date.now() - 86400000).toISOString(),
      new Date().toISOString()
    );
    
    expect(report.reportType).toBe('access');
    expect(report.summary.failedAttempts).toBeGreaterThanOrEqual(1);
  });
});

describe('Usage Analytics', () => {
  it('should generate usage analytics', () => {
    const org = createOrganization('Analytics Org', 'owner');
    logAuditEvent(org.id, 'owner', 'tool:execute', 'tool', { toolId: 'calculator' });
    logAuditEvent(org.id, 'owner', 'agent:create', 'agent', {});
    
    const analytics = getUsageAnalytics(
      org.id,
      new Date(Date.now() - 86400000).toISOString(),
      new Date().toISOString()
    );
    
    expect(analytics.organizationId).toBe(org.id);
    expect(analytics.users.active).toBeGreaterThanOrEqual(1);
  });
});
