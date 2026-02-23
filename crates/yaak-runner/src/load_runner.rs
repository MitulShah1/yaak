use crate::models::{LoadConfig, RunConfig, RunMode, RunResult, RunSummary};
use crate::store::RunnerStore;
use chrono::Utc;
use log::info;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::time::{Duration, Instant};

/// Execute a load run with virtual users, streaming results through `event_tx`.
/// Returns a `RunSummary` on completion.
pub async fn run_load(
    config: RunConfig,
    store: Arc<RunnerStore>,
    event_tx: mpsc::Sender<RunResult>,
) -> RunSummary {
    let run_mode = config.run_mode.clone();
    let LoadConfig { virtual_users, duration_secs, ramp_up_secs } = match run_mode {
        RunMode::Load(c) => c,
        _ => LoadConfig { virtual_users: 1, duration_secs: 10, ramp_up_secs: 0 },
    };

    let run_id = config.id.clone();
    let request_ids = Arc::new(config.request_ids.clone());

    let ramp_interval_ms = if virtual_users > 0 && ramp_up_secs > 0 {
        (ramp_up_secs * 1000) / virtual_users as u64
    } else {
        0
    };

    let (result_tx, mut result_rx) = mpsc::channel::<RunResult>(1024);

    let mut handles = Vec::new();
    for _vu in 0..virtual_users {
        if ramp_interval_ms > 0 {
            tokio::time::sleep(Duration::from_millis(ramp_interval_ms)).await;
        }

        let run_id_clone = run_id.clone();
        let request_ids_clone = request_ids.clone();
        let result_tx_clone = result_tx.clone();
        let end = Instant::now() + Duration::from_secs(duration_secs);

        let handle = tokio::spawn(async move {
            while Instant::now() < end {
                for req_id in request_ids_clone.iter() {
                    let result = execute_single_request(&run_id_clone, req_id).await;
                    let _ = result_tx_clone.send(result).await;
                }
            }
        });
        handles.push(handle);
    }
    // Drop the extra sender so result_rx closes after all VUs finish
    drop(result_tx);

    let mut all_results: Vec<RunResult> = Vec::new();
    while let Some(result) = result_rx.recv().await {
        info!("Runner load: request {} -> success={}", result.request_id, result.success);
        let _ = event_tx.send(result.clone()).await;
        all_results.push(result);
    }

    futures::future::join_all(handles).await;

    let summary = RunSummary::compute(run_id.clone(), &all_results);
    let _ = store.save_run(&summary, &all_results);
    summary
}

async fn execute_single_request(run_id: &str, request_id: &str) -> RunResult {
    let start = std::time::Instant::now();
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
