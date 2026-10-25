import { accountId, api, enc, head, repoPath } from './github';
import type { Job } from './liveStore';
export type PublicationInspection = { status: 'completed' | 'failed' | 'unknown'; message: string; url?: string };
export async function inspectPublication(job: Job, signal?: AbortSignal): Promise<PublicationInspection> {
  if (accountId() !== job.userId) throw new Error('This publication belongs to another account.');
  const checkpoint = job.checkpoint; const sha = checkpoint?.commitSha || job.sha;
  if (!checkpoint || !sha || !/^[a-f0-9]{40}$/.test(sha)) return { status: 'unknown', message: 'The saved record has no confirmed commit identity. Check GitHub manually before repeating publication.' };
  const root = repoPath(job.repository); const repository = await api<{ id: number }>(root, 'GET', undefined, signal);
  if (repository.id !== checkpoint.repositoryId) throw new Error('Repository identity changed. Check the original publication manually.');
  const current = await head(job.repository, job.branch, signal);
  const completed = { status: 'completed' as const, message: 'The recorded commit was found in the destination branch history.', url: `https://github.com/${job.repository}/commit/${sha}` };
  if (current === sha) return completed;
  if (current === checkpoint.head) return { status: 'failed', message: 'The recorded commit is not in the branch’s current history. Its previous outcome may have changed. Rebuild a fresh preview before another attempt.' };
  const comparison = await api<{ status: string }>(`${root}/compare/${enc(sha)}...${enc(current)}`, 'GET', undefined, signal);
  if (comparison.status === 'ahead' || comparison.status === 'identical') return completed;
  if (comparison.status === 'behind' || comparison.status === 'diverged') return { status: 'failed', message: 'The recorded commit is not in the branch’s current history. Rebuild a fresh preview; no publication was repeated.' };
  return { status: 'unknown', message: 'GitHub could not establish the recorded commit’s relationship to the destination. Do not repeat publication yet.' };
}
