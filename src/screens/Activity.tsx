import { Linking, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSession } from '../auth';
import { useJobs } from '../liveStore';
import { Empty, InlineError } from '../ux/primitives';
import { Icon, Page, Panel } from '../components/ui';

export function ActivityScreen() {
  const user = useSession((s) => s.user); const jobs = useJobs((s) => s.jobs).filter((j) => j.userId === user?.id); const router = useRouter(); const theme = useTheme();
  if (!user) return <Page><Empty title='Connect GitHub' action={<Button mode='contained' onPress={() => router.navigate('/sign-in')}>Sign in</Button>} /></Page>;
  const sorted = [...jobs].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return <Page>
    <View style={{ gap: 4 }}><Text variant='headlineSmall' style={{ fontWeight: '700' }}>Activity</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>Import and repository-setup activity stored on this device.</Text></View>
    {!sorted.length ? <Empty title='Nothing yet' body='Completed imports and setup results will appear here.' action={<Button mode='outlined' onPress={() => router.navigate('/repositories')}>Browse repositories</Button>} /> : null}
    {sorted.map((job) => {
      const attention = job.status === 'started' || job.status === 'unknown' || job.status === 'failed';
      return <Panel key={job.id}>
        <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: attention ? theme.colors.errorContainer : theme.colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }}><Icon name={attention ? 'warning' : 'check'} color={attention ? theme.colors.error : theme.colors.primary} size={19} /></View><View style={{ flex: 1, gap: 3 }}><Text variant='titleMedium' style={{ fontWeight: '700' }}>{job.repository}</Text><Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>{job.branch} · {new Date(job.at).toLocaleString()}</Text></View></View>
        <Text>{job.message}</Text>
        {job.status === 'started' ? <InlineError message='No completion was recorded.' detail='The app may have stopped. Check GitHub before trying the same publication again.' /> : null}
        {job.status === 'unknown' ? <InlineError message='Result not confirmed.' detail='Check GitHub before repeating this publication.' /> : null}
        {job.status === 'failed' ? <InlineError message='Publication failed.' detail='Rebuild the preview before retrying.' /> : null}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}><Button compact onPress={() => void Linking.openURL(job.url || `https://github.com/${job.repository}/tree/${encodeURIComponent(job.branch)}`)}>{job.url ? 'Open commit' : 'Check on GitHub'}</Button><Button compact onPress={() => router.push({ pathname: '/repository/[name]', params: { name: job.repository } })}>Open repository</Button></View>
      </Panel>;
    })}
  </Page>;
}
