import * as Crypto from 'expo-crypto';
import { fromByteArray } from 'base64-js';
import { strToU8 } from 'fflate';
import { api, enc, GitHubError, head, repoPath, snapshot, type Repo, type TreeEntry } from './github';
import { planImport } from './logic/importPlan';
import type { ProjectFile } from './zip';
export type Options = { base: string; branch: string; destination: string; stripRoot: boolean; excludeSensitive: boolean; replace: boolean; message: string };
export type Review = { repository: Repo; options: Options; head: string; files: (ProjectFile & { sha: string })[]; tree: TreeEntry[]; changes: { path: string; status: string }[]; excluded: string[]; warnings: string[] };
export function validBranch(branch: string) { return !!branch && branch !== '@' && !/[\x00-\x20\x7F~^:?*\[\]\\]/.test(branch) && !branch.includes('..') && !branch.includes('@{') && branch.split('/').every((part) => !!part && !part.startsWith('.') && !part.endsWith('.') && !part.endsWith('.lock')); }
export async function blobSha(data: Uint8Array) {
  const header = strToU8(`blob ${data.length}\0`); const bytes = new Uint8Array(header.length + data.length); bytes.set(header); bytes.set(data, header.length);
  return Array.from(new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA1, bytes))).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function assembleTree(base: TreeEntry[], files: (ProjectFile & { sha: string })[], destination: string, replace: boolean) {
  const incoming = new Map(files.map((file) => [file.path, file]));
  const within = (path: string) => !destination || path === destination || path.startsWith(`${destination}/`);
  const result = new Map(base.filter((entry) => !(replace && within(entry.path) && !incoming.has(entry.path))).map((entry) => [entry.path, entry]));
  const changes: { path: string; status: string }[] = [];
  for (const entry of base) if (!result.has(entry.path)) changes.push({ path: entry.path, status: 'deleted' });
  for (const file of files) {
    const previous = result.get(file.path);
    changes.push({ path: file.path, status: !previous ? 'added' : previous.sha === file.sha && previous.mode === file.mode && previous.type === 'blob' ? 'unchanged' : 'modified' });
    result.set(file.path, { path: file.path, mode: file.mode, type: 'blob', sha: file.sha });
  }
  const folded = new Set<string>();
  for (const entry of result.values()) { const key = entry.path.normalize('NFC').toLowerCase(); if (folded.has(key)) throw new Error('Resulting tree contains case-colliding paths.'); folded.add(key); }
  for (const entry of result.values()) { const parts = entry.path.normalize('NFC').toLowerCase().split('/'); for (let i = 1; i < parts.length; i += 1) if (folded.has(parts.slice(0, i).join('/'))) throw new Error('A file blocks a destination folder. Change destination or explicitly replace within its scope.'); }
  if (result.size > 20000) throw new Error('Resulting tree exceeds 20,000 files.');
  return { tree: [...result.values()], changes };
}
export async function reviewImport(repository: Repo, source: ProjectFile[], options: Options, signal?: AbortSignal): Promise<Review> {
  if (repository.archived || repository.permissions?.push === false) throw new Error('This repository is archived or your account cannot push.');
  if (!validBranch(options.branch) || !validBranch(options.base) || options.branch === options.base || !options.message.trim()) throw new Error('Choose a valid base, a different new branch, and a commit message.');
  const plan = planImport(source.map((f) => ({ path: f.path, bytes: f.data.length })), options);
  if (!plan.files.length) throw new Error('No files remain after exclusions.');
  const allowed = new Set(plan.files.map((f) => f.path)); const files: Review['files'] = [];
  for (const file of source) {
    if (signal?.aborted) throw new Error('Cancelled');
    const relative = plan.strippedRoot ? file.path.split('/').slice(1).join('/') : file.path;
    const path = options.destination.trim() ? `${options.destination.trim()}/${relative}` : relative;
    if (allowed.has(path)) files.push({ ...file, path, sha: await blobSha(file.data) });
  }
  const base = await snapshot(repository.full_name, options.base, signal);
  const result = assembleTree(base.tree, files, options.destination.trim(), options.replace);
  if (!result.changes.some((c) => c.status !== 'unchanged')) throw new Error('No project changes to commit.');
  return { repository, options: { ...options, destination: options.destination.trim(), message: options.message.trim() }, head: base.head, files, ...result, excluded: plan.excluded, warnings: [...plan.warnings, ...(result.changes.some((c) => c.path.startsWith('.github/workflows/') && c.status !== 'unchanged') ? ['Workflow files change: Workflows write permission is required, and pushing may trigger GitHub Actions.'] : [])] };
}
let active = false;
const uploaded = new Set<string>();
export async function publish(review: Review, progress: (text: string) => void, checkpoint: (sha: string) => void, signal: AbortSignal) {
  if (active) throw new Error('Another publication is already active.'); active = true;
  const full = review.repository.full_name; const root = repoPath(full); const options = review.options;
  try {
    if (await head(full, options.base, signal) !== review.head) throw new Error('Base branch changed. Build a fresh preview.');
    try { await head(full, options.branch, signal); throw new Error('Destination branch already exists. Choose a new branch.'); } catch (e) { if (!(e instanceof GitHubError && e.status === 404)) throw e; }
    const changed = new Set(review.changes.filter((c) => c.status === 'added' || c.status === 'modified').map((c) => c.path));
    let done = 0;
    for (const file of review.files.filter((f) => changed.has(f.path))) {
      if (signal.aborted) throw new Error('Cancelled');
      progress(`Uploading file ${++done} of ${changed.size}: ${file.path}. Writes are paced for API limits.`);
      const cache = `${review.repository.id}:${file.sha}`;
      if (!uploaded.has(cache)) {
        const blob = await api<{ sha: string }>(`${root}/git/blobs`, 'POST', { content: fromByteArray(file.data), encoding: 'base64' }, signal);
        if (blob.sha !== file.sha) throw new Error('Uploaded blob hash mismatch. Nothing published.'); uploaded.add(cache);
      }
    }
    progress('Creating project tree');
    const tree = await api<{ sha: string }>(`${root}/git/trees`, 'POST', { tree: review.tree }, signal);
    if (await head(full, options.base, signal) !== review.head) throw new Error('Base branch changed during upload. Build a fresh preview.');
    progress('Creating commit');
    const commit = await api<{ sha: string }>(`${root}/git/commits`, 'POST', { message: options.message, tree: tree.sha, parents: [review.head] }, signal);
    checkpoint(commit.sha);
    if (signal.aborted) throw new Error('Cancelled before branch publication.');
    progress('Publishing the NEW branch. A request already sent cannot be recalled.');
    try { await api(`${root}/git/refs`, 'POST', { ref: `refs/heads/${options.branch}`, sha: commit.sha }, signal); }
    catch (e) { if (e instanceof GitHubError && e.status === 0) throw new Error(`UNKNOWN_PUBLICATION: Check branch ${options.branch} and commit ${commit.sha} on GitHub before retrying.`); throw e; }
    return { sha: commit.sha, url: `https://github.com/${full}/commit/${commit.sha}`, branchUrl: `https://github.com/${full}/tree/${enc(options.branch)}` };
  } finally { active = false; }
}
