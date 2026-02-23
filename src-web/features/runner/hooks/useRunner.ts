import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useCallback, useEffect, useRef, useState } from 'react';
import { invokeCmd } from '../../../lib/tauri';
import type { RunConfig, RunResult, RunSummary } from '../types';

export function useRunner() {
  const [results, setResults] = useState<RunResult[]>([]);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const unlistenRef = useRef<Array<() => void>>([]);

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      for (const unsub of unlistenRef.current) unsub();
      unlistenRef.current = [];
    };
  }, []);

  const startCollectionRun = useCallback(async (config: RunConfig) => {
    // Reset state
    setRunning(true);
    setResults([]);
    setSummary(null);
    setRunId(config.id);

    const windowLabel = getCurrentWebviewWindow().label;

    const unlistenResult = await listen<RunResult>(
      'runner:result',
      (e) => setResults((prev) => [...prev, e.payload]),
      { target: { label: windowLabel, kind: 'Window' } },
    );

    const unlistenComplete = await listen<RunSummary>(
      'runner:complete',
      (e) => {
        setSummary(e.payload);
        setRunning(false);
        for (const unsub of unlistenRef.current) unsub();
        unlistenRef.current = [];
      },
      { target: { label: windowLabel, kind: 'Window' } },
    );

    unlistenRef.current = [unlistenResult, unlistenComplete];

    await invokeCmd('cmd_runner_start_collection', { config });
  }, []);

  const startLoadRun = useCallback(async (config: RunConfig) => {
    setRunning(true);
    setResults([]);
    setSummary(null);
    setRunId(config.id);

    const windowLabel = getCurrentWebviewWindow().label;

    const unlistenResult = await listen<RunResult>(
      'runner:result',
      (e) => setResults((prev) => [...prev, e.payload]),
      { target: { label: windowLabel, kind: 'Window' } },
    );

    const unlistenComplete = await listen<RunSummary>(
      'runner:complete',
      (e) => {
        setSummary(e.payload);
        setRunning(false);
        for (const unsub of unlistenRef.current) unsub();
        unlistenRef.current = [];
      },
      { target: { label: windowLabel, kind: 'Window' } },
    );

    unlistenRef.current = [unlistenResult, unlistenComplete];

    await invokeCmd('cmd_runner_start_load', { config });
  }, []);

  const cancelRun = useCallback(async () => {
    if (!runId) return;
    await invokeCmd('cmd_runner_cancel', { runId });
    setRunning(false);
    setRunId(null);
    for (const unsub of unlistenRef.current) unsub();
    unlistenRef.current = [];
  }, [runId]);

  return { startCollectionRun, startLoadRun, cancelRun, results, summary, running, runId };
}
