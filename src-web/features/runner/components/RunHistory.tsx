import type { RunSummary } from '../types';

interface Props {
  history: RunSummary[];
  loading: boolean;
  onRefresh: () => void;
}

function StatusBadge({ passed, total }: { passed: number; total: number }) {
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const color =
    pct === 100 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444';
  return (
    <span
      className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {pct}%
    </span>
  );
}

/** Renders a table of past runner runs with type badges and success rate. */
export function RunHistory({ history, loading, onRefresh }: Props) {
  return (
    <div className="flex flex-col gap-2 h-full overflow-auto font-mono text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-text-subtle uppercase tracking-wide">Run History</span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-2xs text-text-subtlest hover:text-text px-2 py-0.5 rounded border border-border"
        >
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {history.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-text-subtlest">
          <span className="text-3xl">🏃</span>
          <p className="text-xs">No runs yet. Start a Collection or Load run.</p>
        </div>
      )}

      {history.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-surface-highlight">
              <th className="py-1 pr-2 text-text-subtlest font-normal">Run</th>
              <th className="py-1 pr-2 text-text-subtlest font-normal">Result</th>
              <th className="py-1 pr-2 text-text-subtlest font-normal">Total</th>
              <th className="py-1 pr-2 text-text-subtlest font-normal">Avg ms</th>
              <th className="py-1 pr-2 text-text-subtlest font-normal">p95</th>
              <th className="py-1 text-text-subtlest font-normal">req/s</th>
            </tr>
          </thead>
          <tbody>
            {history.map((s, i) => (
              <tr
                key={s.runId}
                className={`border-b border-surface-highlight/40 hover:bg-surface-highlight/20 ${i % 2 === 0 ? '' : 'bg-surface-highlight/5'}`}
              >
                <td className="py-1.5 pr-2 text-text-subtlest truncate max-w-[120px]" title={s.runId}>
                  {s.runId.slice(0, 8)}…
                </td>
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge passed={s.passed} total={s.total} />
                    {s.failed > 0 && (
                      <span className="text-2xs text-danger">{s.failed} fail</span>
                    )}
                  </div>
                </td>
                <td className="py-1.5 pr-2 text-text">{s.total}</td>
                <td className="py-1.5 pr-2 text-text-subtle">{s.avgMs.toFixed(0)}</td>
                <td className="py-1.5 pr-2 text-text-subtle">{s.p95Ms.toFixed(0)}</td>
                <td className="py-1.5 text-text-subtle">{s.requestsPerSec.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Summary footer */}
      {history.length > 0 && (
        <div className="mt-2 text-2xs text-text-subtlest border-t border-border pt-2">
          {history.length} runs • avg success rate:{' '}
          <span
            className="font-bold"
            style={{
              color:
                avgSuccessRate(history) >= 90
                  ? '#10b981'
                  : avgSuccessRate(history) >= 70
                    ? '#f59e0b'
                    : '#ef4444',
            }}
          >
            {avgSuccessRate(history).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

function avgSuccessRate(history: RunSummary[]): number {
  if (history.length === 0) return 0;
  const totalPct = history.reduce(
    (s, h) => s + (h.total > 0 ? (h.passed / h.total) * 100 : 0),
    0,
  );
  return totalPct / history.length;
}

