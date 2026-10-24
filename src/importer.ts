import * as Crypto from 'expo-crypto';
import { strToU8 } from 'fflate';
import { snapshot, type Repo, type TreeEntry } from './github';
import type { JobCheckpoint } from './liveStore';
import { planImport } from './logic/importPlan';
import type { ProjectFile } from './zip';
export { publishBatched as publish } from './batchPublish';
export type Options = { base: string; branch: string; destination: string; stripRoot: boolean; excludeSensitive: boolean; replace: boolean; message: string };
export type Review = { repository: Repo; options: Options; head: string; baseTree?: string; baseEntries?: TreeEntry[]; baseObjects?: string[]; files: (ProjectFile & { sha: string })[]; tree: TreeEntry[]; changes: { path: string; status: string }[]; excluded: string[]; warnings: string[] };
export type PublishCheckpoint = JobCheckpoint;
export function validBranch(branch: string) { return !!branch && branch !== '@' && !/[\x00-\x20\x7F~^:?*\[\]\\]/.test(branch) && !branch.includes('..') && !branch.includes('@{') && branch.split('/').every((part) => !!part && !part.startsWith('.') && !part.endsWith('.') && !part.endsWith('.lock')); }
export async function blobSha(data: Uint8Array) { const header = strToU8(`blob ${data.length}\0`); const bytes = new Uint8Array(header.length + data.length); bytes.set(header); bytes.set(data, header.length); return Array.from(new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA1, bytes))).map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
export function assembleTree(base: TreeEntry[], files: (ProjectFile & { sha: string })[], destination: string, replace: boolean) {
  const incoming = new Map(files.map((file) => [file.path, file])); const within = (path: string) => !destination || path === destination || path.startsWith(`${destination}/`);
  const result = new Map(base.filter((entry) => !(replace && within(entry.path) && !incoming.has(entry.path))).map((entry) => [entry.path, entry])); const changes: { path: string; status: string }[] = [];
  for (const entry of base) if (!result.has(entry.path)) changes.push({ path: entry.path, status: 'deleted' });
  for (const file of files) { const previous = result.get(file.path); changes.push({ path: file.path, status: !previous ? 'added' : previous.sha === file.sha && previous.mode === file.mode && previous.type === 'blob' ? 'unchanged' : 'modified' }); result.set(file.path, { path: file.path, mode: file.mode, type: 'blob', sha: file.sha }); }
  const folded = new Set<string>(); for (const entry of result.values()) { const key = entry.path.normalize('NFC').toLowerCase(); if (folded.has(key)) throw new Error('Resulting tree contains case-colliding paths.'); folded.add(key); }
  for (const entry of result.values()) { const parts = entry.path.normalize('NFC').toLowerCase().split('/'); for (let index = 1; index < parts.length; index += 1) if (folded.has(parts.slice(0, index).join('/'))) throw new Error('A file blocks a destination folder. Change destination or explicitly replace within its scope.'); }
  if (result.size > 20000) throw new Error('Resulting tree exceeds 20,000 files.'); return { tree: [...result.values()], changes };
}
export async function reviewImport(repository: Repo, source: ProjectFile[], options: Options, signal?: AbortSignal): Promise<Review> {
  if (repository.archived || repository.permissions?.push === false) throw new Error('Repository is archived or your account cannot push.');
  if (!validBranch(options.branch) || !validBranch(options.base) || options.branch === options.base || !options.message.trim()) throw new Error('Choose an existing base, a different new branch, and a commit message.');
  const plan = planImport(source.map((file) => ({ path: file.path, bytes: file.data.length })), options); if (!plan.files.length) throw new Error('No files remain after exclusions.');
  const allowed = new Set(plan.files.map((file) => file.path)); const files: Review['files'] = [];
  for (const file of source) { if (signal?.aborted) throw new Error('Cancelled'); const relative = plan.strippedRoot ? file.path.split('/').slice(1).join('/') : file.path; const path = options.destination.trim() ? `${options.destination.trim()}/${relative}` : relative; if (allowed.has(path)) files.push({ ...file, path, sha: await blobSha(file.data) }); }
  const base = await snapshot(repository.full_name, options.base, signal); const result = assembleTree(base.tree, files, options.destination.trim(), options.replace); if (!result.changes.some((entry) => entry.status !== 'unchanged')) throw new Error('No project changes to commit.');
  return { repository, options: { ...options, destination: options.destination.trim(), message: options.message.trim() }, head: base.head, baseTree: base.treeSha, baseEntries: base.tree, baseObjects: base.tree.filter((entry) => entry.type === 'blob').map((entry) => entry.sha), files, ...result, excluded: plan.excluded, warnings: [...plan.warnings, ...(result.changes.some((entry) => entry.path.startsWith('.github/workflows/') && entry.status !== 'unchanged') ? ['Workflow files change: Workflows write permission is required and GitHub Actions may run.'] : [])] };
}
