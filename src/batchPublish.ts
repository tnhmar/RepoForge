import { fromByteArray } from 'base64-js';
import { accountId, api, enc, GitHubError, head, pause, repoPath, type TreeEntry } from './github';
import { assertVerifiedTree, planUpload, type UploadEntry } from './logic/uploadBatches';
import type { PublishCheckpoint, Review } from './importer';
export type UploadProgress = { stage: 'upload' | 'tree' | 'verify' | 'commit' | 'publish'; completed: number; total: number; batch: number; batches: number };
let active = false;
export async function publishBatched(review: Review, progress: (text: string) => void, checkpoint: (value: PublishCheckpoint) => void, signal: AbortSignal, resume?: PublishCheckpoint, onProgress?: (value: UploadProgress) => void) {
  if (active) throw new Error('Another publication is active.'); const actor = accountId(); if (!actor) throw new Error('Sign in first.'); active = true;
  try {
    const full = review.repository.full_name; const root = repoPath(full); const options = review.options;
    const prior = resume && resume.repositoryId === review.repository.id && resume.base === options.base && resume.branch === options.branch && resume.head === review.head ? resume : undefined;
    if (prior?.publicationStarted) throw new Error(`UNKNOWN_PUBLICATION: Check ${options.branch} and ${prior.commitSha || ''} on GitHub before retrying.`);
    const uploaded = new Set(prior?.blobs || []); const known = new Set([...(review.baseObjects || []), ...uploaded]); let commitSha: string | undefined;
    const check = () => { if (signal.aborted || accountId() !== actor) throw new Error('Cancelled or session changed.'); };
    const save = (publicationStarted = false) => checkpoint({ repositoryId: review.repository.id, base: options.base, branch: options.branch, head: review.head, blobs: [...uploaded], commitSha, publicationStarted });
    const object = async <T,>(path: string, body: unknown): Promise<T> => { for (let attempt = 0; ; attempt += 1) { check(); try { return await api<T>(path, 'POST', body, signal); } catch (error) { if (signal.aborted || accountId() !== actor || !(error instanceof GitHubError) || attempt >= 3 || !(error.rateLimited || [0, 429, 500, 502, 503, 504].includes(error.status))) throw error; const delay = Math.max(error.retryAfterMs, error.rateLimited ? 60000 * 2 ** attempt : 750 * 2 ** attempt); progress(`GitHub request paused. Retry ${attempt + 1}/3 in ${Math.ceil(delay / 1000)} seconds.`); await pause(delay, signal); } } };
    const writeTree = async (entries: UploadEntry[], base?: string): Promise<string> => { try { const result = await object<{ sha: string }>(`${root}/git/trees`, { ...(base ? { base_tree: base } : {}), tree: entries }); if (!/^[a-f0-9]{40}$/.test(result.sha)) throw new Error('Invalid tree response. Nothing published.'); return result.sha; } catch (error) { if (error instanceof GitHubError && error.status === 413 && entries.length > 1) { const split = Math.ceil(entries.length / 2); return writeTree(entries.slice(split), await writeTree(entries.slice(0, split), base)); } throw error; } };
    check(); if (await head(full, options.base, signal) !== review.head) throw new Error('Base branch changed. Rebuild preview.');
    try { await head(full, options.branch, signal); throw new Error('Destination branch already exists. Choose a new branch.'); } catch (error) { if (!(error instanceof GitHubError && error.status === 404)) throw error; }
    const changed = new Set(review.changes.filter((entry) => ['added', 'modified'].includes(entry.status)).map((entry) => entry.path)); const files = review.files.filter((file) => changed.has(file.path)); const byPath = new Map(files.map((file) => [file.path, file]));
    const plan = planUpload(review.tree, files, known, review.baseTree && review.baseEntries ? { sha: review.baseTree, tree: review.baseEntries } : undefined);
    const emit = (stage: UploadProgress['stage'], batch = 0) => onProgress?.({ stage, completed: files.filter((file) => known.has(file.sha)).length, total: files.length, batch, batches: plan.batches.length });
    save(); emit('upload');
    for (const file of plan.blobs) { check(); if (known.has(file.sha)) continue; if (file.data.length > 5 * 1024 * 1024) throw new Error('File exceeds the 5 MiB mobile limit.'); progress(`Uploading binary/large object: ${file.path}`); const result = await object<{ sha: string }>(`${root}/git/blobs`, { content: fromByteArray(file.data), encoding: 'base64' }); if (result.sha !== file.sha) throw new Error('Blob hash mismatch. Nothing published.'); uploaded.add(file.sha); known.add(file.sha); save(); emit('upload'); }
    let treeSha = plan.baseTree;
    for (let index = 0; index < plan.batches.length; index += 1) { check(); const group = plan.batches[index].map((entry) => { const file = byPath.get(entry.path); return entry.content !== undefined && file && known.has(file.sha) ? { path: entry.path, type: entry.type, mode: entry.mode, sha: file.sha } : entry; }); progress(`Preparing multi-file batch ${index + 1}/${plan.batches.length} (${group.length} entries)`); emit('tree', index + 1); treeSha = await writeTree(group, treeSha); for (const entry of group) if (entry.content !== undefined) { const file = byPath.get(entry.path); if (!file) throw new Error('Unexpected staged file.'); uploaded.add(file.sha); known.add(file.sha); } save(); emit('tree', index + 1); }
    if (!treeSha) throw new Error('No staged tree.'); check(); progress('Verifying every reviewed path, mode and file hash'); emit('verify', plan.batches.length);
    const staged = await api<{ tree: TreeEntry[]; truncated: boolean }>(`${root}/git/trees/${treeSha}?recursive=1`, 'GET', undefined, signal); assertVerifiedTree(review.tree, staged.tree, staged.truncated);
    if (await head(full, options.base, signal) !== review.head) throw new Error('Base changed during upload. Rebuild preview.'); check(); progress('Creating project commit'); emit('commit', plan.batches.length);
    const commit = await object<{ sha: string }>(`${root}/git/commits`, { message: options.message, tree: treeSha, parents: [review.head] }); if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error('Invalid commit response.'); commitSha = commit.sha; save(); check();
    progress('Publishing NEW branch. A sent request cannot be recalled.'); emit('publish', plan.batches.length); save(true);
    try { check(); await api(`${root}/git/refs`, 'POST', { ref: `refs/heads/${options.branch}`, sha: commitSha }, signal); } catch (error) { if (error instanceof GitHubError && error.status >= 400 && error.status < 500 && error.status !== 408) { save(false); throw error; } throw new Error(`UNKNOWN_PUBLICATION: Check branch ${options.branch} and commit ${commitSha} on GitHub before retrying.`); }
    return { sha: commitSha, url: `https://github.com/${full}/commit/${commitSha}`, branchUrl: `https://github.com/${full}/tree/${enc(options.branch)}` };
  } finally { active = false; }
}
