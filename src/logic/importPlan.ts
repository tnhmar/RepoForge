export interface ArchiveEntry { path: string; bytes: number }
export interface ImportOptions { stripRoot: boolean; destination: string; excludeSensitive: boolean }
export function safePath(path: string): string {
  if (!path || path.includes('\\') || path.includes('\0') || path.startsWith('/') || /^[A-Za-z]:/.test(path)) throw new Error('Unsafe archive path');
  const parts = path.split('/');
  if (parts.some((p) => !p || p === '.' || p === '..' || p.toLowerCase() === '.git')) throw new Error('Unsafe archive path');
  return parts.join('/');
}
export function planImport(entries: ArchiveEntry[], options: ImportOptions) {
  if (entries.length > 10000) throw new Error('Too many files for this preview');
  const destination = options.destination.trim() ? safePath(options.destination.trim()) : '';
  const validated = entries.map((entry) => ({ ...entry, path: safePath(entry.path) }));
  if (validated.some((e) => !Number.isSafeInteger(e.bytes) || e.bytes < 0)) throw new Error('Invalid file size');
  if (validated.reduce((sum, e) => sum + e.bytes, 0) > 250 * 1024 * 1024) throw new Error('Preview exceeds 250 MiB');
  const roots = new Set(validated.map((entry) => entry.path.split('/')[0]));
  const strip = options.stripRoot && roots.size === 1 && validated.every((e) => e.path.includes('/'));
  const sensitive = (path: string) => /(^|\/)(\.env(?:\..*)?|id_rsa|id_ed25519)$|\.(pem|p12|keystore|jks)$/i.test(path);
  const seen = new Set<string>();
  const excluded: string[] = [];
  const warnings: string[] = [];
  const files: ArchiveEntry[] = [];
  for (const entry of validated) {
    const relative = strip ? entry.path.split('/').slice(1).join('/') : entry.path;
    const path = safePath(destination ? `${destination}/${relative}` : relative);
    if (seen.has(path.toLowerCase())) throw new Error(`Duplicate or case-colliding path: ${path}`);
    seen.add(path.toLowerCase());
    if (sensitive(path)) {
      if (options.excludeSensitive) { excluded.push(path); continue; }
      warnings.push(`Potential sensitive file: ${path}`);
    }
    files.push({ path, bytes: entry.bytes });
  }
  const paths = new Set(files.map((f) => f.path.toLowerCase()));
  for (const file of files) {
    const parts = file.path.toLowerCase().split('/');
    for (let i = 1; i < parts.length; i += 1) {
      if (paths.has(parts.slice(0, i).join('/'))) throw new Error('File/directory collision');
    }
  }
  return { files, excluded, warnings, bytes: files.reduce((sum, f) => sum + f.bytes, 0), strippedRoot: strip };
}
