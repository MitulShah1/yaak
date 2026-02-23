// TypeScript mirrors of the Rust types in crates/yaak-runner/src/models.rs

export interface CollectionConfig {
  iterations: number;
  delayMs: number;
  stopOnFailure: boolean;
}

export interface LoadConfig {
  virtualUsers: number;
  durationSecs: number;
  rampUpSecs: number;
}

export interface ScheduleConfig {
  cron: string;
  enabled: boolean;
  notifyOnFailure: boolean;
}

export type RunMode =
  | { type: 'Collection'; iterations: number; delayMs: number; stopOnFailure: boolean }
  | { type: 'Load'; virtualUsers: number; durationSecs: number; rampUpSecs: number }
  | { type: 'Scheduled'; cron: string; enabled: boolean; notifyOnFailure: boolean };

export interface RunConfig {
  id: string;
  name: string;
  workspaceId: string;
  requestIds: string[];
  environmentId?: string | null;
  runMode: RunMode;
}

export interface RunResult {
  runId: string;
  requestId: string;
  requestName: string;
  statusCode?: number | null;
  durationMs: number;
  success: boolean;
  error?: string | null;
  timestamp: number;
}

export interface RunSummary {
  runId: string;
  total: number;
  passed: number;
  failed: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  requestsPerSec: number;
}
