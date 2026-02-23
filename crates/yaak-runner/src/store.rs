use crate::models::{RunConfig, RunResult, RunSummary};
use yaak_models::query_manager::QueryManager;

/// Thin wrapper around the `QueryManager` for runner-specific persistence.
pub struct RunnerStore {
    db: QueryManager,
}

impl RunnerStore {
    pub fn new(db: QueryManager) -> Self {
        Self { db }
    }

    /// Persist a completed run summary and its individual results.
    /// `workspace_id` and `started_at` are passed explicitly because `RunSummary`
    /// does not carry them.
    pub fn save_run(
        &self,
        summary: &RunSummary,
        results: &[RunResult],
        workspace_id: &str,
        started_at: i64,
    ) -> Result<(), String> {
        let summary_json =
            serde_json::to_string(summary).map_err(|e| format!("serialize summary: {e}"))?;

        let summary_run_id = summary.run_id.clone();
        let workspace_id = workspace_id.to_string();
        let completed_at = chrono::Utc::now().timestamp_millis();

        self.db.with_raw_conn(|conn| {
            conn.execute(
                r#"
                INSERT INTO runner_runs (id, workspace_id, started_at, completed_at, summary)
                VALUES (?1, ?2, ?3, ?4, ?5)
                ON CONFLICT(id) DO UPDATE SET
                    completed_at = excluded.completed_at,
                    summary      = excluded.summary
                "#,
                rusqlite::params![summary_run_id, workspace_id, started_at, completed_at, summary_json],
            )
        })
        .map_err(|e| format!("insert runner_run: {e}"))?;

        for result in results {
            let id = yaak_models::util::generate_prefixed_id("rr");
            let result_clone = result.clone();
            self.db.with_raw_conn(|conn| {
                conn.execute(
                    r#"
                    INSERT OR IGNORE INTO runner_results
                        (id, run_id, request_id, request_name, status_code, duration_ms, success, error, timestamp)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                    "#,
                    rusqlite::params![
                        id,
                        result_clone.run_id,
                        result_clone.request_id,
                        result_clone.request_name,
                        result_clone.status_code,
                        result_clone.duration_ms as i64,
                        result_clone.success as i64,
                        result_clone.error,
                        result_clone.timestamp,
                    ],
                )
            })
            .map_err(|e| format!("insert runner_result: {e}"))?;
        }

        Ok(())
    }

    /// Return all scheduled `RunConfig`s whose schedule is currently due.
    pub fn get_due_schedules(&self) -> Vec<RunConfig> {
        self.db.with_raw_conn(|conn| {
            let mut stmt = match conn.prepare(
                "SELECT id, workspace_id, name, request_ids, run_mode FROM runner_configs
                 WHERE run_mode LIKE '%\"type\":\"Scheduled\"%'",
            ) {
                Ok(s) => s,
                Err(_) => return vec![],
            };

            let rows = stmt.query_map([], |row| {
                let request_ids_json: String = row.get(3)?;
                let run_mode_json: String = row.get(4)?;
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    request_ids_json,
                    run_mode_json,
                ))
            });

            match rows {
                Err(_) => vec![],
                Ok(rows) => rows
                    .filter_map(|r| r.ok())
                    .filter_map(
                        |(id, workspace_id, name, request_ids_json, run_mode_json)| {
                            let request_ids: Vec<String> =
                                serde_json::from_str(&request_ids_json).unwrap_or_default();
                            let run_mode = serde_json::from_str(&run_mode_json).ok()?;
                            Some(RunConfig {
                                id,
                                name,
                                workspace_id,
                                request_ids,
                                environment_id: None,
                                run_mode,
                            })
                        },
                    )
                    .collect(),
            }
        })
    }

    /// Update the `last_run_at` field after a scheduled run.
    pub fn mark_schedule_ran(&self, config_id: &str) -> Result<(), String> {
        let now = chrono::Utc::now().timestamp_millis();
        let config_id = config_id.to_string();
        self.db
            .with_raw_conn(|conn| {
                conn.execute(
                    "UPDATE runner_schedules SET last_run_at = ?1 WHERE config_id = ?2",
                    rusqlite::params![now, config_id],
                )
            })
            .map_err(|e| format!("update runner_schedule: {e}"))?;
        Ok(())
    }

    /// Return the run history for a workspace (most recent first).
    pub fn get_run_history(
        &self,
        workspace_id: &str,
        limit: u32,
    ) -> Result<Vec<RunSummary>, String> {
        let workspace_id = workspace_id.to_string();
        self.db.with_raw_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT summary FROM runner_runs WHERE workspace_id = ?1
                     ORDER BY completed_at DESC LIMIT ?2",
                )
                .map_err(|e| format!("prepare: {e}"))?;

            let rows = stmt
                .query_map(rusqlite::params![workspace_id, limit], |row| {
                    let json: String = row.get(0)?;
                    Ok(json)
                })
                .map_err(|e| format!("query: {e}"))?;

            let mut summaries = Vec::new();
            for json in rows.flatten() {
                if let Ok(s) = serde_json::from_str::<RunSummary>(&json) {
                    summaries.push(s);
                }
            }
            Ok(summaries)
        })
    }
}

