/**
 * Enterprise Features
 * Exports for organization, RBAC, audit, and compliance
 */

export {
  // Types
  type Organization,
  type OrganizationSettings,
  type SSOConfig,
  type SubscriptionInfo,
  type Team,
  type TeamPermissions,
  type Permission,
  type Role,
  type UserRole,
  type AuditLogEntry,
  type ComplianceReport,
  type UsageAnalytics,
  
  // Organization
  createOrganization,
  addUserToOrg,
  removeUserFromOrg,
  getUserOrganizations,
  
  // Teams
  createTeam,
  getOrganizationTeams,
  
  // RBAC
  assignRole,
  hasPermission,
  getUserPermissions,
  
  // Audit logging
  logAuditEvent,
  getAuditLogs,
  
  // Compliance
  generateComplianceReport,
  
  // Analytics
  getUsageAnalytics,
} from "./organization";
