use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunConfig {
    pub id: String,
    pub name: String,
    pub workspace_id: String,
    pub request_ids: Vec<String>,
    pub environment_id: Option<String>,
    pub run_mode: RunMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum RunMode {
    Collection(CollectionConfig),
    Load(LoadConfig),
    Scheduled(ScheduleConfig),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionConfig {
    pub iterations: u32,
    pub delay_ms: u64,
    pub stop_on_failure: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadConfig {
    pub virtual_users: u32,
    pub duration_secs: u64,
    pub ramp_up_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleConfig {
    pub cron: String,
    pub enabled: bool,
    pub notify_on_failure: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunResult {
    pub run_id: String,
    pub request_id: String,
    pub request_name: String,
    pub status_code: Option<u16>,
    pub duration_ms: u64,
    pub success: bool,
    pub error: Option<String>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunSummary {
    pub run_id: String,
    pub total: u32,
    pub passed: u32,
    pub failed: u32,
    pub avg_ms: f64,
    pub p50_ms: f64,
    pub p95_ms: f64,
    pub p99_ms: f64,
    pub requests_per_sec: f64,
}

impl RunSummary {
    pub fn compute(run_id: String, results: &[RunResult]) -> Self {
        let total = results.len() as u32;
        let passed = results.iter().filter(|r| r.success).count() as u32;
        let failed = total - passed;

        let mut durations: Vec<f64> = results.iter().map(|r| r.duration_ms as f64).collect();
        durations.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let avg_ms = if durations.is_empty() {
            0.0
        } else {
            durations.iter().sum::<f64>() / durations.len() as f64
        };

        let p50_ms = percentile(&durations, 50.0);
        let p95_ms = percentile(&durations, 95.0);
        let p99_ms = percentile(&durations, 99.0);

        let duration_secs = if let (Some(first), Some(last)) =
            (results.iter().map(|r| r.timestamp).min(), results.iter().map(|r| r.timestamp).max())
        {
            let diff_ms = (last - first).max(1);
            diff_ms as f64 / 1000.0
        } else {
            1.0
        };

        let requests_per_sec = total as f64 / duration_secs;

        RunSummary { run_id, total, passed, failed, avg_ms, p50_ms, p95_ms, p99_ms, requests_per_sec }
    }
}

fn percentile(sorted: &[f64], pct: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let idx = ((pct / 100.0) * (sorted.len() as f64 - 1.0)).round() as usize;
    sorted[idx.min(sorted.len() - 1)]
}
