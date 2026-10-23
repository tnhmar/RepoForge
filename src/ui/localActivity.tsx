import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useSession } from '../auth';
import { useJobs, type Job as ImportJob } from '../liveStore';
import { restoreJob, useCreation, type Job as CreationJob } from '../creation/runner';
import { repositoryIdentity } from './navigation';
export type LocalEvent = { id: string; userId: number; kind: 'import' | 'creation' | 'action'; target: string; status: string; summary: string; detail?: string; url?: string; at: string };
type Recent = { full: string; at: string };
export const useHub = create<{ ownerId: number | null; ready: boolean; recent: Recent[]; events: LocalEvent[]; bind: (userId: number) => void; remember: (userId: number, full: string) => void; record: (event: LocalEvent) => void }>()(persist((set, get) => ({
  ownerId: null, ready: false, recent: [], events: [],
  bind: (ownerId) => set(get().ownerId === ownerId ? { ready: true } : { ownerId, ready: true, recent: [], events: [] }),
  remember: (userId, full) => { const state = get(); if (!state.ready || state.ownerId !== userId || !repositoryIdentity(full) || state.recent[0]?.full === full) return; set({ recent: [{ full, at: new Date().toISOString() }, ...state.recent.filter((item) => item.full !== full)].slice(0, 12) }); },
  record: (event) => { const state = get(); if (!state.ready || state.ownerId !== event.userId) return; const old = state.events.find((item) => item.id === event.id); if (old && old.status === event.status && old.summary === event.summary && old.detail === event.detail && old.url === event.url) return; set({ events: [event, ...state.events.filter((item) => item.id !== event.id)].slice(0, 240) }); },
}), { name: 'repoforge.mobile-hub.v1', storage: createJSONStorage(() => AsyncStorage), skipHydration: true, partialize: (state) => ({ ownerId: state.ownerId, recent: state.recent, events: state.events }) }));
let hydration: Promise<void> | null = null;
function ready() { if (!hydration) hydration = Promise.resolve(useHub.persist.rehydrate()).catch(() => {}); return hydration; }
function importEvent(job: ImportJob) { if (!repositoryIdentity(job.repository)) return; useHub.getState().record({ id: `import:${job.id}`, userId: job.userId, kind: 'import', target: job.repository, status: job.status, summary: job.branch, detail: job.message, url: job.url || `https://github.com/${job.repository}/tree/${encodeURIComponent(job.branch)}`, at: job.at }); }
function creationEvent(job: CreationJob | null) { if (!job || !repositoryIdentity(job.plan.full)) return; useHub.getState().record({ id: `creation:${job.userId}:${job.plan.full}`, userId: job.userId, kind: 'creation', target: job.created || job.plan.full, status: job.state, summary: `${job.next}/${job.plan.steps.length} setup steps applied`, detail: job.error, url: `https://github.com/${job.plan.full}`, at: new Date().toISOString() }); }
export function LocalActivityBridge() {
  const userId = useSession((state) => state.user?.id);
  useEffect(() => {
    if (!userId) return; let alive = true;
    const offImports = useJobs.subscribe((state) => { if (alive && useSession.getState().user?.id === userId) state.jobs.filter((job) => job.userId === userId).forEach(importEvent); });
    const offCreation = useCreation.subscribe((state) => { if (alive && state.job?.userId === userId && useSession.getState().user?.id === userId) creationEvent(state.job); });
    void ready().then(async () => { if (!alive || useSession.getState().user?.id !== userId) return; useHub.getState().bind(userId); useJobs.getState().jobs.filter((job) => job.userId === userId).forEach(importEvent); creationEvent(useCreation.getState().job?.userId === userId ? useCreation.getState().job : null); try { await restoreJob(userId); } catch { /* Opening creation still offers its own recovery/error path. */ } });
    return () => { alive = false; offImports(); offCreation(); };
  }, [userId]);
  return null;
}
