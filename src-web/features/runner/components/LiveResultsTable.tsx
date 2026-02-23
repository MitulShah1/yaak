import type { RunResult, RunSummary } from '../types';

interface Props {
  results: RunResult[];
  summary: RunSummary | null;
  running: boolean;
}

/** Renders a live-updating table of request results during/after a runner run. */
export function LiveResultsTable({ results, summary, running }: Props) {
  return (
    <div className="flex flex-col gap-2 h-full overflow-auto">
      <table className="w-full text-sm font-mono border-collapse">
        <thead>
          <tr className="text-left border-b border-surface-highlight">
            <th className="py-1 pr-3 text-text-subtlest">Request</th>
            <th className="py-1 pr-3 text-text-subtlest">Status</th>
            <th className="py-1 pr-3 text-text-subtlest">Duration</th>
            <th className="py-1 text-text-subtlest">Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} className="border-b border-surface-highlight/50">
              <td className="py-1 pr-3 truncate max-w-[200px]" title={r.requestName}>
                {r.requestName}
              </td>
              <td className="py-1 pr-3">
                {r.statusCode != null ? (
                  <span
                    className={
                      r.statusCode >= 500
                        ? 'text-danger'
                        : r.statusCode >= 400
                          ? 'text-warning'
                          : 'text-success'
                    }
                  >
                    {r.statusCode}
                  </span>
                ) : (
                  <span className="text-text-subtlest">—</span>
                )}
              </td>
              <td className="py-1 pr-3 text-text-subtle">{r.durationMs}ms</td>
              <td className="py-1">
                {r.success ? (
                  <span className="text-success">✓ Pass</span>
                ) : (
                  <span className="text-danger" title={r.error ?? undefined}>
                    ✗ Fail
                  </span>
                )}
              </td>
            </tr>
          ))}
          {running && results.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-text-subtlest">
                Waiting for results…
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {summary && <SummaryCard summary={summary} />}
    </div>
  );
}

function SummaryCard({ summary }: { summary: RunSummary }) {
  const pct = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  return (
    <div className="mt-4 p-3 rounded bg-surface-highlight text-sm font-mono grid grid-cols-3 gap-2">
      <Stat label="Total" value={String(summary.total)} />
      <Stat label="Passed" value={String(summary.passed)} className="text-success" />
      <Stat label="Failed" value={String(summary.failed)} className="text-danger" />
      <Stat label="Pass rate" value={`${pct}%`} />
      <Stat label="Avg" value={`${summary.avgMs.toFixed(0)}ms`} />
      <Stat label="p95" value={`${summary.p95Ms.toFixed(0)}ms`} />
      <Stat label="p99" value={`${summary.p99Ms.toFixed(0)}ms`} />
      <Stat label="req/s" value={summary.requestsPerSec.toFixed(2)} />
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-text-subtlest">{label}</span>
      <span className={className ?? 'text-text'}>{value}</span>
    </div>
  );
}
