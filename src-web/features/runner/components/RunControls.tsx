import type { CollectionConfig, LoadConfig } from '../types';
import type { RunnerMode } from '../hooks/useRunnerConfig';

interface Props {
  mode: RunnerMode;
  running: boolean;
  collection: CollectionConfig;
  load: LoadConfig;
  onCollectionChange: (patch: Partial<CollectionConfig>) => void;
  onLoadChange: (patch: Partial<LoadConfig>) => void;
  onStart: () => void;
  onCancel: () => void;
}

/** Start / stop controls + run configuration fields. */
export function RunControls({
  mode,
  running,
  collection,
  load,
  onCollectionChange,
  onLoadChange,
  onStart,
  onCancel,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {mode === 'collection' && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-text-subtlest">Iterations</span>
            <input
              type="number"
              min={1}
              value={collection.iterations}
              onChange={(e) => onCollectionChange({ iterations: Number(e.target.value) })}
              className="px-2 py-1 rounded bg-surface-highlight border border-border text-text"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-text-subtlest">Delay (ms)</span>
            <input
              type="number"
              min={0}
              value={collection.delayMs}
              onChange={(e) => onCollectionChange({ delayMs: Number(e.target.value) })}
              className="px-2 py-1 rounded bg-surface-highlight border border-border text-text"
            />
          </label>
          <label className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={collection.stopOnFailure}
              onChange={(e) => onCollectionChange({ stopOnFailure: e.target.checked })}
            />
            <span className="text-text-subtle text-sm">Stop on failure</span>
          </label>
        </div>
      )}

      {mode === 'load' && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-text-subtlest">Virtual users</span>
            <input
              type="number"
              min={1}
              value={load.virtualUsers}
              onChange={(e) => onLoadChange({ virtualUsers: Number(e.target.value) })}
              className="px-2 py-1 rounded bg-surface-highlight border border-border text-text"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-text-subtlest">Duration (s)</span>
            <input
              type="number"
              min={1}
              value={load.durationSecs}
              onChange={(e) => onLoadChange({ durationSecs: Number(e.target.value) })}
              className="px-2 py-1 rounded bg-surface-highlight border border-border text-text"
            />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-text-subtlest">Ramp-up (s)</span>
            <input
              type="number"
              min={0}
              value={load.rampUpSecs}
              onChange={(e) => onLoadChange({ rampUpSecs: Number(e.target.value) })}
              className="px-2 py-1 rounded bg-surface-highlight border border-border text-text"
            />
          </label>
        </div>
      )}

      <button
        onClick={running ? onCancel : onStart}
        className={`mt-1 px-4 py-1.5 rounded text-sm font-medium ${
          running
            ? 'bg-danger/20 text-danger hover:bg-danger/30'
            : 'bg-primary text-on-primary hover:bg-primary/80'
        }`}
      >
        {running ? '■ Cancel' : '▶ Run'}
      </button>
    </div>
  );
}
