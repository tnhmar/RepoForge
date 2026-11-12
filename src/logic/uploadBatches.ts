import { strFromU8, strToU8 } from 'fflate';
import type { TreeEntry } from '../github';
import type { ProjectFile } from '../zip';
export const TREE_BATCH_BYTES = 1024 * 1024;
export const TREE_BATCH_ENTRIES = 100;
export type UploadFile = ProjectFile & { sha: string };
export type UploadEntry = { path: string; mode: string; type: TreeEntry['type']; sha?: string | null; content?: string };
const overhead = strToU8(JSON.stringify({ base_tree: '0'.repeat(40), tree: [] })).length;
const bytes = (entry: UploadEntry) => strToU8(JSON.stringify(entry)).length;
export function losslessText(data: Uint8Array) { if (data.length > 256 * 1024 || data.includes(0)) return null; try { const text = strFromU8(data); const copy = strToU8(text); return copy.length === data.length && copy.every((value, index) => value === data[index]) ? text : null; } catch { return null; } }
export function packTrees(entries: UploadEntry[], budget = TREE_BATCH_BYTES, maximum = TREE_BATCH_ENTRIES) {
  if (budget <= overhead || maximum < 1) throw new Error('Invalid batch limits.');
  const batches: UploadEntry[][] = []; let batch: UploadEntry[] = []; let size = overhead;
  for (const entry of entries) { const count = bytes(entry); if (overhead + count > budget) throw new Error('Tree entry exceeds request budget.'); if (batch.length && (batch.length >= maximum || size + count + 1 > budget)) { batches.push(batch); batch = []; size = overhead; } size += count + (batch.length ? 1 : 0); batch.push(entry); }
  if (batch.length) batches.push(batch); return batches;
}
export function planUpload(tree: TreeEntry[], files: UploadFile[], known: Set<string>, base?: { sha: string; tree: TreeEntry[] }) {
  const previous = new Map(base?.tree.map((entry) => [entry.path, entry]) || []); const paths = new Set(tree.map((entry) => entry.path));
  const incoming = new Map(files.map((file) => [file.path, file])); const blobs = new Map<string, UploadFile>();
  const deletions: UploadEntry[] = base ? base.tree.filter((entry) => !paths.has(entry.path)).map((entry) => ({ path: entry.path, type: entry.type, mode: entry.mode, sha: null })) : [];
  const entries: UploadEntry[] = tree.filter((entry) => { const old = previous.get(entry.path); return !old || old.sha !== entry.sha || old.type !== entry.type || old.mode !== entry.mode; }).map((entry) => {
    const reference = { path: entry.path, type: entry.type, mode: entry.mode, sha: entry.sha }; const file = incoming.get(entry.path); if (!file || known.has(file.sha)) return reference;
    const content = losslessText(file.data); if (content !== null) { const inline: UploadEntry = { path: entry.path, type: 'blob', mode: entry.mode, content }; if (overhead + bytes(inline) <= TREE_BATCH_BYTES) return inline; }
    blobs.set(file.sha, file); return reference;
  });
  return { baseTree: base?.sha, blobs: [...blobs.values()], batches: [...packTrees(deletions), ...packTrees(entries)] };
}
export function assertVerifiedTree(expected: TreeEntry[], actual: TreeEntry[], truncated: boolean) { const leaves = actual.filter((entry) => entry.type !== 'tree'); const paths = new Map(leaves.map((entry) => [entry.path, entry])); if (truncated || leaves.length !== expected.length || paths.size !== leaves.length || expected.some((entry) => { const other = paths.get(entry.path); return !other || other.sha !== entry.sha || other.mode !== entry.mode || other.type !== entry.type; })) throw new Error('Staged tree does not exactly match the reviewed paths, modes and hashes, or was truncated. Nothing was published.'); }
