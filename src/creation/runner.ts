import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useSession } from '../auth';
import { api, GitHubError, head, repoPath } from '../github';
import type { Plan, Step } from './model';
export type Job = { version: 1; userId: number; plan: Plan; state: 'creating' | 'rejected' | 'unknown' | 'setup' | 'attention' | 'done'; created?: string; next: number; error: string; branchSha?: string };
const key = 'repoforge.creation.part1.v1';
export const useCreation = create<{ job: Job | null; busy: boolean }>(() => ({ job: null, busy: false }));
let running = false; let control: AbortController | null = null;
async function checkpoint(job: Job) { await AsyncStorage.setItem(key, JSON.stringify(job)); if (useSession.getState().user?.id === job.userId) useCreation.setState({ job: { ...job } }); }
function check(job: Job) { if (useSession.getState().user?.id !== job.userId || control?.signal.aborted) throw new Error('Session changed. Setup stopped.'); }
export async function restoreJob(userId: number) { if (running) return; const raw = await AsyncStorage.getItem(key); if (!raw) return; try { const job = JSON.parse(raw) as Job; if (job.version !== 1 || job.userId !== userId || !job.plan?.full || !Array.isArray(job.plan.steps) || !Number.isInteger(job.next) || job.next < 0 || job.next > job.plan.steps.length) return; if (job.state === 'creating') job.state = 'unknown'; if (useSession.getState().user?.id === userId) useCreation.setState({ job }); } catch { /* Corrupt checkpoints are never executed. */ } }
export async function clearJob() { if (running) return; await AsyncStorage.removeItem(key); useCreation.setState({ job: null }); }
async function apply(job: Job, step: Step) {
  check(job); const signal = control?.signal;
  if (step.branch) {
    let exists = false;
    try { const sha = await head(job.plan.full, step.branch, signal); if (job.branchSha && sha !== job.branchSha) throw new Error('Target branch differs from the saved setup checkpoint. Check GitHub before continuing.'); exists = true; } catch (error) { if (!(error instanceof GitHubError && error.status === 404)) throw error; }
    if (!exists) {
      const repo = await api<{ default_branch: string }>(repoPath(job.plan.full), 'GET', undefined, signal);
      job.branchSha = job.branchSha || await head(job.plan.full, repo.default_branch, signal);
      await checkpoint(job); check(job);
      await api(`${repoPath(job.plan.full)}/git/refs`, 'POST', { ref: `refs/heads/${step.branch}`, sha: job.branchSha }, signal);
    }
  }
  check(job); await api(step.path, step.method, step.body, signal);
}
export async function startCreation(plan?: Plan, resume = false) {
  if (running) return; const user = useSession.getState().user; if (!user) throw new Error('Sign in first.');
  const previous = useCreation.getState().job;
  if (resume && (!previous?.created || previous.userId !== user.id)) throw new Error('Confirm the repository before resuming setup.');
  if (!resume && !plan) throw new Error('Missing creation plan.');
  const job: Job = resume ? JSON.parse(JSON.stringify(previous)) as Job : { version: 1, userId: user.id, plan: JSON.parse(JSON.stringify(plan)) as Plan, state: 'creating', next: 0, error: '' };
  running = true; control = new AbortController(); useCreation.setState({ busy: true }); let sent = false;
  try {
    if (!resume && job.plan.template) { const source = await api<{ is_template: boolean }>(repoPath(job.plan.template), 'GET', undefined, control.signal); if (!source.is_template) throw new Error('The source is not a GitHub template repository.'); }
    await checkpoint(job); check(job);
    if (!resume) {
      sent = true; const result = await api<{ full_name: string }>(job.plan.path, 'POST', job.plan.body, control.signal);
      if (!result?.full_name || result.full_name.toLowerCase() !== job.plan.full.toLowerCase()) throw new Error('Creation result could not be matched. Check GitHub.');
      job.created = result.full_name;
    }
    job.state = 'setup'; job.error = ''; await checkpoint(job);
    while (job.next < job.plan.steps.length) { await apply(job, job.plan.steps[job.next]); job.next += 1; await checkpoint(job); }
    job.state = 'done'; await checkpoint(job);
  } catch (error) {
    const rejected = error instanceof GitHubError && [400, 401, 403, 404, 405, 415, 422, 451].includes(error.status);
    job.state = job.created ? 'attention' : !sent || rejected ? 'rejected' : 'unknown'; job.error = error instanceof Error ? error.message : 'Setup interrupted.';
    try { await checkpoint(job); } catch { if (useSession.getState().user?.id === job.userId) useCreation.setState({ job: { ...job, error: 'Local checkpoint could not be saved. Check GitHub before creating anything again.' } }); }
  } finally { running = false; control = null; useCreation.setState({ busy: false }); }
}
export async function findRepository() { const job = useCreation.getState().job; if (!job || job.userId !== useSession.getState().user?.id) throw new Error('No setup for this account.'); return api<{ full_name: string; created_at: string }>(repoPath(job.plan.full)); }
export async function adoptRepository(full: string) { const job = useCreation.getState().job; if (!job || job.userId !== useSession.getState().user?.id || full.toLowerCase() !== job.plan.full.toLowerCase()) throw new Error('Repository does not match.'); await checkpoint({ ...job, created: full, state: 'attention', error: '' }); }
useSession.subscribe((state, previous) => { if (state.user?.id !== previous.user?.id) { control?.abort(); useCreation.setState({ job: null }); } });
