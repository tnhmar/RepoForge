export const featureFields = [['has_issues', 'Issues'], ['has_projects', 'Repository projects'], ['has_wiki', 'Wiki'], ['has_downloads', 'Downloads compatibility'], ['is_template', 'Template repository']] as const;
export const mergeFields = [['allow_merge_commit', 'Merge commits'], ['allow_squash_merge', 'Squash merging'], ['allow_rebase_merge', 'Rebase merging'], ['allow_auto_merge', 'Auto-merge'], ['delete_branch_on_merge', 'Delete merged head branches']] as const;
export const messageFields: Record<string, string[]> = { squash_merge_commit_title: ['PR_TITLE', 'COMMIT_OR_PR_TITLE'], squash_merge_commit_message: ['PR_BODY', 'COMMIT_MESSAGES', 'BLANK'], merge_commit_title: ['PR_TITLE', 'MERGE_MESSAGE'], merge_commit_message: ['PR_TITLE', 'PR_BODY', 'BLANK'] };
export type Property = { property_name: string; value_type: string; required?: boolean; require_explicit_values?: boolean; default_value?: string | string[] | null; allowed_values?: string[] | null };
export type Draft = { owner: string; name: string; description: string; homepage: string; private: boolean; source: 'empty' | 'template'; template: string; allBranches: boolean; readme: boolean; gitignore: string; license: string; flags: Record<string, boolean | undefined>; messages: Record<string, string>; topics: string[]; defaultBranch: string; discussions?: boolean; forking?: boolean; signoff?: boolean; teamId: string; teamSlug: string; teamRole: string; properties: Record<string, string | string[]> };
export type Step = { label: string; path: string; method: 'PATCH' | 'PUT'; body: Record<string, unknown>; branch?: string };
export type Plan = { full: string; template: string | null; path: string; body: Record<string, unknown>; steps: Step[] };
export const initialDraft = (login: string): Draft => ({ owner: login, name: '', description: '', homepage: '', private: true, source: 'empty', template: '', allBranches: false, readme: false, gitignore: '', license: '', flags: {}, messages: {}, topics: [], defaultBranch: '', teamId: '', teamSlug: '', teamRole: 'push', properties: {} });
export function validName(value: string) { return /^[A-Za-z0-9_.-]{1,100}$/.test(value) && !['.', '..'].includes(value); }
export function validBranch(value: string) { return !!value && value !== '@' && !/[\x00-\x20\x7F~^:?*\[\]\\]/.test(value) && !value.includes('..') && !value.includes('@{') && value.split('/').every((part) => !!part && !part.startsWith('.') && !part.endsWith('.') && !part.endsWith('.lock')); }
export function makePlan(draft: Draft, login: string, schema: Property[] = []): Plan {
  const owner = draft.owner.trim(); const name = draft.name.trim(); const org = owner.toLowerCase() !== login.toLowerCase(); const e = encodeURIComponent;
  if (!/^[A-Za-z0-9-]+$/.test(owner) || !validName(name)) throw new Error('Choose a valid owner and repository name.');
  if (draft.homepage.trim() && !/^https?:\/\/[^\s]+$/.test(draft.homepage.trim())) throw new Error('Homepage must start with HTTP or HTTPS.');
  if (draft.defaultBranch && !validBranch(draft.defaultBranch)) throw new Error('Invalid default branch name.');
  if (draft.defaultBranch && draft.source === 'empty' && !draft.readme) throw new Error('Add a README or leave the default branch blank until files exist.');
  if (draft.topics.length > 20 || draft.topics.some((topic) => !/^[a-z0-9][a-z0-9-]{0,49}$/.test(topic))) throw new Error('Use at most 20 lowercase topics, each no longer than 50 characters.');
  if (!org && (draft.teamId || Object.keys(draft.properties).length)) throw new Error('Team access and custom properties require an organization owner.');
  if (draft.teamId && (!Number.isSafeInteger(Number(draft.teamId)) || Number(draft.teamId) <= 0 || !/^[A-Za-z0-9-]+$/.test(draft.teamSlug) || !['pull', 'triage', 'push', 'maintain', 'admin'].includes(draft.teamRole))) throw new Error('Choose a valid team and role.');
  for (const property of schema) { const value = draft.properties[property.property_name]; if (property.required && property.require_explicit_values && (value === undefined || value === '' || (Array.isArray(value) && !value.length))) throw new Error(`Choose a value for ${property.property_name}.`); if (value !== undefined && property.allowed_values && (Array.isArray(value) ? value : [value]).some((item) => !property.allowed_values!.includes(item))) throw new Error(`Invalid value for ${property.property_name}.`); }
  const settings: Record<string, unknown> = {};
  for (const [key] of [...featureFields, ...mergeFields]) if (typeof draft.flags[key] === 'boolean') settings[key] = draft.flags[key];
  if (['allow_merge_commit', 'allow_squash_merge', 'allow_rebase_merge'].every((key) => settings[key] === false)) throw new Error('Keep at least one merge method enabled.');
  for (const [key, value] of Object.entries(draft.messages)) { if (!value) continue; if (!messageFields[key]?.includes(value)) throw new Error('Invalid merge-message option.'); if (key.startsWith('squash_') && settings.allow_squash_merge === false) continue; if (key.startsWith('merge_') && settings.allow_merge_commit === false) continue; settings[key] = value; }
  if (settings.squash_merge_commit_message && !settings.squash_merge_commit_title) settings.squash_merge_commit_title = 'COMMIT_OR_PR_TITLE';
  if (settings.merge_commit_message && !settings.merge_commit_title) settings.merge_commit_title = 'MERGE_MESSAGE';
  const full = `${owner}/${name}`; const root = `/repos/${e(owner)}/${e(name)}`; const steps: Step[] = [];
  const add = (label: string, path: string, method: 'PATCH' | 'PUT', body: Record<string, unknown>) => steps.push({ label, path, method, body });
  let path: string; let body: Record<string, unknown>; let template: string | null = null;
  if (draft.source === 'template') {
    const parts = draft.template.trim().split('/'); if (parts.length !== 2 || !/^[A-Za-z0-9-]+$/.test(parts[0]) || !validName(parts[1])) throw new Error('Choose a template using owner/repository.');
    template = parts.join('/'); path = `/repos/${parts.map(e).join('/')}/generate`; body = { owner, name, private: draft.private, description: draft.description.trim(), include_all_branches: draft.allBranches };
    const values = { ...settings, ...(draft.homepage.trim() ? { homepage: draft.homepage.trim() } : {}) };
    if (Object.keys(values).length) add('Apply template repository settings', root, 'PATCH', values);
  } else {
    path = org ? `/orgs/${e(owner)}/repos` : '/user/repos';
    body = { name, description: draft.description.trim(), homepage: draft.homepage.trim(), private: draft.private, auto_init: draft.readme, ...settings, ...(org ? { visibility: draft.private ? 'private' : 'public' } : {}), ...(draft.gitignore ? { gitignore_template: draft.gitignore } : {}), ...(draft.license ? { license_template: draft.license } : {}), ...(org && draft.teamId ? { team_id: Number(draft.teamId) } : {}), ...(org && Object.keys(draft.properties).length ? { custom_properties: draft.properties } : {}) };
  }
  const extra: Record<string, unknown> = {};
  if (draft.discussions !== undefined) extra.has_discussions = draft.discussions;
  if (draft.forking !== undefined) extra.allow_forking = draft.forking;
  if (draft.signoff !== undefined) extra.web_commit_signoff_required = draft.signoff;
  if (Object.keys(extra).length) add('Apply additional settings', root, 'PATCH', extra);
  if (draft.topics.length) add('Set topics', `${root}/topics`, 'PUT', { names: draft.topics });
  if (draft.defaultBranch) steps.push({ label: `Set default branch: ${draft.defaultBranch}`, path: root, method: 'PATCH', branch: draft.defaultBranch, body: { default_branch: draft.defaultBranch } });
  if (draft.teamId) add('Apply team role', `/orgs/${e(owner)}/teams/${e(draft.teamSlug)}/repos/${e(owner)}/${e(name)}`, 'PUT', { permission: draft.teamRole });
  if (template && org && Object.keys(draft.properties).length) add('Set custom properties', `/orgs/${e(owner)}/properties/values`, 'PATCH', { repository_names: [name], properties: Object.entries(draft.properties).map(([property_name, value]) => ({ property_name, value })) });
  return { full, template, path, body, steps };
}
