import { token } from './auth';
export class GitHubError extends Error { constructor(public status: number, message: string) { super(message); } }
export function pause(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Cancelled')); return; }
    const stop = () => { clearTimeout(timer); reject(new Error('Cancelled')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
    signal?.addEventListener('abort', stop, { once: true });
  });
}
let lastWrite = 0;
let queue = Promise.resolve();
async function writeSlot(signal?: AbortSignal) {
  const next = queue.catch(() => {}).then(async () => { await pause(Math.max(0, 8000 - (Date.now() - lastWrite)), signal); lastWrite = Date.now(); });
  queue = next; await next;
}
export async function api<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path');
  const access = await token();
  if (method !== 'GET') await writeSlot(signal);
  if (signal?.aborted) throw new Error('Cancelled');
  const controller = new AbortController(); const stop = () => controller.abort();
  signal?.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, 45000);
  try {
    const response = await fetch(`https://api.github.com${path}`, { method, headers: { Authorization: `Bearer ${access}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const hint = response.status === 401 ? ' Sign in again.' : response.status === 403 ? ' Check app installation, repository permissions, SSO, rules and rate limits.' : response.status === 404 ? ' The resource may be missing or outside this app installation.' : '';
      const retry = response.headers.get('retry-after'); const reset = response.headers.get('x-ratelimit-reset');
      throw new GitHubError(response.status, `${data.message || 'GitHub request failed'}.${hint}${retry ? ` Retry after ${retry} seconds.` : reset && response.headers.get('x-ratelimit-remaining') === '0' ? ` Rate limit resets at ${new Date(Number(reset) * 1000).toLocaleTimeString()}.` : ''}`);
    }
    if (response.status === 204 || response.status === 205) return undefined as T;
    const text = await response.text();
    return text.trim() ? JSON.parse(text) as T : undefined as T;
  } catch (error) {
    if (error instanceof GitHubError) throw error;
    throw new GitHubError(0, signal?.aborted ? 'Cancelled. A request already sent to GitHub may still complete.' : 'Network failure, timeout or unreadable response. For a write, the result may be unknown; do not assume it failed.');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', stop); }
}
export const enc = encodeURIComponent;
export const repoPath = (full: string) => `/repos/${full.split('/').map(enc).join('/')}`;
export type Repo = { id: number; name: string; full_name: string; description: string | null; private: boolean; default_branch: string; archived: boolean; size: number; permissions?: { push?: boolean } };
export type Installation = { id: number; account: { login: string }; permissions: Record<string, string> };
export type Content = { type: string; name: string; path: string; size: number; content?: string; encoding?: string; sha: string };
export const getRepo = (full: string, signal?: AbortSignal) => api<Repo>(repoPath(full), 'GET', undefined, signal);
export const branches = (full: string, page = 1) => api<{ name: string }[]>(`${repoPath(full)}/branches?per_page=30&page=${page}`);
export const installations = (page = 1) => api<{ installations: Installation[]; total_count: number }>(`/user/installations?per_page=30&page=${page}`);
export const installedRepos = (id: number, page = 1) => api<{ repositories: Repo[]; total_count: number }>(`/user/installations/${id}/repositories?per_page=30&page=${page}`);
export const contents = (full: string, branch: string, path: string) => api<Content | Content[]>(`${repoPath(full)}/contents/${path.split('/').map(enc).join('/')}?ref=${enc(branch)}`);
export type TreeEntry = { path: string; mode: string; type: 'blob' | 'tree' | 'commit'; sha: string };
export type Snapshot = { head: string; tree: TreeEntry[] };
export async function head(full: string, branch: string, signal?: AbortSignal) {
  return (await api<{ object: { sha: string } }>(`${repoPath(full)}/git/ref/heads/${branch.split('/').map(enc).join('/')}`, 'GET', undefined, signal)).object.sha;
}
export async function snapshot(full: string, branch: string, signal?: AbortSignal): Promise<Snapshot> {
  const sha = await head(full, branch, signal);
  const commit = await api<{ tree: { sha: string } }>(`${repoPath(full)}/git/commits/${sha}`, 'GET', undefined, signal);
  const tree = await api<{ tree: TreeEntry[]; truncated: boolean }>(`${repoPath(full)}/git/trees/${commit.tree.sha}?recursive=1`, 'GET', undefined, signal);
  if (tree.truncated || tree.tree.length > 20000) throw new Error('Repository tree exceeds the supported complete-preview limit. Nothing was published.');
  return { head: sha, tree: tree.tree.filter((entry) => entry.type !== 'tree') };
}
