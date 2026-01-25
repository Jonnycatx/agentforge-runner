use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Task status enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Pending,
    Scheduled,
    Running,
    Completed,
    Failed,
    Cancelled,
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TaskStatus::Pending => write!(f, "pending"),
            TaskStatus::Scheduled => write!(f, "scheduled"),
            TaskStatus::Running => write!(f, "running"),
            TaskStatus::Completed => write!(f, "completed"),
            TaskStatus::Failed => write!(f, "failed"),
            TaskStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

/// A task to be executed by an agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub agent_id: String,
    pub task_type: String,
    pub input: Value,
    pub status: String,
    pub result: Option<Value>,
    pub error: Option<String>,
    pub scheduled_at: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub retry_count: u32,
}

/// Task statistics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TaskStats {
    pub total: u32,
    pub pending: u32,
    pub scheduled: u32,
    pub running: u32,
    pub completed: u32,
    pub failed: u32,
    pub cancelled: u32,
}

/// Activity log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityLogEntry {
    pub id: String,
    pub agent_id: Option<String>,
    pub task_id: Option<String>,
    pub action: String,
    pub details: Option<String>,
    pub timestamp: String,
}

/// Approval request for autonomous actions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalRequest {
    pub id: String,
    pub agent_id: String,
    pub task_id: Option<String>,
    pub action_type: String,
    pub action_details: Value,
    pub risk_level: String,
    pub status: String,
    pub created_at: String,
}

/// Risk levels for actions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    Low,      // Read-only operations
    Medium,   // Write operations with easy undo
    High,     // Write operations with difficult undo
    Critical, // Irreversible or financial operations
}

impl RiskLevel {
    pub fn from_action(action_type: &str) -> Self {
        match action_type {
            // Low risk - read operations
            "web_search" | "web_scrape" | "email_read" | "csv_read" | "file_read" |
            "pdf_read" | "news_search" | "company_search" | "market_data" | "calculator" => {
                RiskLevel::Low
            }
            // Medium risk - write operations
            "email_draft" | "file_write" | "csv_write" | "excel_write" | "web_screenshot" => {
                RiskLevel::Medium
            }
            // High risk - external communication
            "email_send" | "email_categorize" | "calendar_events" | "browser_automation" => {
                RiskLevel::High
            }
            // Critical - financial or irreversible
            "email_unsubscribe" | "payment" | "trade" | "delete" => {
                RiskLevel::Critical
            }
            _ => RiskLevel::Medium,
        }
    }

    pub fn requires_approval(&self, autonomy_level: u8) -> bool {
        match (self, autonomy_level) {
            // Level 1: Ask before every action
            (_, 1) => true,
            // Level 2: Ask for important actions only (medium+)
            (RiskLevel::Low, 2) => false,
            (_, 2) => true,
            // Level 3: Notify but proceed (only critical needs approval)
            (RiskLevel::Critical, 3) => true,
            (_, 3) => false,
            // Level 4: Full autonomous (never ask)
            (_, 4) => false,
            // Default: ask for medium+
            (RiskLevel::Low, _) => false,
            (_, _) => true,
        }
    }
}

/// Task execution configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskExecutionConfig {
    pub max_retries: u32,
    pub retry_delay_ms: u64,
    pub timeout_ms: u64,
    pub dry_run: bool,
}

impl Default for TaskExecutionConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            retry_delay_ms: 1000,
            timeout_ms: 60000,
            dry_run: false,
        }
    }
}
