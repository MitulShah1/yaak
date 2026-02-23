import { useState } from 'react';
import type { CollectionConfig, LoadConfig, RunConfig, RunMode, ScheduleConfig } from '../types';
import { generateId } from '../../../lib/generateId';

export type RunnerMode = 'collection' | 'load' | 'scheduled';

export interface RunnerFormState {
  name: string;
  requestIds: string[];
  environmentId: string | null;
  mode: RunnerMode;
  collection: CollectionConfig;
  load: LoadConfig;
  schedule: ScheduleConfig;
}

const DEFAULT_COLLECTION: CollectionConfig = {
  iterations: 1,
  delayMs: 0,
  stopOnFailure: false,
};

const DEFAULT_LOAD: LoadConfig = {
  virtualUsers: 5,
  durationSecs: 30,
  rampUpSecs: 5,
};

const DEFAULT_SCHEDULE: ScheduleConfig = {
  cron: '0 * * * *',
  enabled: true,
  notifyOnFailure: false,
};

export function useRunnerConfig(workspaceId: string) {
  const [form, setForm] = useState<RunnerFormState>({
    name: 'My Run',
    requestIds: [],
    environmentId: null,
    mode: 'collection',
    collection: DEFAULT_COLLECTION,
    load: DEFAULT_LOAD,
    schedule: DEFAULT_SCHEDULE,
  });

  function setName(name: string) {
    setForm((f) => ({ ...f, name }));
  }

  function setRequestIds(requestIds: string[]) {
    setForm((f) => ({ ...f, requestIds }));
  }

  function setEnvironmentId(environmentId: string | null) {
    setForm((f) => ({ ...f, environmentId }));
  }

  function setMode(mode: RunnerMode) {
    setForm((f) => ({ ...f, mode }));
  }

  function setCollection(patch: Partial<CollectionConfig>) {
    setForm((f) => ({ ...f, collection: { ...f.collection, ...patch } }));
  }

  function setLoad(patch: Partial<LoadConfig>) {
    setForm((f) => ({ ...f, load: { ...f.load, ...patch } }));
  }

  function setSchedule(patch: Partial<ScheduleConfig>) {
    setForm((f) => ({ ...f, schedule: { ...f.schedule, ...patch } }));
  }

  function buildConfig(): RunConfig {
    let runMode: RunMode;
    if (form.mode === 'collection') {
      runMode = { type: 'Collection', ...form.collection };
    } else if (form.mode === 'load') {
      runMode = { type: 'Load', ...form.load };
    } else {
      runMode = { type: 'Scheduled', ...form.schedule };
    }

    return {
      id: generateId(),
      name: form.name,
      workspaceId,
      requestIds: form.requestIds,
      environmentId: form.environmentId,
      runMode,
    };
  }

  return {
    form,
    setName,
    setRequestIds,
    setEnvironmentId,
    setMode,
    setCollection,
    setLoad,
    setSchedule,
    buildConfig,
  };
}
