import type { RunResult, RunSummary } from '../types';

interface Props {
  results: RunResult[];
  summary: RunSummary | null;
  running: boolean;
  total?: number; // expected total for progress bar (iterations × requests)
}

/** Renders a live-updating table of request results with progress bar and donut chart. */
export function LiveResultsTable({ results, summary, running, total }: Props) {
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const pct = total && total > 0 ? Math.min(100, Math.round((results.length / total) * 100)) : 0;

  return (
    <div className="flex flex-col gap-3 h-full overflow-auto font-mono text-xs">
      {/* Progress bar (while running) */}
      {running && total != null && total > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-surface-highlight rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: '#f6821f' }}
            />
          </div>
          <span className="text-text-subtlest w-10 text-right">{pct}%</span>
        </div>
      )}

      {/* Pass/Fail counts */}
      {results.length > 0 && (
        <div className="flex items-center gap-4">
          <PassFailDonut passed={passed} failed={failed} />
          <div className="flex flex-col gap-0.5">
            <span className="text-success">✓ {passed} passed</span>
            <span className="text-danger">✗ {failed} failed</span>
            <span className="text-text-subtlest">{results.length} total</span>
          </div>
        </div>
      )}

      {/* Results table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-surface-highlight">
            <th className="py-1 pr-3 text-text-subtlest font-normal">Request</th>
            <th className="py-1 pr-3 text-text-subtlest font-normal">Status</th>
            <th className="py-1 pr-3 text-text-subtlest font-normal">Duration</th>
            <th className="py-1 text-text-subtlest font-normal">Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <ResultRow key={i} result={r} isNew={running && i === results.length - 1} />
          ))}
          {running && results.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-text-subtlest">
                <span className="animate-pulse">Waiting for results…</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summary card after run */}
      {summary && <SummaryCard summary={summary} />}
    </div>
  );
}

/** Animated row that highlights when it's the newest entry. */
function ResultRow({ result: r, isNew }: { result: RunResult; isNew: boolean }) {
  const statusClass =
    r.statusCode == null
      ? 'text-text-subtlest'
      : r.statusCode >= 500
        ? 'text-danger'
        : r.statusCode >= 400
          ? 'text-warning'
          : 'text-success';

  return (
    <tr
      className={`border-b border-surface-highlight/40 transition-colors ${
        isNew ? 'bg-[#f6821f]/5' : 'hover:bg-surface-highlight/20'
      }`}
      style={isNew ? { animation: 'runner-slide-in 0.2s ease-out' } : undefined}
    >
      <td className="py-1 pr-3 truncate max-w-[200px] text-text" title={r.requestName}>
        {r.requestName}
      </td>
      <td className={`py-1 pr-3 ${statusClass}`}>
        {r.statusCode != null ? r.statusCode : '—'}
      </td>
      <td className="py-1 pr-3 text-text-subtle">{r.durationMs}ms</td>
      <td className="py-1">
        {r.success ? (
          <span className="text-success font-bold">✓</span>
        ) : (
          <span className="text-danger font-bold" title={r.error ?? undefined}>✗</span>
        )}
      </td>
    </tr>
  );
}

/** SVG donut chart for pass/fail ratio. */
function PassFailDonut({ passed, failed }: { passed: number; failed: number }) {
  const total = passed + failed;
  if (total === 0) return null;

  const r = 18;
  const cx = 22;
  const cy = 22;
  const circumference = 2 * Math.PI * r;
  const passRatio = passed / total;
  const passArc = passRatio * circumference;
  const failArc = circumference - passArc;

  return (
    <svg width={44} height={44} className="shrink-0">
      {/* Fail arc (background) */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="var(--danger)"
        strokeWidth={5}
        strokeOpacity={0.6}
      />
      {/* Pass arc */}
      {passed > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--success)"
          strokeWidth={5}
          strokeDasharray={`${passArc} ${failArc}`}
          strokeDashoffset={circumference / 4}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
      )}
      {/* Center text */}
      <text x={cx} y={cy + 4} textAnchor="middle" className="fill-text" fontSize={9} fontFamily="monospace">
        {Math.round(passRatio * 100)}%
      </text>
    </svg>
  );
}

function SummaryCard({ summary }: { summary: RunSummary }) {
  const pct = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  return (
    <div className="mt-2 p-3 rounded border border-[#f6821f]/30 bg-[#f6821f]/5 font-mono grid grid-cols-4 gap-2">
      <Stat label="Total" value={String(summary.total)} />
      <Stat label="Passed" value={String(summary.passed)} className="text-success" />
      <Stat label="Failed" value={String(summary.failed)} className="text-danger" />
      <Stat label="Pass rate" value={`${pct}%`} className={pct === 100 ? 'text-success' : pct >= 80 ? 'text-warning' : 'text-danger'} />
      <Stat label="Avg" value={`${summary.avgMs.toFixed(0)}ms`} />
      <Stat label="p50" value={`${summary.p50Ms.toFixed(0)}ms`} />
      <Stat label="p95" value={`${summary.p95Ms.toFixed(0)}ms`} />
      <Stat label="req/s" value={summary.requestsPerSec.toFixed(2)} />
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xs text-text-subtlest">{label}</span>
      <span className={`text-xs ${className ?? 'text-text'}`}>{value}</span>
    </div>
  );
}

