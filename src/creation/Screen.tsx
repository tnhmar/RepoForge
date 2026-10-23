import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';
import { Button, Checkbox, Chip, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { useSession } from '../auth';
import { api } from '../github';
import { Page } from '../components/ui';
import { InlineError, Loading, PageTitle } from '../ux/primitives';
import { refreshRepositories, useRepositoryIndex } from '../ux/repositoryIndex';
import { Picker, type Option } from './Choice';
import { featureFields, initialDraft, makePlan, mergeFields, messageFields, type Draft, type Property } from './model';
import { adoptRepository, clearJob, findRepository, restoreJob, startCreation, useCreation } from './runner';
function useRemote<T>(load: (signal: AbortSignal) => Promise<T>) { const [data, setData] = useState<T>(); const [error, setError] = useState(''); useEffect(() => { let active = true; const controller = new AbortController(); void load(controller.signal).then((result) => { if (active) { setData(result); setError(''); } }).catch((e) => { if (active) { setData(undefined); setError(e instanceof Error ? e.message : 'Unavailable'); } }); return () => { active = false; controller.abort(); }; }, [load]); return { data, error }; }
function Tri({ label, value, change, disabled }: { label: string; value: boolean | undefined; change: (value: boolean | undefined) => void; disabled: boolean }) { return <Picker label={label} value={value === undefined ? '' : String(value)} options={[{ value: '', label: 'GitHub default' }, { value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} disabled={disabled} change={(next) => change(next === '' ? undefined : next === 'true')} />; }
function Group({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: ReactNode }) { const theme = useTheme(); return <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant, gap: 12, paddingTop: 8 }}><Pressable accessibilityRole='button' accessibilityState={{ expanded: open }} onPress={toggle} style={{ minHeight: 44, justifyContent: 'center' }}><Text variant='titleMedium'>{open ? '▾' : '▸'} {title}</Text></Pressable>{open ? children : null}</View>; }
export function CreationScreen() {
  const user = useSession((s) => s.user); const router = useRouter(); const theme = useTheme(); const state = useCreation(); const index = useRepositoryIndex();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(user?.login || '')); const [groups, setGroups] = useState<Record<string, boolean>>({}); const [error, setError] = useState(''); const [topic, setTopic] = useState(''); const [confirm, setConfirm] = useState<'adopt' | 'clear' | null>(null); const [found, setFound] = useState<{ full_name: string; created_at: string } | null>(null);
  const field = <K extends keyof Draft,>(key: K, value: Draft[K]) => setDraft((old) => ({ ...old, [key]: value }));
  const org = !!user && user.login.toLowerCase() !== draft.owner.toLowerCase(); const busy = state.busy; const job = state.job?.userId === user?.id ? state.job : null;
  useEffect(() => { if (user) void restoreJob(user.id).catch(() => setError('Could not restore pending setup.')); }, [user?.id]);
  const owners = useRemote(useCallback(async (signal: AbortSignal) => { const values: Option[] = [{ value: user?.login || '', label: user?.login || 'Personal account' }]; for (let page = 1; ; page += 1) { const result = await api<{ installations: { account: { login: string; type: string } }[]; total_count: number }>(`/user/installations?per_page=100&page=${page}`, 'GET', undefined, signal); for (const item of result.installations) if (item.account.type === 'Organization' && !values.some((value) => value.value === item.account.login)) values.push({ value: item.account.login, label: `${item.account.login} (organization)` }); if (page * 100 >= result.total_count || !result.installations.length) break; } return values; }, [user?.id]));
  const ignores = useRemote(useCallback((signal: AbortSignal) => api<string[]>('/gitignore/templates', 'GET', undefined, signal), []));
  const licenses = useRemote(useCallback((signal: AbortSignal) => api<{ key: string; name: string }[]>('/licenses?per_page=100', 'GET', undefined, signal), []));
  const teams = useRemote(useCallback(async (signal: AbortSignal) => { const values: { id: number; slug: string; name: string }[] = []; if (!org || !groups.organization) return values; for (let page = 1; ; page += 1) { const items = await api<typeof values>(`/orgs/${encodeURIComponent(draft.owner)}/teams?per_page=100&page=${page}`, 'GET', undefined, signal); values.push(...items); if (items.length < 100 || values.length >= 1000) break; } return values; }, [org, groups.organization, draft.owner]));
  const properties = useRemote(useCallback((signal: AbortSignal) => org && groups.organization ? api<Property[]>(`/orgs/${encodeURIComponent(draft.owner)}/properties/schema`, 'GET', undefined, signal) : Promise.resolve([] as Property[]), [org, groups.organization, draft.owner]));
  const perform = async (operation: () => Promise<unknown>) => { setError(''); try { await operation(); } catch (e) { setError(e instanceof Error ? e.message : 'Operation failed.'); } };
  const toggle = (name: string) => setGroups((old) => ({ ...old, [name]: !old[name] }));
  const selectProperty = (name: string, value: string | string[]) => { const values = { ...draft.properties }; if (value === '') delete values[name]; else values[name] = value; field('properties', values); };
  if (job) return <Page>
    <PageTitle title={job.state === 'done' ? 'Repository ready' : job.created ? 'Finish setup' : job.state === 'rejected' ? 'Creation not accepted' : 'Check creation result'} />
    <Text variant='titleMedium' style={{ color: theme.colors.secondary }}>{job.created || job.plan.full}</Text>
    {busy ? <Loading label={job.state === 'creating' ? 'Creating repository…' : job.plan.steps[job.next]?.label || 'Finishing…'} /> : null}
    {job.created ? <Text>{job.next} / {job.plan.steps.length} additional settings applied</Text> : null}
    {job.error ? <InlineError message={job.created ? 'Repository created; some settings need attention.' : job.state === 'unknown' ? 'Creation may have completed. Check before retrying.' : 'Could not create this repository.'} detail={job.error} /> : null}
    {!busy && job.created && job.state !== 'done' ? <Button mode='contained' onPress={() => void perform(() => startCreation(undefined, true))}>Retry remaining settings</Button> : null}
    {!busy && !job.created && job.state !== 'rejected' ? <Button mode='outlined' onPress={() => void perform(async () => { const result = await findRepository(); setFound(result); setConfirm('adopt'); })}>Find repository on GitHub</Button> : null}
    {job.created ? <Button mode='contained' disabled={busy} onPress={() => { void refreshRepositories(); router.replace({ pathname: '/repository/[name]', params: { name: job.created! } }); }}>Open repository</Button> : null}
    <Button onPress={() => void Linking.openURL(`https://github.com/${job.plan.full}`)}>View on GitHub</Button>
    <Button disabled={busy} onPress={() => router.navigate({ pathname: '/connect', params: { manage: '1' } })}>Manage app access</Button>
    {error ? <InlineError message='Could not complete that step.' detail={error} /> : null}
    <Button disabled={busy} onPress={() => setConfirm('clear')}>Dismiss setup record</Button>
    <Portal><Dialog visible={confirm !== null} onDismiss={() => setConfirm(null)}><Dialog.Title>{confirm === 'adopt' ? 'Continue setup here?' : 'Dismiss this setup record?'}</Dialog.Title><Dialog.Content><Text>{confirm === 'adopt' ? `${found?.full_name}\nCreated: ${found?.created_at}\nConfirm this is the intended repository. Remaining requested settings will be applied, without another creation request.` : 'This does not delete a GitHub repository. If creation is unconfirmed, check GitHub before creating the same name again.'}</Text></Dialog.Content><Dialog.Actions><Button onPress={() => setConfirm(null)}>Cancel</Button><Button onPress={() => { const action = confirm; setConfirm(null); void perform(async () => { if (action === 'adopt' && found) { await adoptRepository(found.full_name); await startCreation(undefined, true); } else if (action === 'clear') { await clearJob(); field('name', ''); } }); }}>Continue</Button></Dialog.Actions></Dialog></Portal>
  </Page>;
  return <Page>
    <PageTitle title='Create a new repository' />
    <Picker label='Owner *' value={draft.owner} options={owners.data || [{ value: user?.login || '', label: user?.login || 'Personal account' }]} change={(value) => { field('owner', String(value)); field('teamId', ''); field('teamSlug', ''); field('properties', {}); setGroups((old) => ({ ...old, organization: false })); }} disabled={busy} />
    {owners.error ? <InlineError message='Organization list unavailable.' detail={owners.error} /> : null}
    <TextInput mode='outlined' label='Repository name *' value={draft.name} onChangeText={(value) => field('name', value)} autoCapitalize='none' autoCorrect={false} disabled={busy} />
    <TextInput mode='outlined' label='Description' value={draft.description} onChangeText={(value) => field('description', value)} multiline disabled={busy} />
    <Picker label='Visibility' value={draft.private ? 'private' : 'public'} options={[{ value: 'private', label: 'Private' }, { value: 'public', label: 'Public' }]} change={(value) => field('private', value === 'private')} disabled={busy} />
    <Picker label='Starting point' value={draft.source} options={[{ value: 'empty', label: 'New repository' }, { value: 'template', label: 'Repository template' }]} change={(value) => field('source', value as 'empty' | 'template')} disabled={busy} />
    {draft.source === 'template' ? <>
      <Picker label='Connected source candidates' value={draft.template} options={[{ value: '', label: 'Choose or enter below' }, ...index.rows.map((row) => ({ value: row.fullName, label: row.fullName }))]} change={(value) => field('template', String(value))} disabled={busy} />
      <TextInput mode='outlined' label='Template owner/repository' value={draft.template} onChangeText={(value) => field('template', value)} autoCapitalize='none' disabled={busy} />
      <Checkbox.Item label='Include all template branches' status={draft.allBranches ? 'checked' : 'unchecked'} disabled={busy} onPress={() => field('allBranches', !draft.allBranches)} />
    </> : <>
      <Checkbox.Item label='Add a README' status={draft.readme ? 'checked' : 'unchecked'} disabled={busy} onPress={() => field('readme', !draft.readme)} />
      <Picker label='.gitignore template' value={draft.gitignore} options={[{ value: '', label: 'None' }, ...(ignores.data || []).map((value) => ({ value, label: value }))]} change={(value) => field('gitignore', String(value))} disabled={busy} />
      {ignores.error ? <InlineError message='Gitignore templates unavailable.' detail={ignores.error} /> : null}
      <Picker label='License' value={draft.license} options={[{ value: '', label: 'None' }, ...(licenses.data || []).map((value) => ({ value: value.key, label: value.name }))]} change={(value) => field('license', String(value))} disabled={busy} />
      {licenses.error ? <InlineError message='License catalog unavailable.' detail={licenses.error} /> : null}
    </>}
    <Group title='Repository features' open={!!groups.features} toggle={() => toggle('features')}>
      {featureFields.map(([key, label]) => <Tri key={key} label={label} value={draft.flags[key]} change={(value) => field('flags', { ...draft.flags, [key]: value })} disabled={busy} />)}
      <Tri label='Discussions' value={draft.discussions} change={(value) => field('discussions', value)} disabled={busy} />
    </Group>
    <Group title='Pull-request merge settings' open={!!groups.merge} toggle={() => toggle('merge')}>
      {mergeFields.map(([key, label]) => <Tri key={key} label={label} value={draft.flags[key]} change={(value) => field('flags', { ...draft.flags, [key]: value })} disabled={busy} />)}
      {Object.entries(messageFields).map(([key, values]) => <Picker key={key} label={key.replace(/_/g, ' ')} value={draft.messages[key] || ''} options={[{ value: '', label: 'GitHub default' }, ...values.map((value) => ({ value, label: value.replace(/_/g, ' ').toLowerCase() }))]} change={(value) => field('messages', { ...draft.messages, [key]: String(value) })} disabled={busy} />)}
    </Group>
    <Group title='Additional settings' open={!!groups.additional} toggle={() => toggle('additional')}>
      <TextInput mode='outlined' label='Homepage URL' value={draft.homepage} onChangeText={(value) => field('homepage', value)} keyboardType='url' autoCapitalize='none' disabled={busy} />
      <TextInput mode='outlined' label='Default branch (optional)' value={draft.defaultBranch} onChangeText={(value) => field('defaultBranch', value)} autoCapitalize='none' disabled={busy} />
      <TextInput mode='outlined' label='Add a topic' value={topic} onChangeText={setTopic} autoCapitalize='none' disabled={busy} />
      <Button disabled={!topic.trim() || busy} onPress={() => { field('topics', [...new Set([...draft.topics, topic.trim().toLowerCase()])]); setTopic(''); }}>Add topic</Button>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{draft.topics.map((value) => <Chip key={value} onClose={busy ? undefined : () => field('topics', draft.topics.filter((item) => item !== value))}>{value}</Chip>)}</View>
      <Tri label='Allow forking where policy permits' value={draft.forking} change={(value) => field('forking', value)} disabled={busy} />
      <Tri label='Require web-commit sign-off' value={draft.signoff} change={(value) => field('signoff', value)} disabled={busy} />
    </Group>
    {org ? <Group title='Organization options' open={!!groups.organization} toggle={() => toggle('organization')}>
      <Picker label='Team' value={draft.teamId} options={[{ value: '', label: 'None' }, ...(teams.data || []).map((team) => ({ value: String(team.id), label: team.name }))]} change={(value) => { const team = teams.data?.find((item) => String(item.id) === value); field('teamId', team ? String(team.id) : ''); field('teamSlug', team?.slug || ''); }} disabled={busy} />
      {teams.error ? <InlineError message='Teams are not accessible.' detail={teams.error} /> : null}
      {(teams.data?.length || 0) >= 1000 ? <Text variant='bodySmall'>First 1,000 teams loaded.</Text> : null}
      {draft.teamId ? <Picker label='Team role' value={draft.teamRole} options={[{ value: 'pull', label: 'Read' }, { value: 'triage', label: 'Triage' }, { value: 'push', label: 'Write' }, { value: 'maintain', label: 'Maintain' }, { value: 'admin', label: 'Admin' }]} change={(value) => field('teamRole', String(value))} disabled={busy} /> : null}
      {properties.error ? <InlineError message='Custom properties are not accessible.' detail={properties.error} /> : null}
      {properties.data?.map((property) => { const value = draft.properties[property.property_name]; const label = `${property.property_name}${property.required ? ' *' : ''}`; const options = (property.allowed_values || []).map((item) => ({ value: item, label: item })); if (property.value_type === 'multi_select') return <Picker key={label} multiple label={label} value={Array.isArray(value) ? value : []} options={options} change={(next) => selectProperty(property.property_name, next)} disabled={busy} />; if (property.value_type === 'single_select' || property.value_type === 'true_false') return <Picker key={label} label={label} value={typeof value === 'string' ? value : ''} options={[{ value: '', label: 'Organization default' }, ...(property.value_type === 'true_false' ? [{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }] : options)]} change={(next) => selectProperty(property.property_name, next)} disabled={busy} />; if (property.value_type === 'string' || property.value_type === 'url') return <TextInput key={label} mode='outlined' label={label} value={typeof value === 'string' ? value : ''} onChangeText={(next) => selectProperty(property.property_name, next)} disabled={busy} />; return <Text key={label}>{label}: unsupported property type.</Text>; })}
    </Group> : null}
    {error ? <InlineError message='Check the selected options.' detail={error} /> : null}
    <Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>Unchanged options use GitHub defaults. Some advanced settings require additional permissions.</Text>
    <Button mode='contained' disabled={busy || !draft.owner || !draft.name.trim()} loading={busy} onPress={() => void perform(async () => { if (!user) return; await startCreation(makePlan(draft, user.login, properties.data || [])); })}>Create repository</Button>
    <Button disabled={busy} onPress={() => router.back()}>Cancel</Button>
  </Page>;
}
