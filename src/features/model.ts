export type Actor = { id: number; login: string };
export type Thread = { number: number; title: string; body: string | null; state: string; user: Actor; html_url: string; pull_request?: object; labels: { name: string }[]; assignees: Actor[]; head?: { sha: string; ref: string }; base?: { ref: string }; draft?: boolean; merged?: boolean };
export type Comment = { id: number; body: string; user: Actor };
export type PullReview = { id: number; body: string | null; state: string; user: Actor; commit_id: string };
export type ChangedFile = { filename: string; status: string; additions: number; deletions: number; patch?: string };
export type Workflow = { id: number; name: string; path: string; state: string };
export type Run = { id: number; name: string; status: string; conclusion: string | null; head_branch: string; html_url: string; run_number: number };
export type ActionJob = { id: number; name: string; status: string; conclusion: string | null; html_url: string; steps?: { number: number; name: string; status: string; conclusion: string | null }[] };
export type Artifact = { id: number; name: string; size_in_bytes: number; expired: boolean };
export type Release = { id: number; tag_name: string; name: string | null; body: string | null; target_commitish: string; draft: boolean; prerelease: boolean; immutable?: boolean; html_url: string; assets: { id: number; name: string; size: number; browser_download_url: string }[] };
export type DiffLine = { line: number; side: 'LEFT' | 'RIGHT'; text: string };
export function diffLines(patch: string): DiffLine[] {
  const result: DiffLine[] = []; let left = 0; let right = 0; let hunk = false;
  for (const text of patch.split('\n')) {
    const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text);
    if (match) { left = Number(match[1]); right = Number(match[2]); hunk = true; continue; }
    if (!hunk || text.startsWith('\\')) continue;
    if (text.startsWith('-')) result.push({ line: left++, side: 'LEFT', text });
    else if (text.startsWith('+')) result.push({ line: right++, side: 'RIGHT', text });
    else if (text.startsWith(' ')) { result.push({ line: right++, side: 'RIGHT', text }); left += 1; }
  }
  return result;
}
export function validRepository(full: string) { const parts = full.split('/'); return parts.length === 2 && /^[A-Za-z0-9-]+$/.test(parts[0]) && /^[A-Za-z0-9_.-]+$/.test(parts[1]) && !['.', '..'].includes(parts[1]); }
export function csv(value: string) { return [...new Set(value.split(',').map((part) => part.trim()).filter(Boolean))]; }
export function dispatchInputs(value: string): Record<string, string | number | boolean> {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).length > 25 || Object.values(parsed).some((item) => !['string', 'number', 'boolean'].includes(typeof item))) throw new Error('Inputs must be a JSON object with at most 25 string, number or boolean values.');
  return parsed as Record<string, string | number | boolean>;
}
