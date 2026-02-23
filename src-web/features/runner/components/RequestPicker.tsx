import type { HttpRequest } from '@yaakapp-internal/models';
import { httpRequestsAtom } from '@yaakapp-internal/models';
import { useAtomValue } from 'jotai';

interface Props {
  workspaceId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-info',
  POST: 'text-success',
  PUT: 'text-warning',
  PATCH: 'text-notice',
  DELETE: 'text-danger',
  HEAD: 'text-text-subtle',
  OPTIONS: 'text-text-subtle',
};

function methodColor(method: string) {
  return METHOD_COLORS[method?.toUpperCase()] ?? 'text-text-subtle';
}

/** Multi-select request picker with checkboxes and HTTP method badges. */
export function RequestPicker({ workspaceId, selectedIds, onChange }: Props) {
  const allRequests = useAtomValue(httpRequestsAtom) as HttpRequest[];
  const requests = allRequests.filter((r) => r.workspaceId === workspaceId);

  const allSelected = requests.length > 0 && requests.every((r) => selectedIds.includes(r.id));
  const someSelected = requests.some((r) => selectedIds.includes(r.id));

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(requests.map((r) => r.id));
    }
  }

  function toggleOne(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function selectRange(toId: string) {
    const toIdx = requests.findIndex((r) => r.id === toId);
    if (toIdx === -1) return;
    const lastSelectedIdx = requests.reduce(
      (acc, r, i) => (selectedIds.includes(r.id) ? i : acc),
      -1,
    );
    if (lastSelectedIdx === -1) {
      onChange([toId]);
      return;
    }
    const [from, to] = lastSelectedIdx < toIdx
      ? [lastSelectedIdx, toIdx]
      : [toIdx, lastSelectedIdx];
    const rangeIds = requests.slice(from, to + 1).map((r) => r.id);
    onChange(Array.from(new Set([...selectedIds, ...rangeIds])));
  }

  if (requests.length === 0) {
    return (
      <div className="py-4 text-center text-text-subtlest text-xs">No HTTP requests in workspace</div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Select-all header */}
      <label className="flex items-center gap-2 py-1 px-2 border-b border-border cursor-pointer hover:bg-surface-highlight/40">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
          onChange={toggleAll}
          className="accent-[#f6821f]"
        />
        <span className="text-xs text-text-subtlest uppercase tracking-wide">
          Select all ({requests.length})
        </span>
      </label>

      {/* Request rows */}
      <div className="overflow-y-auto max-h-48 flex flex-col">
        {requests.map((r) => {
          const checked = selectedIds.includes(r.id);
          const displayName = r.name || r.url || 'Untitled';
          return (
            <label
              key={r.id}
              className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-surface-highlight/40 ${checked ? 'bg-surface-highlight/20' : ''}`}
              onClick={(e) => {
                if (e.shiftKey) {
                  e.preventDefault();
                  selectRange(r.id);
                }
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleOne(r.id)}
                className="accent-[#f6821f] shrink-0"
              />
              <span className={`text-xs font-mono font-bold w-14 shrink-0 ${methodColor(r.method)}`}>
                {(r.method || 'GET').toUpperCase()}
              </span>
              <span className="text-xs text-text truncate" title={displayName}>
                {displayName}
              </span>
            </label>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="text-xs text-text-subtlest px-2 pt-1">
          {selectedIds.length} of {requests.length} selected
        </div>
      )}
    </div>
  );
}
