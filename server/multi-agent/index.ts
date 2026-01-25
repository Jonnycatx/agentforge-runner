/**
 * Multi-Agent Coordination System
 * Exports for agent-to-agent communication and team management
 */

export {
  // Types
  type MessageType,
  type AgentMessage,
  type SharedContext,
  type DelegationRequest,
  type AgentTeam,
  type ResourceLock,
  type TeamTemplate,
  
  // Message system
  sendMessage,
  getMessages,
  acknowledgeMessages,
  replyToMessage,
  
  // Shared context
  createSharedContext,
  updateSharedContext,
  getSharedContext,
  shareContextWith,
  
  // Delegation
  delegateTask,
  acceptDelegation,
  rejectDelegation,
  completeDelegation,
  getDelegations,
  
  // Teams
  createTeam,
  addToTeam,
  removeFromTeam,
  getAgentTeams,
  broadcastToTeam,
  
  // Resource locking
  acquireLock,
  releaseLock,
  isLocked,
  
  // Templates
  teamTemplates,
  createTeamFromTemplate,
} from "./coordinator";
