import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fromByteArray, toByteArray } from 'base64-js';
import { strFromU8, strToU8 } from 'fflate';
import { api, branches, contents, getRepo, repoPath, type Content, type Repo } from '../github';
import { Icon, Page, Panel } from '../components/ui';
import { InlineError, Loading, Empty } from '../ux/primitives';
import { RepositoryToolsSection } from '../features/Workbench';
import { useRepositoryIndex } from '../ux/repositoryIndex';

function useLoad<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: string; busy: boolean }>({ busy: true });
  const [version, setVersion] = useState(0);
  useEffect(() => { let active = true; setState((s) => ({ ...s, busy: true, error: undefined })); void loader().then((data) => { if (active) setState({ data, busy: false }); }).catch((error) => { if (active) setState({ error: error instanceof Error ? error.message : 'Request failed.', busy: false }); }); return () => { active = false; }; }, [loader, version]);
  return { ...state, reload: () => setVersion((v) => v + 1) };
}

type Tab = 'Overview' | 'Code' | 'Issues' | 'Pull requests' | 'Actions' | 'More';

export function RepositoryWorkspaceScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const full = name || '';
  const router = useRouter();
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('Overview'); const [switcher, setSwitcher] = useState(false); const [moreSection, setMoreSection] = useState<'Releases' | 'Alerts'>('Releases');
  const [more, setMore] = useState(false);
  const repo = useLoad(useCallback(() => getRepo(full), [full]));

  if (!full) return <Page><Empty title='Repository not found' action={<Button onPress={() => router.navigate('/repositories')}>Back to repositories</Button>} /></Page>;
  const r = repo.data;
  const status = r ? r.archived ? 'Archived' : r.permissions?.push === false ? 'Read only' : r.private ? 'Private' : 'Public' : '';

  return <Page scroll={false}>
    <View style={{ flex: 1, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 }}>
        <Pressable accessibilityRole='button' accessibilityLabel='Back to repositories' onPress={() => router.navigate('/repositories')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Icon name='back' /></Pressable>
        <Pressable onPress={() => setSwitcher(true)} style={{ flex: 1 }} accessibilityRole='button' accessibilityLabel='Switch repository'><Text variant='titleMedium' style={{ fontWeight: '700' }} numberOfLines={1}>{full}</Text><Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>{status}{r?.language ? ` · ${r.language}` : ''} · tap to switch</Text></Pressable>
        <Pressable accessibilityRole='button' accessibilityLabel='Open repository actions' onPress={() => setMore(true)} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Icon name='more' /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outlineVariant }}>
        {(['Overview', 'Code', 'Issues', 'Pull requests', 'Actions'] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={{ paddingHorizontal: 4, paddingVertical: 10, marginRight: 10, borderBottomWidth: 2, borderBottomColor: tab === item ? theme.colors.primary : 'transparent' }}><Text variant='labelLarge' style={{ color: tab === item ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: tab === item ? '700' : '500' }}>{item}</Text></Pressable>)}
      </View>
      <View style={{ flex: 1 }}>
        {repo.error ? <InlineError message='Could not load repository.' detail={repo.error} retry={repo.reload} /> : null}
        {repo.busy && !r ? <Loading label='Loading repository…' /> : null}
        {tab === 'Overview' && r ? <Overview repo={r} openCode={() => setTab('Code')} openImport={() => router.navigate({ pathname: '/import', params: { repo: full, base: r.default_branch } })} /> : null}
        {tab === 'Code' ? <CodeBrowser full={full} repo={r} /> : null}
        {tab === 'Issues' ? <RepositoryToolsSection full={full} section='Issues' /> : null}
        {tab === 'Pull requests' ? <RepositoryToolsSection full={full} section='Pull requests' /> : null}
        {tab === 'Actions' ? <RepositoryToolsSection full={full} section='Actions' /> : null}
        {tab === 'More' ? <RepositoryToolsSection full={full} section={moreSection} /> : null}
      </View>
    </View>

    <RepositorySwitcher full={full} visible={switcher} close={() => setSwitcher(false)} />
    <Portal><Dialog visible={more} onDismiss={() => setMore(false)}><Dialog.Title>Repository actions</Dialog.Title><Dialog.Content><View style={{ gap: 8 }}>
      <Button icon='source-branch' mode='outlined' onPress={() => { setMore(false); setTab('Code'); }}>Branches & code</Button>
      <Button icon='package-variant' mode='outlined' onPress={() => { setMore(false); setMoreSection('Releases'); setTab('More'); }}>Releases</Button>
      <Button mode='outlined' onPress={() => { setMore(false); router.navigate({ pathname: '/import', params: { repo: full, base: r?.default_branch || 'main' } }); }}>Import ZIP</Button>
      <Button onPress={() => { setMore(false); setMoreSection('Alerts'); setTab('More'); }}>Local alerts</Button>
      <Button icon='open-in-new' onPress={() => { setMore(false); void Linking.openURL(`https://github.com/${full}`); }}>Open on GitHub</Button>
      <Button onPress={() => setMore(false)}>Close</Button>
    </View></Dialog.Content></Dialog></Portal>
  </Page>;
}

function RepositorySwitcher({ full, visible, close }: { full: string; visible: boolean; close: () => void }) { const router = useRouter(); const index = useRepositoryIndex(); const recent = [...index.rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 12); return <Portal><Dialog visible={visible} onDismiss={close}><Dialog.Title>Switch repository</Dialog.Title><Dialog.ScrollArea><ScrollView style={{ maxHeight: 420 }}>{recent.map((repo) => <Button key={repo.id} contentStyle={{ minHeight: 48, justifyContent: 'flex-start' }} onPress={() => { close(); router.replace({ pathname: '/repository/[name]', params: { name: repo.fullName } }); }}>{repo.fullName === full ? '✓ ' : ''}{repo.fullName}</Button>)}{!recent.length ? <Text style={{ padding: 16 }}>No indexed repositories yet.</Text> : null}</ScrollView></Dialog.ScrollArea><Dialog.Actions><Button onPress={() => { close(); router.navigate('/repositories'); }}>All repositories</Button><Button onPress={close}>Close</Button></Dialog.Actions></Dialog></Portal>; }

function Overview({ repo, openCode, openImport }: { repo: Repo; openCode: () => void; openImport: () => void }) {
  const theme = useTheme();
  return <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
    <View style={{ gap: 4 }}><Text variant='titleLarge' style={{ fontWeight: '700' }}>{repo.name}</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>{repo.description || 'No description'}</Text></View>
    <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1, backgroundColor: theme.colors.surfaceVariant, borderRadius: 16, padding: 14 }}><Text variant='labelSmall'>Default branch</Text><Text style={{ fontWeight: '700', marginTop: 4 }}>{repo.default_branch || 'main'}</Text></View><View style={{ flex: 1, backgroundColor: theme.colors.surfaceVariant, borderRadius: 16, padding: 14 }}><Text variant='labelSmall'>Visibility</Text><Text style={{ fontWeight: '700', marginTop: 4 }}>{repo.private ? 'Private' : 'Public'}</Text></View></View>
    <View style={{ flexDirection: 'row', gap: 10 }}><Button mode='contained' style={{ flex: 1 }} onPress={openCode}>Browse code</Button><Button mode='outlined' style={{ flex: 1 }} onPress={openImport} disabled={repo.archived || repo.permissions?.push === false}>Import ZIP</Button></View>
    {repo.archived ? <Panel><Text variant='titleMedium'>Archived repository</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>This repository is read-only until it is unarchived on GitHub.</Text></Panel> : null}
    {repo.permissions?.push === false ? <Panel><Text variant='titleMedium'>Read-only access</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>You can browse this repository, but publishing changes requires write permission.</Text></Panel> : null}
    <Panel><Text variant='titleMedium'>Repository context</Text><Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>Issues, pull requests and Actions stay inside this repository. Use the tabs above to switch without losing context.</Text></Panel>
  </ScrollView>;
}

function CodeBrowser({ full, repo }: { full: string; repo?: Repo }) {
  const theme = useTheme();
  const [branch, setBranch] = useState(''); const [path, setPath] = useState(''); const [branchDialog, setBranchDialog] = useState(false); const [branchPage, setBranchPage] = useState(1); const [error, setError] = useState('');
  const ref = branch || repo?.default_branch || 'main';
  const refs = useLoad(useCallback(() => branches(full, branchPage), [full, branchPage]));
  const listing = useLoad(useCallback(() => contents(full, ref, path), [full, ref, path]));
  const file = listing.data && !Array.isArray(listing.data) ? listing.data : null;
  const text = useMemo(() => { if (!file?.content || file.size > 256 * 1024 || file.encoding !== 'base64') return file ? 'Content is too large, binary, or unavailable through this endpoint.' : ''; try { const bytes = toByteArray(file.content.replace(/\s/g, '')); return bytes.includes(0) ? 'Binary file — text preview unavailable.' : strFromU8(bytes); } catch { return 'File could not be decoded as UTF-8.'; } }, [file]);
  const goUp = () => setPath(path.split('/').slice(0, -1).join('/'));
  const init = async () => { try { await api(`${repoPath(full)}/contents/README.md`, 'PUT', { message: 'Initialize repository for project imports', content: fromByteArray(strToU8(`# ${repo?.name || 'Project'}\n`)) }); listing.reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Initialization failed.'); } };

  return <View style={{ flex: 1 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}><Button compact onPress={() => setBranchDialog(true)}>{ref} ▾</Button><View style={{ flex: 1 }} /><Button compact onPress={() => listing.reload()}>Refresh</Button></View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 8 }}><Text variant='bodySmall' numberOfLines={1} style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>{path ? `/${path}` : '/'}</Text>{path ? <Button compact onPress={goUp}>Up</Button> : null}</View>
    {error ? <InlineError message='Repository operation failed.' detail={error} retry={() => setError('')} /> : null}
    {listing.busy ? <ActivityIndicator /> : null}
    {Array.isArray(listing.data) ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>{listing.data.length === 1000 ? <InlineError message='Directory may be truncated.' detail='GitHub returned its directory limit. Use the branch on GitHub for very large directories.' /> : null}{listing.data.map((entry: Content) => <Pressable key={entry.path} onPress={() => entry.type === 'dir' ? setPath(entry.path) : setPath(entry.path)} style={({ pressed }) => ({ paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.outlineVariant, opacity: pressed ? 0.65 : 1 })}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Icon name={entry.type === 'dir' ? 'repo' : 'file'} size={19} /><Text style={{ flex: 1, fontWeight: entry.type === 'dir' ? '700' : '500' }}>{entry.name}{entry.type === 'dir' ? '/' : ''}</Text><Icon name='chevron' size={16} /></View></Pressable>)}</ScrollView> : file ? <ScrollView horizontal showsHorizontalScrollIndicator={false}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}><View style={{ padding: 15, minWidth: 600, borderRadius: 14, backgroundColor: theme.colors.surfaceVariant }}><Text variant='titleMedium' style={{ marginBottom: 10 }}>{file.path}</Text><Text selectable style={styles.mono}>{text}</Text></View></ScrollView></ScrollView> : repo?.size === 0 ? <Empty title='Empty repository' body='Initialize a README before importing your first project.' action={<Button mode='contained' disabled={repo.archived || repo.permissions?.push === false} onPress={() => Alert.alert('Initialize repository?', 'Creates a README in a separate initial commit. No existing files are overwritten.', [{ text: 'Cancel' }, { text: 'Initialize', onPress: () => void init() }])}>Initialize</Button>} /> : <Empty title='Nothing to show' body='Refresh the repository or switch branches.' />}
    <Portal><Dialog visible={branchDialog} onDismiss={() => setBranchDialog(false)}><Dialog.Title>Choose branch</Dialog.Title><Dialog.ScrollArea><ScrollView style={{ maxHeight: 360 }}>{refs.loading ? <ActivityIndicator /> : null}{refs.data?.map((item) => <Button key={item.name} onPress={() => { setBranch(item.name); setPath(''); setBranchDialog(false); }}>{item.name === ref ? '✓ ' : ''}{item.name}</Button>)}{refs.data?.length === 30 ? <Button onPress={() => setBranchPage((v) => v + 1)}>Load more</Button> : null}</ScrollView></Dialog.ScrollArea><Dialog.Actions><Button onPress={() => setBranchDialog(false)}>Close</Button></Dialog.Actions></Dialog></Portal>
  </View>;
}

const styles = StyleSheet.create({ mono: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 } });
