use rusqlite::{Connection, Result, params};
use std::path::Path;
use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;

use crate::{AgentConfig, tasks, scheduler, triggers};

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Database { conn };
        db.initialize()?;
        Ok(db)
    }

    fn initialize(&self) -> Result<()> {
        // Agents table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                goal TEXT NOT NULL,
                personality TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                temperature REAL NOT NULL,
                tools TEXT NOT NULL,
                autonomy_level INTEGER NOT NULL DEFAULT 2,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // Tasks table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                task_type TEXT NOT NULL,
                input TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                result TEXT,
                error TEXT,
                scheduled_at TEXT,
                started_at TEXT,
                completed_at TEXT,
                created_at TEXT NOT NULL,
                retry_count INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )",
            [],
        )?;

        // Schedules table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                name TEXT NOT NULL,
                cron_expr TEXT,
                run_at TEXT,
                task_type TEXT NOT NULL,
                task_input TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                last_run TEXT,
                next_run TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )",
            [],
        )?;

        // Triggers table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS triggers (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                name TEXT NOT NULL,
                trigger_type TEXT NOT NULL,
                config TEXT NOT NULL,
                task_type TEXT NOT NULL,
                task_input TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                last_triggered TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )",
            [],
        )?;

        // Activity log table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS activity_log (
                id TEXT PRIMARY KEY,
                agent_id TEXT,
                task_id TEXT,
                action TEXT NOT NULL,
                details TEXT,
                timestamp TEXT NOT NULL
            )",
            [],
        )?;

        // Approval requests table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS approval_requests (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                task_id TEXT,
                action_type TEXT NOT NULL,
                action_details TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                decision TEXT,
                modified_input TEXT,
                created_at TEXT NOT NULL,
                decided_at TEXT,
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )",
            [],
        )?;

        // Create indexes
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id)",
            [],
        )?;
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
            [],
        )?;
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp)",
            [],
        )?;

        Ok(())
    }

    // ========================================================================
    // Agent Operations
    // ========================================================================

    pub fn save_agent(&self, config: &AgentConfig) -> Result<String> {
        let id = config.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
        let now = Utc::now().to_rfc3339();
        let tools_json = serde_json::to_string(&config.tools).unwrap_or_else(|_| "[]".to_string());

        self.conn.execute(
            "INSERT INTO agents (id, name, goal, personality, provider, model, temperature, tools, autonomy_level, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)
             ON CONFLICT(id) DO UPDATE SET
                name = ?2, goal = ?3, personality = ?4, provider = ?5, model = ?6,
                temperature = ?7, tools = ?8, autonomy_level = ?9, updated_at = ?10",
            params![id, config.name, config.goal, config.personality, config.provider,
                    config.model, config.temperature, tools_json, config.autonomy_level, now],
        )?;

        self.log_activity(Some(&id), None, "agent_saved", Some(&format!("Agent '{}' saved", config.name)))?;
        Ok(id)
    }

    pub fn get_agents(&self) -> Result<Vec<AgentConfig>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, goal, personality, provider, model, temperature, tools, autonomy_level FROM agents"
        )?;
        
        let agents = stmt.query_map([], |row| {
            let tools_json: String = row.get(7)?;
            let tools: Vec<String> = serde_json::from_str(&tools_json).unwrap_or_default();
            
            Ok(AgentConfig {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                goal: row.get(2)?,
                personality: row.get(3)?,
                provider: row.get(4)?,
                model: row.get(5)?,
                temperature: row.get(6)?,
                tools,
                autonomy_level: row.get(8)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        
        Ok(agents)
    }

    pub fn get_agent(&self, agent_id: &str) -> Result<Option<AgentConfig>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, goal, personality, provider, model, temperature, tools, autonomy_level 
             FROM agents WHERE id = ?1"
        )?;
        
        let mut rows = stmt.query(params![agent_id])?;
        
        if let Some(row) = rows.next()? {
            let tools_json: String = row.get(7)?;
            let tools: Vec<String> = serde_json::from_str(&tools_json).unwrap_or_default();
            
            Ok(Some(AgentConfig {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                goal: row.get(2)?,
                personality: row.get(3)?,
                provider: row.get(4)?,
                model: row.get(5)?,
                temperature: row.get(6)?,
                tools,
                autonomy_level: row.get(8)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn delete_agent(&self, agent_id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM agents WHERE id = ?1", params![agent_id])?;
        self.log_activity(Some(agent_id), None, "agent_deleted", None)?;
        Ok(())
    }

    // ========================================================================
    // Task Operations
    // ========================================================================

    pub fn create_task(
        &self,
        agent_id: &str,
        task_type: &str,
        input: Value,
        scheduled_at: Option<String>,
    ) -> Result<tasks::Task> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let input_json = serde_json::to_string(&input).unwrap_or_else(|_| "{}".to_string());
        let status = if scheduled_at.is_some() { "scheduled" } else { "pending" };

        self.conn.execute(
            "INSERT INTO tasks (id, agent_id, task_type, input, status, scheduled_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, agent_id, task_type, input_json, status, scheduled_at, now],
        )?;

        self.log_activity(Some(agent_id), Some(&id), "task_created", Some(&format!("Task '{}' created", task_type)))?;

        Ok(tasks::Task {
            id: id.clone(),
            agent_id: agent_id.to_string(),
            task_type: task_type.to_string(),
            input,
            status: status.to_string(),
            result: None,
            error: None,
            scheduled_at,
            started_at: None,
            completed_at: None,
            created_at: now,
            retry_count: 0,
        })
    }

    pub fn get_tasks(&self, agent_id: Option<&str>, status: Option<&str>) -> Result<Vec<tasks::Task>> {
        let mut sql = "SELECT id, agent_id, task_type, input, status, result, error, 
                       scheduled_at, started_at, completed_at, created_at, retry_count 
                       FROM tasks WHERE 1=1".to_string();
        
        if agent_id.is_some() {
            sql.push_str(" AND agent_id = ?1");
        }
        if status.is_some() {
            sql.push_str(if agent_id.is_some() { " AND status = ?2" } else { " AND status = ?1" });
        }
        sql.push_str(" ORDER BY created_at DESC LIMIT 100");

        let mut stmt = self.conn.prepare(&sql)?;
        
        let tasks = match (agent_id, status) {
            (Some(aid), Some(st)) => stmt.query_map(params![aid, st], Self::row_to_task)?,
            (Some(aid), None) => stmt.query_map(params![aid], Self::row_to_task)?,
            (None, Some(st)) => stmt.query_map(params![st], Self::row_to_task)?,
            (None, None) => stmt.query_map([], Self::row_to_task)?,
        }.collect::<Result<Vec<_>>>()?;
        
        Ok(tasks)
    }

    pub fn get_task(&self, task_id: &str) -> Result<Option<tasks::Task>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, agent_id, task_type, input, status, result, error,
                    scheduled_at, started_at, completed_at, created_at, retry_count
             FROM tasks WHERE id = ?1"
        )?;
        
        let mut rows = stmt.query(params![task_id])?;
        
        if let Some(row) = rows.next()? {
            Ok(Some(Self::row_to_task(row)?))
        } else {
            Ok(None)
        }
    }

    fn row_to_task(row: &rusqlite::Row) -> Result<tasks::Task> {
        let input_json: String = row.get(3)?;
        let result_json: Option<String> = row.get(5)?;
        
        Ok(tasks::Task {
            id: row.get(0)?,
            agent_id: row.get(1)?,
            task_type: row.get(2)?,
            input: serde_json::from_str(&input_json).unwrap_or(Value::Null),
            status: row.get(4)?,
            result: result_json.and_then(|s| serde_json::from_str(&s).ok()),
            error: row.get(6)?,
            scheduled_at: row.get(7)?,
            started_at: row.get(8)?,
            completed_at: row.get(9)?,
            created_at: row.get(10)?,
            retry_count: row.get(11)?,
        })
    }

    pub fn update_task_status(
        &self,
        task_id: &str,
        status: &str,
        result: Option<Value>,
        error: Option<String>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        let result_json = result.map(|r| serde_json::to_string(&r).unwrap_or_default());
        
        let (started_at, completed_at) = match status {
            "running" => (Some(now.clone()), None),
            "completed" | "failed" | "cancelled" => (None, Some(now.clone())),
            _ => (None, None),
        };

        if let Some(started) = started_at {
            self.conn.execute(
                "UPDATE tasks SET status = ?1, started_at = ?2 WHERE id = ?3",
                params![status, started, task_id],
            )?;
        } else if let Some(completed) = completed_at {
            self.conn.execute(
                "UPDATE tasks SET status = ?1, result = ?2, error = ?3, completed_at = ?4 WHERE id = ?5",
                params![status, result_json, error, completed, task_id],
            )?;
        } else {
            self.conn.execute(
                "UPDATE tasks SET status = ?1 WHERE id = ?2",
                params![status, task_id],
            )?;
        }

        // Get agent_id for logging
        let agent_id: Option<String> = self.conn.query_row(
            "SELECT agent_id FROM tasks WHERE id = ?1",
            params![task_id],
            |row| row.get(0),
        ).ok();

        self.log_activity(agent_id.as_deref(), Some(task_id), &format!("task_{}", status), None)?;
        Ok(())
    }

    // ========================================================================
    // Schedule Operations
    // ========================================================================

    pub fn create_schedule(
        &self,
        agent_id: &str,
        name: &str,
        cron_expr: Option<&str>,
        run_at: Option<&str>,
        task_type: &str,
        task_input: Value,
    ) -> Result<scheduler::Schedule> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let input_json = serde_json::to_string(&task_input).unwrap_or_else(|_| "{}".to_string());

        self.conn.execute(
            "INSERT INTO schedules (id, agent_id, name, cron_expr, run_at, task_type, task_input, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, agent_id, name, cron_expr, run_at, task_type, input_json, now],
        )?;

        self.log_activity(Some(agent_id), None, "schedule_created", Some(&format!("Schedule '{}' created", name)))?;

        Ok(scheduler::Schedule {
            id: id.clone(),
            agent_id: agent_id.to_string(),
            name: name.to_string(),
            cron_expr: cron_expr.map(|s| s.to_string()),
            run_at: run_at.map(|s| s.to_string()),
            task_type: task_type.to_string(),
            task_input,
            enabled: true,
            last_run: None,
            next_run: None,
            created_at: now,
        })
    }

    pub fn get_schedules(&self, agent_id: Option<&str>) -> Result<Vec<scheduler::Schedule>> {
        let sql = if agent_id.is_some() {
            "SELECT id, agent_id, name, cron_expr, run_at, task_type, task_input, enabled, last_run, next_run, created_at
             FROM schedules WHERE agent_id = ?1 ORDER BY created_at DESC"
        } else {
            "SELECT id, agent_id, name, cron_expr, run_at, task_type, task_input, enabled, last_run, next_run, created_at
             FROM schedules ORDER BY created_at DESC"
        };

        let mut stmt = self.conn.prepare(sql)?;
        
        let schedules = if let Some(aid) = agent_id {
            stmt.query_map(params![aid], Self::row_to_schedule)?
        } else {
            stmt.query_map([], Self::row_to_schedule)?
        }.collect::<Result<Vec<_>>>()?;
        
        Ok(schedules)
    }

    fn row_to_schedule(row: &rusqlite::Row) -> Result<scheduler::Schedule> {
        let input_json: String = row.get(6)?;
        
        Ok(scheduler::Schedule {
            id: row.get(0)?,
            agent_id: row.get(1)?,
            name: row.get(2)?,
            cron_expr: row.get(3)?,
            run_at: row.get(4)?,
            task_type: row.get(5)?,
            task_input: serde_json::from_str(&input_json).unwrap_or(Value::Null),
            enabled: row.get::<_, i32>(7)? != 0,
            last_run: row.get(8)?,
            next_run: row.get(9)?,
            created_at: row.get(10)?,
        })
    }

    pub fn delete_schedule(&self, schedule_id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM schedules WHERE id = ?1", params![schedule_id])?;
        Ok(())
    }

    pub fn toggle_schedule(&self, schedule_id: &str, enabled: bool) -> Result<()> {
        self.conn.execute(
            "UPDATE schedules SET enabled = ?1 WHERE id = ?2",
            params![enabled as i32, schedule_id],
        )?;
        Ok(())
    }

    // ========================================================================
    // Trigger Operations
    // ========================================================================

    pub fn create_trigger(
        &self,
        agent_id: &str,
        name: &str,
        trigger_type: &str,
        config: Value,
        task_type: &str,
        task_input: Value,
    ) -> Result<triggers::Trigger> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let config_json = serde_json::to_string(&config).unwrap_or_else(|_| "{}".to_string());
        let input_json = serde_json::to_string(&task_input).unwrap_or_else(|_| "{}".to_string());

        self.conn.execute(
            "INSERT INTO triggers (id, agent_id, name, trigger_type, config, task_type, task_input, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, agent_id, name, trigger_type, config_json, task_type, input_json, now],
        )?;

        self.log_activity(Some(agent_id), None, "trigger_created", Some(&format!("Trigger '{}' created", name)))?;

        Ok(triggers::Trigger {
            id: id.clone(),
            agent_id: agent_id.to_string(),
            name: name.to_string(),
            trigger_type: trigger_type.to_string(),
            config,
            task_type: task_type.to_string(),
            task_input,
            enabled: true,
            last_triggered: None,
            created_at: now,
        })
    }

    pub fn get_triggers(&self, agent_id: Option<&str>) -> Result<Vec<triggers::Trigger>> {
        let sql = if agent_id.is_some() {
            "SELECT id, agent_id, name, trigger_type, config, task_type, task_input, enabled, last_triggered, created_at
             FROM triggers WHERE agent_id = ?1 ORDER BY created_at DESC"
        } else {
            "SELECT id, agent_id, name, trigger_type, config, task_type, task_input, enabled, last_triggered, created_at
             FROM triggers ORDER BY created_at DESC"
        };

        let mut stmt = self.conn.prepare(sql)?;
        
        let triggers = if let Some(aid) = agent_id {
            stmt.query_map(params![aid], Self::row_to_trigger)?
        } else {
            stmt.query_map([], Self::row_to_trigger)?
        }.collect::<Result<Vec<_>>>()?;
        
        Ok(triggers)
    }

    fn row_to_trigger(row: &rusqlite::Row) -> Result<triggers::Trigger> {
        let config_json: String = row.get(4)?;
        let input_json: String = row.get(6)?;
        
        Ok(triggers::Trigger {
            id: row.get(0)?,
            agent_id: row.get(1)?,
            name: row.get(2)?,
            trigger_type: row.get(3)?,
            config: serde_json::from_str(&config_json).unwrap_or(Value::Null),
            task_type: row.get(5)?,
            task_input: serde_json::from_str(&input_json).unwrap_or(Value::Null),
            enabled: row.get::<_, i32>(7)? != 0,
            last_triggered: row.get(8)?,
            created_at: row.get(9)?,
        })
    }

    pub fn delete_trigger(&self, trigger_id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM triggers WHERE id = ?1", params![trigger_id])?;
        Ok(())
    }

    // ========================================================================
    // Activity Log Operations
    // ========================================================================

    pub fn log_activity(
        &self,
        agent_id: Option<&str>,
        task_id: Option<&str>,
        action: &str,
        details: Option<&str>,
    ) -> Result<()> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        self.conn.execute(
            "INSERT INTO activity_log (id, agent_id, task_id, action, details, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, agent_id, task_id, action, details, now],
        )?;

        Ok(())
    }

    pub fn get_activity_log(
        &self,
        agent_id: Option<&str>,
        limit: u32,
    ) -> Result<Vec<tasks::ActivityLogEntry>> {
        let sql = if agent_id.is_some() {
            "SELECT id, agent_id, task_id, action, details, timestamp
             FROM activity_log WHERE agent_id = ?1 ORDER BY timestamp DESC LIMIT ?2"
        } else {
            "SELECT id, agent_id, task_id, action, details, timestamp
             FROM activity_log ORDER BY timestamp DESC LIMIT ?1"
        };

        let mut stmt = self.conn.prepare(sql)?;
        
        let logs = if let Some(aid) = agent_id {
            stmt.query_map(params![aid, limit], |row| {
                Ok(tasks::ActivityLogEntry {
                    id: row.get(0)?,
                    agent_id: row.get(1)?,
                    task_id: row.get(2)?,
                    action: row.get(3)?,
                    details: row.get(4)?,
                    timestamp: row.get(5)?,
                })
            })?
        } else {
            stmt.query_map(params![limit], |row| {
                Ok(tasks::ActivityLogEntry {
                    id: row.get(0)?,
                    agent_id: row.get(1)?,
                    task_id: row.get(2)?,
                    action: row.get(3)?,
                    details: row.get(4)?,
                    timestamp: row.get(5)?,
                })
            })?
        }.collect::<Result<Vec<_>>>()?;
        
        Ok(logs)
    }

    pub fn get_task_stats(&self, agent_id: Option<&str>) -> Result<tasks::TaskStats> {
        let base_sql = if agent_id.is_some() {
            "SELECT status, COUNT(*) FROM tasks WHERE agent_id = ?1 GROUP BY status"
        } else {
            "SELECT status, COUNT(*) FROM tasks GROUP BY status"
        };

        let mut stmt = self.conn.prepare(base_sql)?;
        
        let mut stats = tasks::TaskStats::default();
        
        let rows: Vec<(String, i64)> = if let Some(aid) = agent_id {
            stmt.query_map(params![aid], |row| Ok((row.get(0)?, row.get(1)?)))?
        } else {
            stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        }.collect::<Result<Vec<_>>>()?;

        for (status, count) in rows {
            match status.as_str() {
                "pending" => stats.pending = count as u32,
                "running" => stats.running = count as u32,
                "completed" => stats.completed = count as u32,
                "failed" => stats.failed = count as u32,
                "cancelled" => stats.cancelled = count as u32,
                "scheduled" => stats.scheduled = count as u32,
                _ => {}
            }
        }

        stats.total = stats.pending + stats.running + stats.completed + stats.failed + stats.cancelled + stats.scheduled;
        
        Ok(stats)
    }

    // ========================================================================
    // Approval Operations
    // ========================================================================

    pub fn get_pending_approvals(&self) -> Result<Vec<tasks::ApprovalRequest>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, agent_id, task_id, action_type, action_details, risk_level, status, created_at
             FROM approval_requests WHERE status = 'pending' ORDER BY created_at DESC"
        )?;

        let approvals = stmt.query_map([], |row| {
            let details_json: String = row.get(4)?;
            Ok(tasks::ApprovalRequest {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                task_id: row.get(2)?,
                action_type: row.get(3)?,
                action_details: serde_json::from_str(&details_json).unwrap_or(Value::Null),
                risk_level: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(approvals)
    }

    pub fn process_approval(
        &self,
        approval_id: &str,
        approved: bool,
        modified_input: Option<Value>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        let decision = if approved { "approved" } else { "rejected" };
        let modified_json = modified_input.map(|m| serde_json::to_string(&m).unwrap_or_default());

        self.conn.execute(
            "UPDATE approval_requests SET status = ?1, decision = ?2, modified_input = ?3, decided_at = ?4 WHERE id = ?5",
            params![decision, decision, modified_json, now, approval_id],
        )?;

        Ok(())
    }
}
