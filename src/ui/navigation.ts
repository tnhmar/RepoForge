export type MainDestination = '/' | '/repositories' | '/activity' | '/work' | '/account';
export function repositoryIdentity(full: string) { const parts = full.trim().split('/'); if (parts.length !== 2 || !/^[A-Za-z0-9-]+$/.test(parts[0]) || !/^[A-Za-z0-9_.-]+$/.test(parts[1]) || ['.', '..'].includes(parts[1])) return null; return { owner: parts[0], name: parts[1], full: parts.join('/') }; }
// Compatibility entry until canonical nested repository routes land in report commit 2.
export const repositoryHref = (full: string) => ({ pathname: '/repository/[name]' as const, params: { name: full } });
export function githubUrl(value: string) { return /^https:\/\/github\.com\//.test(value); }
export function activityLabel(status: string) { const labels: Record<string, string> = { started: 'Result not confirmed', unknown: 'Needs verification', completed: 'Published', failed: 'Failed', creating: 'Creation not confirmed', rejected: 'Not accepted', setup: 'Setup pending', attention: 'Setup needs attention', done: 'Repository ready' }; return labels[status] || status; }
