use crate::models::{CollectionConfig, RunConfig, RunMode, RunResult, RunSummary};
use crate::store::RunnerStore;
use chrono::Utc;
use log::info;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::time::Duration;

/// Execute a collection run, streaming results through `event_tx`.
/// Returns a `RunSummary` on completion.
pub async fn run_collection(
    config: RunConfig,
    store: Arc<RunnerStore>,
    event_tx: mpsc::Sender<RunResult>,
) -> RunSummary {
    let run_mode = config.run_mode.clone();
    let CollectionConfig { iterations, delay_ms, stop_on_failure } = match run_mode {
        RunMode::Collection(c) => c,
        _ => CollectionConfig { iterations: 1, delay_ms: 0, stop_on_failure: false },
    };

    let run_id = config.id.clone();
    let workspace_id = config.workspace_id.clone();
    let started_at = Utc::now().timestamp_millis();
    let mut results: Vec<RunResult> = Vec::new();

    'outer: for _iteration in 0..iterations {
        for request_id in &config.request_ids {
            let result = execute_single_request(&run_id, request_id).await;
            info!("Runner: request {} -> success={}", request_id, result.success);

            let failed = !result.success;
            let _ = event_tx.send(result.clone()).await;
            results.push(result);

            if stop_on_failure && failed {
                info!("Runner: stopping on failure");
                break 'outer;
            }

            if delay_ms > 0 {
                tokio::time::sleep(Duration::from_millis(delay_ms)).await;
            }
        }
    }

    let summary = RunSummary::compute(run_id.clone(), &results);
    let _ = store.save_run(&summary, &results, &workspace_id, started_at);
    summary
}

/// Simulate sending a single HTTP request.
/// In a full implementation this would delegate to `yaak::send`.
async fn execute_single_request(run_id: &str, request_id: &str) -> RunResult {
    let start = std::time::Instant::now();

    // Minimal stub: mark as success with zero body.
    // A complete implementation would call `send_http_request_with_plugins` here.
    let duration_ms = start.elapsed().as_millis() as u64;

    RunResult {
        run_id: run_id.to_string(),
        request_id: request_id.to_string(),
        request_name: request_id.to_string(),
        status_code: Some(200),
        duration_ms,
        success: true,
        error: None,
        timestamp: Utc::now().timestamp_millis(),
    }
}
