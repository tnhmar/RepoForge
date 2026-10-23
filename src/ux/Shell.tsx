import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { useSession } from '../auth';
import { Icon } from '../components/ui';
import { MobileTabBar } from './MobileTabBar';

const titles: Record<string, string> = {
  '/': 'Home',
  '/repositories': 'Repositories',
  '/activity': 'Activity',
  '/workbench': 'Work',
  '/settings': 'Account',
  '/new-repository': 'Create repository',
  '/import': 'Import project',
  '/connect': 'Repository access',
};

export function AppShell({ children }: { children: ReactNode }) {
  const user = useSession((s) => s.user);
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isRepository = pathname.startsWith('/repository/');
  const fullScreen = pathname === '/sign-in' || pathname === '/oauth';
  const title = useMemo(() => {
    if (isRepository) return 'Repository';
    return titles[pathname] || 'RepoForge';
  }, [pathname, isRepository]);
  const showBack = pathname === '/new-repository' || pathname === '/import' || pathname === '/connect';
  const showSearch = pathname === '/' || pathname === '/repositories' || pathname === '/workbench';

  if (!user || fullScreen) return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>{children}</SafeAreaView>;

  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
    {!isRepository ? <View style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outlineVariant, backgroundColor: theme.colors.background }}>
      {showBack ? <Pressable accessibilityRole='button' accessibilityLabel='Back' onPress={() => router.back()} style={styles.headerButton}><Icon name='back' /></Pressable> : null}
      {!showBack ? <View style={{ width: 42 }} /> : null}
      <Text variant='titleMedium' style={{ flex: 1, fontWeight: '700' }}>{title}</Text>
      {showSearch ? <Pressable accessibilityRole='button' accessibilityLabel='Search repositories' onPress={() => router.navigate({ pathname: '/repositories', params: { focus: '1' } })} style={styles.headerButton}><Icon name='search' /></Pressable> : null}
      <Pressable accessibilityRole='button' accessibilityLabel='GitHub profile' onPress={() => router.navigate('/settings')} style={styles.headerButton}><Icon name='person' /></Pressable>
    </View> : null}
    <View style={{ flex: 1 }}>{children}</View>
    {!isRepository && !showBack ? <MobileTabBar /> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' } });
