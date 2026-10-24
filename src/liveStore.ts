import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
export type JobCheckpoint = { repositoryId: number; base: string; branch: string; head: string; blobs: string[]; commitSha?: string; publicationStarted?: boolean };
export type Job = { id: string; userId: number; repository: string; branch: string; status: 'started' | 'completed' | 'failed' | 'unknown'; message: string; at: string; sha?: string; url?: string; checkpoint?: JobCheckpoint };
export const useJobs = create<{ jobs: Job[]; record: (job: Job) => void; update: (id: string, patch: Partial<Job>) => void; clear: (userId: number) => void }>()(persist((set) => ({
  jobs: [], record: (job) => set((state) => ({ jobs: [job, ...state.jobs].slice(0, 100) })),
  update: (id, patch) => set((state) => ({ jobs: state.jobs.map((job) => job.id === id ? { ...job, ...patch } : job) })),
  clear: (userId) => set((state) => ({ jobs: state.jobs.filter((job) => job.userId !== userId) })),
}), { name: 'repoforge.live.jobs.v2', storage: createJSONStorage(() => AsyncStorage) }));
