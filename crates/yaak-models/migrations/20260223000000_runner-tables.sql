CREATE TABLE runner_configs
(
    id           TEXT PRIMARY KEY,
    workspace_id TEXT    NOT NULL,
    name         TEXT    NOT NULL,
    request_ids  TEXT    NOT NULL,
    run_mode     TEXT    NOT NULL,
    created_at   INTEGER,
    updated_at   INTEGER
);

CREATE TABLE runner_runs
(
    id           TEXT PRIMARY KEY,
    config_id    TEXT,
    workspace_id TEXT    NOT NULL,
    started_at   INTEGER,
    completed_at INTEGER,
    summary      TEXT
);

CREATE TABLE runner_results
(
    id           TEXT PRIMARY KEY,
    run_id       TEXT    NOT NULL,
    request_id   TEXT    NOT NULL,
    request_name TEXT,
    status_code  INTEGER,
    duration_ms  INTEGER,
    success      INTEGER,
    error        TEXT,
    timestamp    INTEGER
);

CREATE TABLE runner_schedules
(
    id          TEXT PRIMARY KEY,
    config_id   TEXT    NOT NULL,
    cron        TEXT    NOT NULL,
    enabled     INTEGER DEFAULT 1,
    last_run_at INTEGER,
    next_run_at INTEGER
);
