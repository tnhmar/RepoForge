import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
export type Job = { id: string; userId: number; repository: string; branch: string; status: 'started' | 'completed' | 'failed' | 'unknown'; message: string; at: string; sha?: string; url?: string };
export const useJobs = create<{ jobs: Job[]; record: (job: Job) => void; update: (id: string, patch: Partial<Job>) => void; clear: (userId: number) => void }>()(persist((set) => ({
  jobs: [], record: (job) => set((s) => ({ jobs: [job, ...s.jobs].slice(0, 100) })),
  update: (id, patch) => set((s) => ({ jobs: s.jobs.map((j) => j.id === id ? { ...j, ...patch } : j) })),
  clear: (userId) => set((s) => ({ jobs: s.jobs.filter((j) => j.userId !== userId) })),
}), { name: 'repoforge.live.jobs.v1', storage: createJSONStorage(() => AsyncStorage) }));
