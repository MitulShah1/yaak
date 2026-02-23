use crate::error::Result;
use crate::models_ext::QueryManagerExt;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Runtime, State};
use tokio::sync::Mutex;
use yaak_runner::collection_runner::run_collection;
use yaak_runner::load_runner::run_load;
use yaak_runner::models::{RunConfig, RunSummary};
use yaak_runner::store::RunnerStore;

/// Shared state for active run cancellation tokens.
#[derive(Clone)]
pub struct RunnerState {
    active_runs: Arc<Mutex<HashMap<String, tokio::sync::watch::Sender<bool>>>>,
}

impl RunnerState {
    pub fn new() -> Self {
        Self { active_runs: Arc::new(Mutex::new(HashMap::new())) }
    }
}

impl Default for RunnerState {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
pub async fn cmd_runner_start_collection<R: Runtime>(
    app_handle: AppHandle<R>,
    config: RunConfig,
    runner_state: State<'_, RunnerState>,
) -> Result<String> {
    let run_id = config.id.clone();
    let (cancel_tx, _cancel_rx) = tokio::sync::watch::channel(false);
    runner_state.active_runs.lock().await.insert(run_id.clone(), cancel_tx);

    let store = Arc::new(RunnerStore::new((*app_handle.db_manager()).clone()));
    let (event_tx, mut event_rx) = tokio::sync::mpsc::channel(256);

    let app_for_events = app_handle.clone();
    tokio::spawn(async move {
        while let Some(result) = event_rx.recv().await {
            let _ = app_for_events.emit("runner:result", &result);
        }
    });

    let app_for_complete = app_handle.clone();
    let active_runs = runner_state.active_runs.clone();
    let run_id_clone = run_id.clone();

    tokio::spawn(async move {
        let summary = run_collection(config, store, event_tx).await;
        let _ = app_for_complete.emit("runner:complete", &summary);
        active_runs.lock().await.remove(&run_id_clone);
    });

    Ok(run_id)
}

#[tauri::command]
pub async fn cmd_runner_start_load<R: Runtime>(
    app_handle: AppHandle<R>,
    config: RunConfig,
    runner_state: State<'_, RunnerState>,
) -> Result<String> {
    let run_id = config.id.clone();
    let (cancel_tx, _cancel_rx) = tokio::sync::watch::channel(false);
    runner_state.active_runs.lock().await.insert(run_id.clone(), cancel_tx);

    let store = Arc::new(RunnerStore::new((*app_handle.db_manager()).clone()));
    let (event_tx, mut event_rx) = tokio::sync::mpsc::channel(256);

    let app_for_events = app_handle.clone();
    tokio::spawn(async move {
        while let Some(result) = event_rx.recv().await {
            let _ = app_for_events.emit("runner:result", &result);
        }
    });

    let app_for_complete = app_handle.clone();
    let active_runs = runner_state.active_runs.clone();
    let run_id_clone = run_id.clone();

    tokio::spawn(async move {
        let summary = run_load(config, store, event_tx).await;
        let _ = app_for_complete.emit("runner:complete", &summary);
        active_runs.lock().await.remove(&run_id_clone);
    });

    Ok(run_id)
}

#[tauri::command]
pub async fn cmd_runner_cancel(
    run_id: String,
    runner_state: State<'_, RunnerState>,
) -> Result<()> {
    if let Some(tx) = runner_state.active_runs.lock().await.remove(&run_id) {
        let _ = tx.send(true);
    }
    Ok(())
}

#[tauri::command]
pub async fn cmd_runner_get_history<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_id: String,
    limit: u32,
) -> Result<Vec<RunSummary>> {
    let store = RunnerStore::new((*app_handle.db_manager()).clone());
    store.get_run_history(&workspace_id, limit).map_err(crate::error::Error::GenericError)
}

