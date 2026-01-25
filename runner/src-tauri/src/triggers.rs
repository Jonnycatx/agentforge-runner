use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Trigger types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TriggerType {
    FileSystem,  // New file, file changed
    Email,       // New email matching criteria
    Time,        // Schedule-based (handled by scheduler)
    Webhook,     // External HTTP event
    Manual,      // User-initiated
}

impl std::fmt::Display for TriggerType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TriggerType::FileSystem => write!(f, "file_system"),
            TriggerType::Email => write!(f, "email"),
            TriggerType::Time => write!(f, "time"),
            TriggerType::Webhook => write!(f, "webhook"),
            TriggerType::Manual => write!(f, "manual"),
        }
    }
}

/// A trigger that initiates tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trigger {
    pub id: String,
    pub agent_id: String,
    pub name: String,
    pub trigger_type: String,
    pub config: Value,
    pub task_type: String,
    pub task_input: Value,
    pub enabled: bool,
    pub last_triggered: Option<String>,
    pub created_at: String,
}

/// File system trigger configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSystemTriggerConfig {
    pub path: String,           // Directory or file to watch
    pub patterns: Vec<String>,  // Glob patterns to match (e.g., "*.csv")
    pub events: Vec<String>,    // create, modify, delete
    pub recursive: bool,        // Watch subdirectories
}

/// Email trigger configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailTriggerConfig {
    pub from_contains: Option<String>,    // Filter by sender
    pub subject_contains: Option<String>, // Filter by subject
    pub has_attachment: Option<bool>,     // Filter by attachments
    pub labels: Vec<String>,              // Gmail labels to watch
    pub poll_interval_seconds: u32,       // How often to check
}

/// Webhook trigger configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookTriggerConfig {
    pub endpoint: String,       // The webhook URL path
    pub secret: Option<String>, // Optional secret for verification
    pub method: String,         // HTTP method (POST, GET)
}

/// Trigger condition for filtering events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerCondition {
    pub field: String,      // Field to check
    pub operator: String,   // equals, contains, starts_with, ends_with, regex
    pub value: String,      // Value to compare
}

impl TriggerCondition {
    pub fn evaluate(&self, actual_value: &str) -> bool {
        match self.operator.as_str() {
            "equals" => actual_value == self.value,
            "contains" => actual_value.contains(&self.value),
            "starts_with" => actual_value.starts_with(&self.value),
            "ends_with" => actual_value.ends_with(&self.value),
            "not_equals" => actual_value != self.value,
            "not_contains" => !actual_value.contains(&self.value),
            "regex" => {
                regex::Regex::new(&self.value)
                    .map(|re| re.is_match(actual_value))
                    .unwrap_or(false)
            }
            _ => false,
        }
    }
}

/// Trigger event payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerEvent {
    pub trigger_id: String,
    pub trigger_type: String,
    pub timestamp: String,
    pub data: Value,
}

impl TriggerEvent {
    pub fn file_created(trigger_id: &str, path: &str) -> Self {
        Self {
            trigger_id: trigger_id.to_string(),
            trigger_type: "file_system".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            data: serde_json::json!({
                "event": "created",
                "path": path,
            }),
        }
    }
    
    pub fn file_modified(trigger_id: &str, path: &str) -> Self {
        Self {
            trigger_id: trigger_id.to_string(),
            trigger_type: "file_system".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            data: serde_json::json!({
                "event": "modified",
                "path": path,
            }),
        }
    }
    
    pub fn email_received(trigger_id: &str, from: &str, subject: &str) -> Self {
        Self {
            trigger_id: trigger_id.to_string(),
            trigger_type: "email".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            data: serde_json::json!({
                "event": "received",
                "from": from,
                "subject": subject,
            }),
        }
    }
    
    pub fn webhook_received(trigger_id: &str, method: &str, body: Value) -> Self {
        Self {
            trigger_id: trigger_id.to_string(),
            trigger_type: "webhook".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            data: serde_json::json!({
                "event": "received",
                "method": method,
                "body": body,
            }),
        }
    }
}
