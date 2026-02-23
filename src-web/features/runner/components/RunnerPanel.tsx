import { useState } from 'react';
import { useRunner } from '../hooks/useRunner';
import { useRunnerConfig } from '../hooks/useRunnerConfig';
import { useRunHistory } from '../hooks/useRunHistory';
import { LiveResultsTable } from './LiveResultsTable';
import { RunControls } from './RunControls';
import { RunHistory } from './RunHistory';

type Tab = 'collection' | 'load' | 'history';

interface Props {
  workspaceId: string;
  requestIds?: string[];
}

/**
 * Main runner panel. Provides tabbed UI for Collection, Load, and Run History.
 */
export function RunnerPanel({ workspaceId, requestIds = [] }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('collection');

  const runner = useRunner();
  const config = useRunnerConfig(workspaceId);
  const { history, loading: historyLoading, refresh: refreshHistory } = useRunHistory(workspaceId);

  // Sync request IDs from caller into the config form
  if (
    requestIds.length > 0 &&
    JSON.stringify(config.form.requestIds) !== JSON.stringify(requestIds)
  ) {
    config.setRequestIds(requestIds);
  }

  async function handleStart() {
    const runConfig = config.buildConfig();
    if (activeTab === 'collection') {
      await runner.startCollectionRun(runConfig);
    } else if (activeTab === 'load') {
      await runner.startLoadRun(runConfig);
    }
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'collection', label: 'Collection' },
    { key: 'load', label: 'Load' },
    { key: 'history', label: 'History' },
  ];

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              if (t.key === 'history') void refreshHistory();
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-primary text-text'
                : 'border-transparent text-text-subtle hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-1 overflow-hidden gap-4 p-3">
        {activeTab !== 'history' && (
          <>
            {/* Left panel – controls */}
            <div className="w-64 shrink-0 flex flex-col gap-3">
              <div className="text-xs text-text-subtlest uppercase tracking-wide">
                {activeTab === 'collection' ? 'Collection Run' : 'Load Test'}
              </div>
              <div className="text-xs text-text-subtle">
                {config.form.requestIds.length} request
                {config.form.requestIds.length !== 1 ? 's' : ''} selected
              </div>
              <RunControls
                mode={activeTab === 'collection' ? 'collection' : 'load'}
                running={runner.running}
                collection={config.form.collection}
                load={config.form.load}
                onCollectionChange={config.setCollection}
                onLoadChange={config.setLoad}
                onStart={handleStart}
                onCancel={runner.cancelRun}
              />
            </div>

            {/* Right panel – live results */}
            <div className="flex-1 overflow-auto">
              <LiveResultsTable
                results={runner.results}
                summary={runner.summary}
                running={runner.running}
              />
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 overflow-auto">
            <RunHistory
              history={history}
              loading={historyLoading}
              onRefresh={refreshHistory}
            />
          </div>
        )}
      </div>
    </div>
  );
}
