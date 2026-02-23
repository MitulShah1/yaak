import type { CollectionConfig, LoadConfig, RunResult } from '../types';
import type { RunnerMode } from '../hooks/useRunnerConfig';

interface Props {
  mode: RunnerMode;
  running: boolean;
  collection: CollectionConfig;
  load: LoadConfig;
  liveResults?: RunResult[];
  onCollectionChange: (patch: Partial<CollectionConfig>) => void;
  onLoadChange: (patch: Partial<LoadConfig>) => void;
  onStart: () => void;
  onCancel: () => void;
}

/** Start / stop controls + run configuration fields with live load stats. */
export function RunControls({
  mode,
  running,
  collection,
  load,
  liveResults = [],
  onCollectionChange,
  onLoadChange,
  onStart,
  onCancel,
}: Props) {
  // Compute live stats for load runner
  const errorRate =
    liveResults.length > 0
      ? Math.round(((liveResults.filter((r) => !r.success).length) / liveResults.length) * 100)
      : 0;
  const avgMs =
    liveResults.length > 0
      ? Math.round(liveResults.reduce((s, r) => s + r.durationMs, 0) / liveResults.length)
      : 0;
  // Compute req/s over last 5s window
  const now = Date.now();
  const recentResults = liveResults.filter((r) => now - r.timestamp < 5000);
  const rps = recentResults.length / 5;

  // Sparkline data: last 20 avg latency buckets (1s each)
  const latencySparkline = computeLatencySparkline(liveResults);
  const rpsSparkline = computeRpsSparkline(liveResults);

  return (
    <div className="flex flex-col gap-3">
      {mode === 'collection' && (
        <div className="flex flex-col gap-2">
          <FieldRow label="Iterations">
            <NumberInput
              value={collection.iterations}
              min={1}
              onChange={(v) => onCollectionChange({ iterations: v })}
            />
          </FieldRow>
          <FieldRow label="Delay (ms)">
            <NumberInput
              value={collection.delayMs}
              min={0}
              onChange={(v) => onCollectionChange({ delayMs: v })}
            />
          </FieldRow>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={collection.stopOnFailure}
              onChange={(e) => onCollectionChange({ stopOnFailure: e.target.checked })}
              className="accent-[#f6821f]"
            />
            <span className="text-xs text-text-subtle">Stop on failure</span>
          </label>
        </div>
      )}

      {mode === 'load' && (
        <div className="flex flex-col gap-2">
          <FieldRow label="Virtual users">
            <NumberInput
              value={load.virtualUsers}
              min={1}
              onChange={(v) => onLoadChange({ virtualUsers: v })}
            />
          </FieldRow>
          <FieldRow label="Duration (s)">
            <NumberInput
              value={load.durationSecs}
              min={1}
              onChange={(v) => onLoadChange({ durationSecs: v })}
            />
          </FieldRow>
          <FieldRow label="Ramp-up (s)">
            <NumberInput
              value={load.rampUpSecs}
              min={0}
              onChange={(v) => onLoadChange({ rampUpSecs: v })}
            />
          </FieldRow>

          {/* VU ramp-up visualization */}
          {!running && <VuRampChart virtualUsers={load.virtualUsers} rampUpSecs={load.rampUpSecs} durationSecs={load.durationSecs} />}

          {/* Live stats during run */}
          {running && liveResults.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              <div className="grid grid-cols-3 gap-1">
                <StatCard label="req/s" value={rps.toFixed(1)} color="#f6821f" />
                <StatCard label="avg ms" value={String(avgMs)} color="var(--info)" />
                <StatCard label="errors" value={`${errorRate}%`} color={errorRate > 0 ? 'var(--danger)' : 'var(--success)'} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xs text-text-subtlest">Latency (ms)</span>
                <Sparkline data={latencySparkline} color="var(--info)" />
                <span className="text-2xs text-text-subtlest">RPS</span>
                <Sparkline data={rpsSparkline} color="#f6821f" />
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={running ? onCancel : onStart}
        className="mt-1 px-4 py-1.5 rounded text-xs font-bold font-mono transition-colors"
        style={{
          backgroundColor: running ? 'var(--danger)' : '#f6821f',
          color: '#fff',
          opacity: 0.9,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.9')}
      >
        {running ? '■ CANCEL' : '▶ RUN'}
      </button>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-text-subtlest w-24 shrink-0">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, min, onChange }: { value: number; min: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 px-2 py-0.5 rounded bg-surface-highlight border border-border text-text text-xs font-mono"
    />
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center p-1.5 rounded bg-surface-highlight border border-border">
      <span className="text-2xs text-text-subtlest">{label}</span>
      <span className="text-xs font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  );
}

/** SVG sparkline for a series of numbers. */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return <div className="h-8 bg-surface-highlight rounded opacity-30" />;
  }
  const w = 200;
  const h = 32;
  const max = Math.max(...data, 1);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`)
    .join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="rounded overflow-hidden">
      <rect width={w} height={h} fill="var(--surfaceHighlight)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

/** Animated bar chart showing VU ramp-up plan. */
function VuRampChart({ virtualUsers, rampUpSecs, durationSecs }: { virtualUsers: number; rampUpSecs: number; durationSecs: number }) {
  if (virtualUsers <= 0) return null;
  const steps = Math.min(virtualUsers, 10);
  const bars = Array.from({ length: steps }, (_, i) => ({
    vu: Math.round(((i + 1) / steps) * virtualUsers),
    t: rampUpSecs > 0 ? Math.round(((i + 1) / steps) * rampUpSecs) : 0,
  }));
  const maxVu = virtualUsers;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xs text-text-subtlest">VU ramp-up plan</span>
      <div className="flex items-end gap-0.5 h-8">
        {bars.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all duration-300"
            style={{
              height: `${Math.max(8, (b.vu / maxVu) * 100)}%`,
              backgroundColor: '#f6821f',
              opacity: 0.6 + (i / steps) * 0.4,
            }}
            title={`${b.vu} VUs at ${b.t}s`}
          />
        ))}
        {/* Full duration bar */}
        <div
          className="flex-1 rounded-sm"
          style={{ height: '100%', backgroundColor: '#f6821f', opacity: 1 }}
          title={`${virtualUsers} VUs for ${durationSecs}s`}
        />
      </div>
      <div className="flex justify-between text-2xs text-text-subtlest">
        <span>0s</span>
        {rampUpSecs > 0 && <span>{rampUpSecs}s</span>}
        <span>{rampUpSecs + durationSecs}s</span>
      </div>
    </div>
  );
}

/** Bucket live results by 1-second windows, returning avg latency per window. */
function computeLatencySparkline(results: RunResult[]): number[] {
  if (results.length === 0) return [];
  const sorted = [...results].sort((a, b) => a.timestamp - b.timestamp);
  const start = sorted[0].timestamp;
  const end = sorted[sorted.length - 1].timestamp;
  const windowMs = Math.max(1000, Math.round((end - start) / 20));
  const buckets: number[][] = [];
  for (const r of sorted) {
    const idx = Math.floor((r.timestamp - start) / windowMs);
    if (!buckets[idx]) buckets[idx] = [];
    buckets[idx].push(r.durationMs);
  }
  return buckets.map((b) => (b ? b.reduce((s, v) => s + v, 0) / b.length : 0));
}

/** Bucket live results by 1-second windows, returning count per window. */
function computeRpsSparkline(results: RunResult[]): number[] {
  if (results.length === 0) return [];
  const sorted = [...results].sort((a, b) => a.timestamp - b.timestamp);
  const start = sorted[0].timestamp;
  const end = sorted[sorted.length - 1].timestamp;
  const windowMs = Math.max(1000, Math.round((end - start) / 20));
  const buckets: number[] = [];
  for (const r of sorted) {
    const idx = Math.floor((r.timestamp - start) / windowMs);
    buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  return buckets.map((b) => b ?? 0);
}

