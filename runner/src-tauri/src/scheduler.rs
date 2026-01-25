use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

/// A schedule for recurring or one-time tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schedule {
    pub id: String,
    pub agent_id: String,
    pub name: String,
    pub cron_expr: Option<String>,  // For recurring tasks (e.g., "0 9 * * 1" = every Monday 9am)
    pub run_at: Option<String>,     // For one-time tasks (ISO datetime)
    pub task_type: String,
    pub task_input: Value,
    pub enabled: bool,
    pub last_run: Option<String>,
    pub next_run: Option<String>,
    pub created_at: String,
}

/// Natural language schedule patterns
pub struct NaturalLanguageParser;

impl NaturalLanguageParser {
    /// Parse natural language into cron expression
    pub fn parse(input: &str) -> Option<String> {
        let input = input.to_lowercase();
        
        // Daily patterns
        if input.contains("every day") || input.contains("daily") {
            if let Some(time) = Self::extract_time(&input) {
                return Some(format!("{} {} * * *", time.1, time.0));
            }
            return Some("0 9 * * *".to_string()); // Default 9am
        }
        
        // Weekly patterns
        let days = [
            ("monday", "1"), ("mon", "1"),
            ("tuesday", "2"), ("tue", "2"),
            ("wednesday", "3"), ("wed", "3"),
            ("thursday", "4"), ("thu", "4"),
            ("friday", "5"), ("fri", "5"),
            ("saturday", "6"), ("sat", "6"),
            ("sunday", "0"), ("sun", "0"),
        ];
        
        for (day_name, day_num) in days.iter() {
            if input.contains(&format!("every {}", day_name)) {
                if let Some(time) = Self::extract_time(&input) {
                    return Some(format!("{} {} * * {}", time.1, time.0, day_num));
                }
                return Some(format!("0 9 * * {}", day_num)); // Default 9am
            }
        }
        
        // Hourly
        if input.contains("every hour") || input.contains("hourly") {
            return Some("0 * * * *".to_string());
        }
        
        // Every X hours
        if let Some(hours) = Self::extract_number(&input, "every", "hour") {
            return Some(format!("0 */{} * * *", hours));
        }
        
        // Every X minutes
        if let Some(minutes) = Self::extract_number(&input, "every", "minute") {
            return Some(format!("*/{} * * * *", minutes));
        }
        
        // Weekdays
        if input.contains("weekday") || input.contains("week day") {
            if let Some(time) = Self::extract_time(&input) {
                return Some(format!("{} {} * * 1-5", time.1, time.0));
            }
            return Some("0 9 * * 1-5".to_string());
        }
        
        // Weekend
        if input.contains("weekend") {
            if let Some(time) = Self::extract_time(&input) {
                return Some(format!("{} {} * * 0,6", time.1, time.0));
            }
            return Some("0 9 * * 0,6".to_string());
        }
        
        // Monthly
        if input.contains("every month") || input.contains("monthly") {
            if let Some(time) = Self::extract_time(&input) {
                return Some(format!("{} {} 1 * *", time.1, time.0)); // 1st of month
            }
            return Some("0 9 1 * *".to_string());
        }
        
        None
    }
    
    /// Extract time from string (returns hour, minute)
    fn extract_time(input: &str) -> Option<(u8, u8)> {
        // Match patterns like "at 9am", "at 9:30pm", "at 14:00"
        let patterns = [
            r"at (\d{1,2}):(\d{2})\s*(am|pm)?",
            r"at (\d{1,2})\s*(am|pm)",
            r"(\d{1,2}):(\d{2})\s*(am|pm)?",
        ];
        
        for pattern in patterns.iter() {
            if let Ok(re) = regex::Regex::new(pattern) {
                if let Some(caps) = re.captures(input) {
                    let mut hour: u8 = caps.get(1)?.as_str().parse().ok()?;
                    let minute: u8 = caps.get(2).map(|m| m.as_str().parse().ok()).flatten().unwrap_or(0);
                    
                    // Handle AM/PM
                    if let Some(period) = caps.get(3) {
                        match period.as_str().to_lowercase().as_str() {
                            "pm" if hour < 12 => hour += 12,
                            "am" if hour == 12 => hour = 0,
                            _ => {}
                        }
                    }
                    
                    return Some((hour, minute));
                }
            }
        }
        
        None
    }
    
    /// Extract number from pattern like "every 5 hours"
    fn extract_number(input: &str, prefix: &str, suffix: &str) -> Option<u32> {
        let pattern = format!(r"{}\s+(\d+)\s+{}", prefix, suffix);
        if let Ok(re) = regex::Regex::new(&pattern) {
            if let Some(caps) = re.captures(input) {
                return caps.get(1)?.as_str().parse().ok();
            }
        }
        None
    }
}

/// Schedule templates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub cron_expr: String,
    pub task_type: String,
    pub default_input: Value,
}

/// Common schedule templates
pub fn get_schedule_templates() -> Vec<ScheduleTemplate> {
    vec![
        ScheduleTemplate {
            id: "daily-digest".to_string(),
            name: "Daily Digest".to_string(),
            description: "Run every morning at 9am".to_string(),
            cron_expr: "0 9 * * *".to_string(),
            task_type: "digest".to_string(),
            default_input: serde_json::json!({}),
        },
        ScheduleTemplate {
            id: "weekly-report".to_string(),
            name: "Weekly Report".to_string(),
            description: "Run every Monday at 9am".to_string(),
            cron_expr: "0 9 * * 1".to_string(),
            task_type: "report".to_string(),
            default_input: serde_json::json!({"period": "weekly"}),
        },
        ScheduleTemplate {
            id: "hourly-check".to_string(),
            name: "Hourly Check".to_string(),
            description: "Run every hour".to_string(),
            cron_expr: "0 * * * *".to_string(),
            task_type: "check".to_string(),
            default_input: serde_json::json!({}),
        },
        ScheduleTemplate {
            id: "end-of-day".to_string(),
            name: "End of Day Summary".to_string(),
            description: "Run every weekday at 5pm".to_string(),
            cron_expr: "0 17 * * 1-5".to_string(),
            task_type: "summary".to_string(),
            default_input: serde_json::json!({}),
        },
        ScheduleTemplate {
            id: "monthly-review".to_string(),
            name: "Monthly Review".to_string(),
            description: "Run on the 1st of each month".to_string(),
            cron_expr: "0 9 1 * *".to_string(),
            task_type: "review".to_string(),
            default_input: serde_json::json!({"period": "monthly"}),
        },
    ]
}

/// Scheduler state manager
pub struct Scheduler {
    active_schedules: HashMap<String, Schedule>,
}

impl Scheduler {
    pub fn new() -> Self {
        Self {
            active_schedules: HashMap::new(),
        }
    }
    
    pub fn add_schedule(&mut self, schedule: Schedule) {
        if schedule.enabled {
            self.active_schedules.insert(schedule.id.clone(), schedule);
        }
    }
    
    pub fn remove_schedule(&mut self, schedule_id: &str) {
        self.active_schedules.remove(schedule_id);
    }
    
    pub fn get_due_schedules(&self, now: &chrono::DateTime<chrono::Utc>) -> Vec<&Schedule> {
        // This would check cron expressions against current time
        // For now, return empty - full implementation would use cron crate
        vec![]
    }
}
