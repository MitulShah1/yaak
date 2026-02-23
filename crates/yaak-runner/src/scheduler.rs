use crate::collection_runner::run_collection;
use crate::models::ScheduleConfig;
use crate::store::RunnerStore;
use log::{info, warn};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::time::Duration;

/// Start the background scheduler. Checks every 60 seconds for due scheduled runs.
/// Returns a sender that can be used to stop the scheduler.
pub fn start_scheduler(store: Arc<RunnerStore>) -> mpsc::Sender<()> {
    let (stop_tx, mut stop_rx) = mpsc::channel::<()>(1);

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    let due_configs = store.get_due_schedules();
                    for config in due_configs {
                        let config_id = config.id.clone();
                        let store_clone = store.clone();
                        let (event_tx, mut event_rx) = mpsc::channel(128);

                        // Drain events (no frontend listener in scheduler context)
                        tokio::spawn(async move {
                            while event_rx.recv().await.is_some() {}
                        });

                        let store_for_run = store_clone.clone();
                        tokio::spawn(async move {
                            info!("Scheduler: running config {}", config.id);
                            run_collection(config, store_for_run, event_tx).await;
                        });

                        if let Err(e) = store_clone.mark_schedule_ran(&config_id) {
                            warn!("Scheduler: failed to update schedule: {e:?}");
                        }
                    }
                }
                _ = stop_rx.recv() => {
                    info!("Scheduler: shutting down");
                    break;
                }
            }
        }
    });

    stop_tx
}

/// Check if a `ScheduleConfig` is due based on a simple cron-like check.
/// For now returns true for configs that have `enabled = true`.
/// A full implementation would parse the cron expression.
pub fn is_schedule_due(schedule: &ScheduleConfig) -> bool {
    schedule.enabled
}
