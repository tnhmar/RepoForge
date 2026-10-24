import { fromByteArray } from 'base64-js';
import { accountId, api, enc, GitHubError, head, pause, repoPath, type TreeEntry } from './github';
import { assertVerifiedTree, planUpload, type UploadEntry } from './logic/uploadBatches';
import type { PublishCheckpoint, Review } from './importer';
export type UploadProgress = { stage: 'upload' | 'tree' | 'verify' | 'commit' | 'publish'; completed: number; total: number; batch: number; batches: number };
let active = false;
export async function publishBatched(review: Review, progress: (text: string) => void, checkpoint: (value: PublishCheckpoint) => void, signal: AbortSignal, resume?: PublishCheckpoint, onProgress?: (value: UploadProgress) => void) {
  if (active) throw new Error('Another publication is already active.');
  const userId = accountId(); if (!userId) throw new Error('Sign in first.'); active = true;
  const full = review.repository.full_name; const root = repoPath(full); const options = review.options;
  const reusable = resume && resume.repositoryId === review.repository.id && resume.base === options.base && resume.branch === options.branch && resume.head === review.head ? resume : undefined;
  const uploaded = new Set(reusable?.blobs || []); const known = new Set([...(review.baseObjects || []), ...uploaded]);
  const initial: PublishCheckpoint = { repositoryId: review.repository.id, base: options.base, branch: options.branch, head: review.head, blobs: [] };
  let commitSha: string | undefined;
  const check = () => { if (signal.aborted || accountId() !== userId) throw new Error('Cancelled or session changed.'); };
  const save = (publicationStarted = false) => { checkpoint({ ...initial, blobs: [...uploaded], ...(commitSha ? { commitSha } : {}), publicationStarted }); };
  const object = async <T,>(path: string, body: unknown): Promise<T> => {
    for (let attempt = 0; ; attempt += 1) {
      check();
      try { return await api<T>(path, 'POST', body, signal); }
      catch (error) {
        if (signal.aborted || accountId() !== userId || !(error instanceof GitHubError) || attempt >= 3 || !(error.rateLimited || [0, 429, 500, 502, 503, 504].includes(error.status))) throw error;
        const delay = Math.max(error.retryAfterMs, error.rateLimited ? 60000 * 2 ** attempt : 750 * 2 ** attempt);
        progress(`GitHub request paused; retry ${attempt + 1}/3 in ${Math.ceil(delay / 1000)} seconds. Cancel remains available.`); await pause(delay, signal);
      }
    }
  };
  const treeRequest = async (entries: UploadEntry[], base?: string): Promise<string> => {
    try { const result = await object<{ sha: string }>(`${root}/git/trees`, { ...(base ? { base_tree: base } : {}), tree: entries }); if (!/^[a-f0-9]{40}$/.test(result.sha)) throw new Error('Invalid staged tree response. Nothing was published.'); return result.sha; }
    catch (error) {
      if (error instanceof GitHubError && error.status === 413 && entries.length > 1) { const middle = Math.ceil(entries.length / 2); const left = await treeRequest(entries.slice(0, middle), base); return treeRequest(entries.slice(middle), left); }
      throw error;
    }
  };
  try {
    if (reusable?.publicationStarted) throw new Error(`UNKNOWN_PUBLICATION: Check branch ${options.branch} and commit ${reusable.commitSha || ''} on GitHub before retrying.`);
    check(); if (await head(full, options.base, signal) !== review.head) throw new Error('Base branch changed. Build a fresh preview.');
    try { await head(full, options.branch, signal); throw new Error('Destination branch already exists. Choose a new branch.'); } catch (error) { if (!(error instanceof GitHubError && error.status === 404)) throw error; }
    const changed = new Set(review.changes.filter((entry) => entry.status === 'added' || entry.status === 'modified').map((entry) => entry.path));
    const files = review.files.filter((file) => changed.has(file.path)); const byPath = new Map(files.map((file) => [file.path, file]));
    const plan = planUpload(review.tree, files, known);
    const report = (stage: UploadProgress['stage'], batch = 0) => { const completed = files.filter((file) => known.has(file.sha)).length; onProgress?.({ stage, completed, total: files.length, batch, batches: plan.batches.length }); return completed; };
    save(); report('upload');
    for (let index = 0; index < plan.blobs.length; index += 1) {
      const file = plan.blobs[index]; check(); if (known.has(file.sha)) continue;
      if (file.data.length > 5 * 1024 * 1024) throw new Error('File exceeds the app’s 5 MiB mobile upload limit.');
      progress(`Uploading binary/large object ${index + 1}/${plan.blobs.length}: ${file.path}`);
      const blob = await object<{ sha: string }>(`${root}/git/blobs`, { content: fromByteArray(file.data), encoding: 'base64' });
      if (blob.sha !== file.sha) throw new Error('Uploaded blob hash mismatch. Nothing was published.');
      uploaded.add(file.sha); known.add(file.sha); save(); report('upload');
    }
    let treeSha: string | undefined;
    for (let index = 0; index < plan.batches.length; index += 1) {
      check(); const group = plan.batches[index]; const completed = report('tree', index + 1);
      progress(`Preparing multi-file batch ${index + 1}/${plan.batches.length} (${group.length} tree entries); ${completed}/${files.length} changed files prepared.`);
      treeSha = await treeRequest(group, treeSha);
      for (const entry of group) if (entry.content !== undefined) { const file = byPath.get(entry.path); if (!file) throw new Error('Unexpected inline file. Nothing was published.'); uploaded.add(file.sha); known.add(file.sha); }
      save(); report('tree', index + 1);
    }
    if (!treeSha) throw new Error('No staged tree. Nothing was published.');
    check(); progress('Verifying staged paths, file modes and every reviewed Git object hash'); report('verify', plan.batches.length);
    const staged = await api<{ tree: TreeEntry[]; truncated: boolean }>(`${root}/git/trees/${treeSha}?recursive=1`, 'GET', undefined, signal);
    assertVerifiedTree(review.tree, staged.tree, staged.truncated);
    if (await head(full, options.base, signal) !== review.head) throw new Error('Base branch changed during upload. Build a fresh preview.');
    check(); progress('Creating the single project commit'); report('commit', plan.batches.length);
    const commit = await object<{ sha: string }>(`${root}/git/commits`, { message: options.message, tree: treeSha, parents: [review.head] });
    if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error('Invalid commit response. Nothing was published.');
    commitSha = commit.sha; save(); check();
    progress('Publishing the NEW branch. A request already sent cannot be recalled.'); report('publish', plan.batches.length);
    save(true);
    try { check(); await api(`${root}/git/refs`, 'POST', { ref: `refs/heads/${options.branch}`, sha: commitSha }, signal); }
    catch (error) {
      if (error instanceof GitHubError && error.status >= 400 && error.status < 500 && error.status !== 408) { save(false); throw error; }
      throw new Error(`UNKNOWN_PUBLICATION: Check branch ${options.branch} and commit ${commitSha} on GitHub before retrying.`);
    }
    return { sha: commitSha, url: `https://github.com/${full}/commit/${commitSha}`, branchUrl: `https://github.com/${full}/tree/${enc(options.branch)}` };
  } finally { active = false; }
}
