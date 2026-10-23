import { useEffect, useState, type ReactNode } from 'react';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../auth';
import { Icon } from '../components/ui';
import { ActionSheet, type SheetAction } from './ActionSheet';
import { useHub } from './localActivity';
import { repositoryIdentity } from './navigation';
export function AppScaffold({ children }: { children: ReactNode }) {
  const user = useSession((state) => state.user); const router = useRouter(); const pathname = usePathname(); const params = useGlobalSearchParams<{ name?: string; repo?: string }>(); const theme = useTheme(); const hubReady = useHub((state) => state.ready); const [actionsOpen, setActionsOpen] = useState(false);
  const candidate = pathname.startsWith('/repository/') ? params.name || '' : params.repo || ''; const full = repositoryIdentity(candidate)?.full;
  useEffect(() => { if (user && full && hubReady && pathname.startsWith('/repository/')) { const id = user.id; void Promise.resolve().then(() => { if (useSession.getState().user?.id === id) useHub.getState().remember(id, full); }); } }, [user?.id, full, pathname, hubReady]);
  const titles: Record<string, string> = { '/': 'RepoForge', '/repositories': 'Repositories', '/activity': 'Activity', '/work': 'Work', '/account': 'Account', '/new-repository': 'Create repository', '/connect': 'GitHub access', '/import': 'Import project', '/workbench': 'Repository tools' };
  const title = pathname.startsWith('/repository/') ? full || 'Repository' : titles[pathname] || 'RepoForge';
  const back = !['/', '/repositories', '/activity', '/work', '/account'].includes(pathname);
  const actions: SheetAction[] = [{ label: 'New repository', run: () => router.push('/new-repository') }, { label: full ? `Import ZIP into ${full}` : 'Choose repository for ZIP import', run: () => full ? router.navigate({ pathname: '/import', params: { repo: full } }) : router.navigate('/repositories') }];
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>{user ? <View style={{ minHeight: 56, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }}><Pressable accessibilityRole='button' accessibilityLabel={back ? 'Go back' : 'Home'} onPress={() => back ? router.canGoBack() ? router.back() : router.navigate('/') : router.navigate('/')} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>{back ? <Text style={{ fontSize: 26 }}>‹</Text> : <Icon name='branch' />}</Pressable><Text variant='titleMedium' numberOfLines={1} style={{ flex: 1 }}>{title}</Text><Pressable accessibilityRole='button' accessibilityLabel='Find repositories' onPress={() => router.navigate({ pathname: '/repositories', params: { focus: '1' } })} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name='search' /></Pressable><Pressable accessibilityRole='button' accessibilityLabel='Create or import' onPress={() => setActionsOpen(true)} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name='plus' /></Pressable><Pressable accessibilityRole='button' accessibilityLabel={`Account ${user.login}`} onPress={() => router.navigate('/account')} style={{ padding: 8 }}><Avatar.Text size={28} label={user.login.slice(0, 1).toUpperCase()} /></Pressable></View> : null}<View style={{ flex: 1 }}>{children}</View><ActionSheet visible={actionsOpen && !!user} title={full ? full : 'Create / Import'} actions={actions} close={() => setActionsOpen(false)} /></SafeAreaView>;
}
