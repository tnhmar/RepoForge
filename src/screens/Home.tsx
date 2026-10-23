import { useEffect, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSession } from '../auth';
import { Icon, Page, Panel } from '../components/ui';
import { refreshRepositories, useRepositoryIndex } from '../ux/repositoryIndex';
import { useJobs } from '../liveStore';
import { Empty, InlineError, Loading } from '../ux/primitives';

export function HomeScreen() {
  const user = useSession((s) => s.user);
  const router = useRouter();
  const theme = useTheme();
  const index = useRepositoryIndex();
  const jobs = useJobs((s) => s.jobs).filter((j) => j.userId === user?.id);

  useEffect(() => {
    if (user && (!index.attempted || index.userId !== user.id)) void refreshRepositories();
  }, [user?.id, index.attempted, index.userId]);

  const recent = useMemo(() => [...index.rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4), [index.rows]);
  const unfinished = jobs.filter((j) => j.status === 'started' || j.status === 'unknown' || j.status === 'failed').slice(0, 2);
  const completed = jobs.filter((j) => j.status === 'completed').length;

  if (!user) return <Page><Empty title='Connect GitHub' body='Sign in to browse repositories and work from your phone.' action={<Button mode='contained' onPress={() => router.navigate('/sign-in')}>Sign in</Button>} /></Page>;

  return <Page>
    <View style={{ gap: 5, paddingTop: 4 }}>
      <Text variant='bodyMedium' style={{ color: theme.colors.onSurfaceVariant }}>Welcome back</Text>
      <Text variant='headlineMedium' style={{ fontWeight: '700' }}>{user.login}</Text>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>Pick up where you left off.</Text>
    </View>

    {unfinished.length ? <Panel style={{ backgroundColor: theme.colors.surfaceVariant }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.errorContainer }}><Icon name='warning' color={theme.colors.error} size={20} /></View>
        <View style={{ flex: 1, gap: 2 }}><Text variant='titleMedium'>Continue a project</Text><Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>{unfinished.length} publication {unfinished.length === 1 ? 'result needs' : 'results need'} attention.</Text></View>
      </View>
      {unfinished.map((job) => <Pressable key={job.id} accessibilityRole='button' onPress={() => router.navigate({ pathname: '/activity', params: { job: job.id } })} style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant }}><Text style={{ fontWeight: '700' }}>{job.repository}</Text><Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>{job.status === 'unknown' ? 'Result not confirmed' : job.status === 'failed' ? 'Publication failed' : 'Publication started'}</Text></Pressable>)}
    </Panel> : null}

    <View style={{ flexDirection: 'row', gap: 10 }}>
      <QuickAction icon='repo' label='Browse repositories' onPress={() => router.navigate('/repositories')} />
      <QuickAction icon='plus' label='New repository' onPress={() => router.push('/new-repository')} />
    </View>

    <SectionHeader title='Recent repositories' action='See all' onPress={() => router.navigate('/repositories')} />
    {index.loading && !recent.length ? <Loading label='Loading repositories…' /> : null}
    {!index.loading && !recent.length && !index.error ? <Empty title='No repositories yet' body='Install RepoForge on GitHub and choose the repositories you want to access.' action={<Button mode='contained' onPress={() => router.navigate('/connect')}>Set up access</Button>} /> : null}
    {index.error ? <InlineError message='Repository list may be incomplete.' detail={index.error} retry={() => void refreshRepositories()} /> : null}
    {recent.map((repo) => <Pressable key={repo.id} accessibilityRole='button' accessibilityLabel={`Open ${repo.fullName}`} onPress={() => router.push({ pathname: '/repository/[name]', params: { name: repo.fullName } })} style={({ pressed }) => ({ paddingVertical: 13, opacity: pressed ? 0.65 : 1 })}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}><Icon name='repo' size={20} /></View>
        <View style={{ flex: 1, gap: 2 }}><Text style={{ fontWeight: '700' }}>{repo.fullName}</Text><Text variant='bodySmall' numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>{repo.description || `${repo.language || 'Repository'} · ${repo.private ? 'Private' : 'Public'}`}</Text></View>
        <Icon name='chevron' size={18} />
      </View>
    </Pressable>)}

    <SectionHeader title='On this device' />
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <StatCard value={String(completed)} label='published' />
      <StatCard value={String(jobs.length)} label='recent import jobs' />
    </View>

    <Panel>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }}><Icon name='upload' color={theme.colors.primary} size={19} /></View>
        <View style={{ flex: 1, gap: 2 }}><Text variant='titleMedium'>Import a project</Text><Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>Publish a ZIP to a new branch after reviewing the exact changes.</Text></View>
      </View>
      <Button mode='outlined' onPress={() => router.navigate('/import')}>Start import</Button>
    </Panel>
  </Page>;
}

function QuickAction({ icon, label, onPress }: { icon: 'repo' | 'plus'; label: string; onPress: () => void }) {
  const theme = useTheme();
  return <Pressable accessibilityRole='button' onPress={onPress} style={({ pressed }) => ({ flex: 1, minHeight: 88, borderRadius: 18, padding: 16, justifyContent: 'space-between', backgroundColor: theme.colors.surfaceVariant, opacity: pressed ? 0.72 : 1 })}><Icon name={icon} size={22} color={theme.colors.primary} /><Text style={{ fontWeight: '700' }}>{label}</Text></Pressable>;
}
function StatCard({ value, label }: { value: string; label: string }) { const theme = useTheme(); return <View style={{ flex: 1, padding: 15, borderRadius: 16, backgroundColor: theme.colors.surfaceVariant, gap: 2 }}><Text variant='titleLarge' style={{ fontWeight: '700' }}>{value}</Text><Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text></View>; }
function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) { return <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}><Text variant='titleMedium' style={{ flex: 1, fontWeight: '700' }}>{title}</Text>{action && onPress ? <Button compact onPress={onPress} contentStyle={{ paddingHorizontal: 0 }}>{action}</Button> : null}</View>; }
