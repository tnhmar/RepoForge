import { Inflate, strFromU8, strToU8 } from 'fflate';
import { safePath } from './logic/importPlan';
export const ZIP_LIMIT = 20 * 1024 * 1024;
export type ProjectFile = { path: string; data: Uint8Array; mode: '100644' | '100755' };
const fail = (message: string): never => { throw new Error(message); };
export function crc32(bytes: Uint8Array) { let crc = -1; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0); } return (crc ^ -1) >>> 0; }
export async function readZip(data: Uint8Array): Promise<ProjectFile[]> {
  if (data.length < 22 || data.length > ZIP_LIMIT) fail('ZIP must be between 22 bytes and 20 MiB.');
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const u16 = (at: number) => view.getUint16(at, true); const u32 = (at: number) => view.getUint32(at, true);
  let end = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i -= 1) if (u32(i) === 0x06054B50 && i + 22 + u16(i + 20) === data.length) { end = i; break; }
  if (end < 0) fail('Invalid ZIP end record.');
  const count = u16(end + 10); const start = u32(end + 16); const size = u32(end + 12);
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== count || count === 65535 || count > 1000 || start + size !== end) fail('Split, ZIP64, or oversized ZIP directories are unsupported.');
  const records: { path: string; offset: number; compressed: number; bytes: number; crc: number; method: number; flags: number; mode: '100644' | '100755'; directory: boolean; rawName: Uint8Array }[] = [];
  const seen = new Set<string>(); let total = 0; let cursor = start;
  for (let i = 0; i < count; i += 1) {
    if (cursor + 46 > end || u32(cursor) !== 0x02014B50) fail('Invalid ZIP central directory.');
    const flags = u16(cursor + 8); const method = u16(cursor + 10); const compressed = u32(cursor + 20); const bytes = u32(cursor + 24);
    const nameLength = u16(cursor + 28); const extraLength = u16(cursor + 30); const commentLength = u16(cursor + 32); const offset = u32(cursor + 42);
    if (cursor + 46 + nameLength + extraLength + commentLength > end || u16(cursor + 34) || [compressed, bytes, offset].includes(0xFFFFFFFF) || flags & 1 || flags & 64 || ![0, 8].includes(method)) fail('Encrypted, split, ZIP64, or unsupported compression entry.');
    const rawName = data.slice(cursor + 46, cursor + 46 + nameLength);
    if (!(flags & 2048) && rawName.some((b) => b > 127)) fail('Non-ASCII ZIP filenames must use UTF-8 encoding.');
    const name = strFromU8(rawName); const roundtrip = strToU8(name);
    if (roundtrip.length !== rawName.length || roundtrip.some((b, n) => b !== rawName[n])) fail('Invalid UTF-8 filename.');
    const directory = name.endsWith('/'); const path = safePath(directory ? name.slice(0, -1) : name);
    if (/[\x00-\x1F\x7F]/.test(path) || rawName.length > 1024 || path.split('/').length > 40) fail('Unsafe or excessively deep filename.');
    const folded = path.normalize('NFC').toLowerCase(); if (seen.has(folded)) fail('Duplicate or case-colliding archive entry.'); seen.add(folded);
    const unix = (u32(cursor + 38) >>> 16); const kind = unix & 0o170000;
    if (kind && kind !== (directory ? 0o040000 : 0o100000)) fail('Symlinks and special files are unsupported.');
    if (bytes > 5 * 1024 * 1024 || bytes > Math.max(1, compressed) * 200 || (directory && bytes !== 0)) fail('Entry exceeds file-size or expansion-ratio limits.');
    total += bytes; if (total > 50 * 1024 * 1024) fail('Extracted project exceeds 500 MiB.');
    for (let p = cursor + 46 + nameLength; p < cursor + 46 + nameLength + extraLength;) { if (p + 4 > cursor + 46 + nameLength + extraLength) fail('Invalid extra field.'); const length = u16(p + 2); if (u16(p) === 1 || p + 4 + length > cursor + 46 + nameLength + extraLength) fail('ZIP64 or invalid extra field.'); p += 4 + length; }
    records.push({ path, offset, compressed, bytes, crc: u32(cursor + 16), method, flags, mode: unix & 0o111 ? '100755' : '100644', directory, rawName });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== end || records.filter((r) => !r.directory).length > 300) fail('ZIP directory mismatch or more than 10,000 files.');
  const ranges: [number, number][] = []; const files: ProjectFile[] = [];
  for (const record of records) {
    const p = record.offset;
    if (p + 30 > start || u32(p) !== 0x04034B50 || u16(p + 6) !== record.flags || u16(p + 8) !== record.method) fail('Local ZIP header mismatch.');
    const nameLength = u16(p + 26); const begin = p + 30 + nameLength + u16(p + 28); const finish = begin + record.compressed;
    if (finish > start || nameLength !== record.rawName.length || record.rawName.some((b, i) => data[p + 30 + i] !== b)) fail('Invalid ZIP entry bounds or filename.');
    if (!(record.flags & 8) && (u32(p + 14) !== record.crc || u32(p + 18) !== record.compressed || u32(p + 22) !== record.bytes)) fail('ZIP size / checksum header mismatch.');
    if (ranges.some(([a, b]) => p < b && finish > a)) fail('Overlapping ZIP entries.'); ranges.push([p, finish]);
    const output = new Uint8Array(record.bytes); let written = 0;
    const emit = (chunk: Uint8Array) => { if (written + chunk.length > record.bytes) fail('ZIP expansion exceeds declared size.'); output.set(chunk, written); written += chunk.length; };
    if (record.method === 0) emit(data.subarray(begin, finish));
    else {
      const inflate = new Inflate((chunk) => emit(chunk));
      if (begin === finish) fail('Invalid deflate entry.');
      for (let at = begin; at < finish; at += 2048) inflate.push(data.subarray(at, Math.min(at + 2048, finish)), at + 2048 >= finish);
    }
    if (written !== record.bytes || crc32(output) !== record.crc) fail('ZIP file failed size or CRC integrity validation.');
    if (!record.directory) files.push({ path: record.path, data: output, mode: record.mode });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  const paths = new Set(files.map((f) => f.path.normalize('NFC').toLowerCase()));
  for (const entry of records) { const parts = entry.path.normalize('NFC').toLowerCase().split('/'); for (let i = 1; i < parts.length; i += 1) if (paths.has(parts.slice(0, i).join('/'))) fail('Archive file/directory collision.'); }
  if (!files.length) fail('Archive contains no regular files.');
  return files;
}
