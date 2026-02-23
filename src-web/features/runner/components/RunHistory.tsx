import type { RunSummary } from '../types';

interface Props {
  history: RunSummary[];
  loading: boolean;
  onRefresh: () => void;
}

/** Renders a table of past runner runs with drill-down summaries. */
export function RunHistory({ history, loading, onRefresh }: Props) {
  return (
    <div className="flex flex-col gap-2 h-full overflow-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-text-subtle">Run History</span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-text-subtlest hover:text-text px-2 py-0.5 rounded"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {history.length === 0 && !loading && (
        <p className="text-sm text-text-subtlest text-center py-8">No runs yet</p>
      )}
      <table className="w-full text-sm font-mono border-collapse">
        {history.length > 0 && (
          <thead>
            <tr className="text-left border-b border-surface-highlight">
              <th className="py-1 pr-3 text-text-subtlest">Run ID</th>
              <th className="py-1 pr-3 text-text-subtlest">Total</th>
              <th className="py-1 pr-3 text-text-subtlest">Passed</th>
              <th className="py-1 pr-3 text-text-subtlest">Failed</th>
              <th className="py-1 pr-3 text-text-subtlest">Avg ms</th>
              <th className="py-1 text-text-subtlest">req/s</th>
            </tr>
          </thead>
        )}
        <tbody>
          {history.map((s) => {
            const pct = s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0;
            return (
              <tr key={s.runId} className="border-b border-surface-highlight/50 hover:bg-surface-highlight/30">
                <td className="py-1 pr-3 text-text-subtlest truncate max-w-[120px]" title={s.runId}>
                  {s.runId.slice(0, 8)}…
                </td>
                <td className="py-1 pr-3">{s.total}</td>
                <td className="py-1 pr-3 text-success">{s.passed}</td>
                <td className="py-1 pr-3 text-danger">{s.failed}</td>
                <td className="py-1 pr-3 text-text-subtle">{s.avgMs.toFixed(0)}</td>
                <td className="py-1 text-text-subtle">{s.requestsPerSec.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
