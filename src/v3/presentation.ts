import type { Job } from '../liveStore';
export const statusLabel = (status: string) => status === 'completed' ? 'Published' : status === 'failed' ? 'Not completed' : 'Needs checking';
export const statusTone = (status: string): 'success' | 'warning' | 'error' => status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'warning';
export const stages = ['Prepare files', 'Check project', 'Create commit', 'Update selected branch'];
export const stageIndex = (stage?: string) => stage === 'publish' ? 3 : stage === 'commit' ? 2 : stage === 'verify' ? 1 : 0;
export function recentDestinations(jobs: Job[], userId?: number) { const seen = new Set<string>(); return jobs.filter((job) => { const key = job.repository.toLowerCase(); if (job.userId !== userId || seen.has(key)) return false; seen.add(key); return true; }).slice(0, 4).map((job) => job.repository); }
export const mib = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MiB`;
