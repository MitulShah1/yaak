import { useEffect, useState } from 'react';
import { useRunner } from '../hooks/useRunner';
import { useRunnerConfig } from '../hooks/useRunnerConfig';
import { useRunHistory } from '../hooks/useRunHistory';
import { LiveResultsTable } from './LiveResultsTable';
import { RequestPicker } from './RequestPicker';
import { RunControls } from './RunControls';
import { RunHistory } from './RunHistory';
import { ScheduleEditor } from './ScheduleEditor';

type Tab = 'collection' | 'load' | 'scheduled' | 'history';

interface Props {
  workspaceId: string;
  requestIds?: string[];
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'collection', label: 'Collection' },
  { key: 'load', label: 'Load' },
  { key: 'scheduled', label: 'Schedule' },
  { key: 'history', label: 'History' },
];

/**
 * Main Postman-style runner panel with 4 tabs:
 * Collection Runner · Load Tester · Scheduled Runner · History
 */
export function RunnerPanel({ workspaceId, requestIds = [] }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('collection');

  const runner = useRunner();
  const config = useRunnerConfig(workspaceId);
  const { history, loading: historyLoading, refresh: refreshHistory } = useRunHistory(workspaceId);

  // Sync incoming requestIds into config form
  useEffect(() => {
    config.setRequestIds(requestIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestIds.join(',')]);

  // Expected total results for progress bar
  const expectedTotal =
    config.form.requestIds.length > 0
      ? config.form.requestIds.length * config.form.collection.iterations
      : undefined;

  async function handleStart() {
    const runConfig = config.buildConfig();
    if (activeTab === 'collection') {
      await runner.startCollectionRun(runConfig);
    } else if (activeTab === 'load') {
      await runner.startLoadRun(runConfig);
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface font-mono text-xs">
      {/* Tab bar — Postman-orange active indicator */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              if (t.key === 'history') void refreshHistory();
            }}
            className="px-4 py-2 text-xs font-bold tracking-wide uppercase transition-colors border-b-2"
            style={{
              borderBottomColor: activeTab === t.key ? '#f6821f' : 'transparent',
              color: activeTab === t.key ? '#f6821f' : 'var(--textSubtle)',
            }}
          >
            {t.label}
          </button>
        ))}

        {/* Running indicator */}
        {runner.running && (
          <div className="ml-auto flex items-center gap-1.5 pr-3">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: '#f6821f' }}
            />
            <span className="text-2xs text-text-subtlest">Running</span>
          </div>
        )}
      </div>

      {/* ── Collection Runner ── */}
      {activeTab === 'collection' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: request picker + controls */}
          <div className="w-64 shrink-0 flex flex-col border-r border-border overflow-y-auto">
            <SectionHeader label="Requests" accent />
            <RequestPicker
              workspaceId={workspaceId}
              selectedIds={config.form.requestIds}
              onChange={config.setRequestIds}
            />
            <SectionHeader label="Config" />
            <div className="px-3 pb-3">
              <RunControls
                mode="collection"
                running={runner.running}
                collection={config.form.collection}
                load={config.form.load}
                liveResults={runner.results}
                onCollectionChange={config.setCollection}
                onLoadChange={config.setLoad}
                onStart={handleStart}
                onCancel={runner.cancelRun}
              />
            </div>
          </div>

          {/* Right: live results */}
          <div className="flex-1 overflow-auto p-3">
            <LiveResultsTable
              results={runner.results}
              summary={runner.summary}
              running={runner.running}
              total={expectedTotal}
            />
          </div>
        </div>
      )}

      {/* ── Load Runner ── */}
      {activeTab === 'load' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: request picker + controls */}
          <div className="w-64 shrink-0 flex flex-col border-r border-border overflow-y-auto">
            <SectionHeader label="Requests" accent />
            <RequestPicker
              workspaceId={workspaceId}
              selectedIds={config.form.requestIds}
              onChange={config.setRequestIds}
            />
            <SectionHeader label="Load Config" />
            <div className="px-3 pb-3">
              <RunControls
                mode="load"
                running={runner.running}
                collection={config.form.collection}
                load={config.form.load}
                liveResults={runner.results}
                onCollectionChange={config.setCollection}
                onLoadChange={config.setLoad}
                onStart={handleStart}
                onCancel={runner.cancelRun}
              />
            </div>
          </div>

          {/* Right: live load results + stats */}
          <div className="flex-1 overflow-auto p-3">
            <LiveResultsTable
              results={runner.results}
              summary={runner.summary}
              running={runner.running}
            />
          </div>
        </div>
      )}

      {/* ── Scheduled Runner ── */}
      {activeTab === 'scheduled' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: request picker + schedule editor */}
          <div className="w-72 shrink-0 flex flex-col border-r border-border overflow-y-auto">
            <SectionHeader label="Requests" accent />
            <RequestPicker
              workspaceId={workspaceId}
              selectedIds={config.form.requestIds}
              onChange={config.setRequestIds}
            />
            <SectionHeader label="Schedule" />
            <div className="px-3 pb-3">
              <ScheduleEditor
                schedule={config.form.schedule}
                onChange={config.setSchedule}
              />
            </div>
          </div>

          {/* Right: run history for scheduled runs */}
          <div className="flex-1 overflow-auto p-3">
            <RunHistory
              history={history}
              loading={historyLoading}
              onRefresh={refreshHistory}
            />
          </div>
        </div>
      )}

      {/* ── History ── */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-auto p-3">
          <RunHistory
            history={history}
            loading={historyLoading}
            onRefresh={refreshHistory}
          />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div
      className="px-3 py-1.5 text-2xs font-bold uppercase tracking-wider border-b border-border"
      style={{ color: accent ? '#f6821f' : 'var(--textSubtlest)' }}
    >
      {label}
    </div>
  );
}

