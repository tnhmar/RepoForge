import { strFromU8, strToU8 } from 'fflate';
import type { TreeEntry } from '../github';
import type { ProjectFile } from '../zip';
export const TREE_BATCH_BYTES = 1024 * 1024;
export const TREE_BATCH_ENTRIES = 100;
export const INLINE_FILE_BYTES = 256 * 1024;
export type UploadFile = ProjectFile & { sha: string };
export type UploadEntry = { path: string; mode: string; type: TreeEntry['type']; sha?: string; content?: string };
const envelope = strToU8(JSON.stringify({ base_tree: '0'.repeat(40), tree: [] })).length;
export function entryBytes(entry: UploadEntry) { return strToU8(JSON.stringify(entry)).length; }
export function losslessText(bytes: Uint8Array): string | null {
  if (bytes.length > INLINE_FILE_BYTES || bytes.includes(0)) return null;
  try { const text = strFromU8(bytes); const encoded = strToU8(text); return encoded.length === bytes.length && encoded.every((byte, index) => byte === bytes[index]) ? text : null; } catch { return null; }
}
export function packTrees(entries: UploadEntry[], budget = TREE_BATCH_BYTES, maximum = TREE_BATCH_ENTRIES): UploadEntry[][] {
  if (budget <= envelope || maximum < 1) throw new Error('Invalid tree batch limits.');
  const batches: UploadEntry[][] = []; let group: UploadEntry[] = []; let size = envelope;
  for (const entry of entries) {
    const bytes = entryBytes(entry); if (envelope + bytes > budget) throw new Error('A tree entry exceeds the request-size budget.');
    if (group.length && (group.length >= maximum || size + 1 + bytes > budget)) { batches.push(group); group = []; size = envelope; }
    size += bytes + (group.length ? 1 : 0); group.push(entry);
  }
  if (group.length || !batches.length) batches.push(group); return batches;
}
export function planUpload(tree: TreeEntry[], files: UploadFile[], known: Set<string>) {
  const incoming = new Map(files.map((file) => [file.path, file])); const blobs = new Map<string, UploadFile>();
  const entries: UploadEntry[] = tree.map((entry) => {
    const reference = { path: entry.path, mode: entry.mode, type: entry.type, sha: entry.sha }; const file = incoming.get(entry.path);
    if (!file || known.has(file.sha)) return reference;
    const content = losslessText(file.data);
    if (content !== null) { const inline: UploadEntry = { path: entry.path, mode: entry.mode, type: 'blob', content }; if (envelope + entryBytes(inline) <= TREE_BATCH_BYTES) return inline; }
    blobs.set(file.sha, file); return reference;
  });
  return { blobs: [...blobs.values()], batches: packTrees(entries) };
}
export function assertVerifiedTree(expected: TreeEntry[], actual: TreeEntry[], truncated: boolean) {
  if (truncated) throw new Error('GitHub truncated the staged tree. Nothing was published.');
  const leaves = actual.filter((entry) => entry.type !== 'tree'); const byPath = new Map(leaves.map((entry) => [entry.path, entry]));
  if (leaves.length !== expected.length || byPath.size !== leaves.length || expected.some((entry) => { const other = byPath.get(entry.path); return !other || other.sha !== entry.sha || other.mode !== entry.mode || other.type !== entry.type; })) throw new Error('Staged tree differs from the reviewed paths, modes or bytes. Nothing was published.');
}
