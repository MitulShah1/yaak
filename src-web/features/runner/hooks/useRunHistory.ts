import { useCallback, useEffect, useState } from 'react';
import { invokeCmd } from '../../../lib/tauri';
import type { RunSummary } from '../types';

export function useRunHistory(workspaceId: string, limit = 20) {
  const [history, setHistory] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const results = await invokeCmd<RunSummary[]>('cmd_runner_get_history', {
        workspaceId,
        limit,
      });
      setHistory(results);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { history, loading, refresh };
}
