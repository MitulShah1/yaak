import { useState } from 'react';
import type { ScheduleConfig } from '../types';

interface Props {
  schedule: ScheduleConfig;
  onChange: (patch: Partial<ScheduleConfig>) => void;
}

const PRESETS: Array<{ label: string; cron: string; description: string }> = [
  { label: 'Every 5 min', cron: '*/5 * * * *', description: 'Every 5 minutes' },
  { label: 'Hourly', cron: '0 * * * *', description: 'At the start of every hour' },
  { label: 'Every 6h', cron: '0 */6 * * *', description: 'Every 6 hours' },
  { label: 'Daily', cron: '0 9 * * *', description: 'Every day at 9:00 AM' },
  { label: 'Weekly', cron: '0 9 * * 1', description: 'Every Monday at 9:00 AM' },
  { label: 'Monthly', cron: '0 9 1 * *', description: 'On the 1st of every month at 9:00 AM' },
  { label: 'Custom', cron: '', description: '' },
];

function describeSimpleCron(cron: string): string {
  for (const p of PRESETS) {
    if (p.cron === cron && p.description) return p.description;
  }

  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return cron;
    const [min, hour, dom, , dow] = parts;
    if (min.startsWith('*/') && hour === '*') return `Every ${min.slice(2)} minutes`;
    if (min === '0' && hour.startsWith('*/')) return `Every ${hour.slice(2)} hours`;
    if (min === '0' && dom === '*' && dow === '*') return `Daily at ${hour}:00`;
    if (min === '0' && dom === '*' && dow !== '*') return `Weekly (dow ${dow}) at ${hour}:00`;
    return cron;
  } catch {
    return cron;
  }
}

/** Cron editor with preset picker and human-readable preview. */
export function ScheduleEditor({ schedule, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false);

  function selectPreset(preset: (typeof PRESETS)[number]) {
    if (preset.label === 'Custom') {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onChange({ cron: preset.cron });
  }

  const humanReadable = schedule.cron ? describeSimpleCron(schedule.cron) : '—';
  const matchesPreset = PRESETS.find((p) => p.cron === schedule.cron && p.label !== 'Custom');

  return (
    <div className="flex flex-col gap-3">
      {/* Preset frequency picker */}
      <div>
        <span className="text-xs text-text-subtlest block mb-1">Frequency</span>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => selectPreset(p)}
              className={`px-2 py-0.5 text-xs rounded border font-mono transition-colors ${
                (p.label === 'Custom' && showCustom) ||
                (p.cron === schedule.cron && !showCustom && p.label !== 'Custom')
                  ? 'border-[#f6821f] text-[#f6821f] bg-[#f6821f]/10'
                  : 'border-border text-text-subtle hover:border-text-subtle'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cron expression input */}
      {(showCustom || !matchesPreset) && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-subtlest">Cron expression</span>
          <input
            type="text"
            value={schedule.cron}
            placeholder="* * * * *"
            onChange={(e) => onChange({ cron: e.target.value })}
            className="px-2 py-1 rounded bg-surface-highlight border border-border text-text font-mono text-xs"
          />
        </label>
      )}

      {/* Human-readable preview */}
      {schedule.cron && (
        <div className="text-xs text-[#f6821f] font-mono px-1">{humanReadable}</div>
      )}

      {/* Enable toggle */}
      <label className="flex items-center gap-2">
        <div
          onClick={() => onChange({ enabled: !schedule.enabled })}
          className={`relative w-8 h-4 rounded-full cursor-pointer transition-colors ${
            schedule.enabled ? 'bg-[#f6821f]' : 'bg-surface-highlight border border-border'
          }`}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-surface transition-transform ${
              schedule.enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
        <span className="text-sm text-text-subtle">Enabled</span>
      </label>

      {/* Notify on failure */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={schedule.notifyOnFailure}
          onChange={(e) => onChange({ notifyOnFailure: e.target.checked })}
          className="accent-[#f6821f]"
        />
        <span className="text-sm text-text-subtle">Notify on failure</span>
      </label>
    </div>
  );
}
