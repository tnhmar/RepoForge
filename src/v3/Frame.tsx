import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { Alert, BackHandler, Pressable, View } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../auth';
import { Icon } from '../components/ui';
import { useCreation } from '../creation/runner';
import { useTransfer } from './shared';
export function Frame({ children }: { children: ReactNode }) {
  const user = useSession((state) => state.user); const controller = useTransfer((state) => state.controller); const creating = useCreation((state) => state.busy); const router = useRouter(); const path = usePathname(); const theme = useTheme();
  const back = () => { const go = () => router.canGoBack() ? router.back() : router.replace('/'); if (creating) Alert.alert('Creating repository', 'Please wait for the result. A sent request cannot be recalled.'); else if (controller) Alert.alert('Leave this operation?', 'Cancel locally. GitHub may still complete a request already sent; check Uploads before repeating publication.', [{ text: 'Stay' }, { text: 'Cancel and leave', onPress: () => { controller.abort(); go(); } }]); else go(); };
  useEffect(() => { if (!controller && !creating) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (creating) Alert.alert('Creating repository', 'Please wait for the result.'); else Alert.alert('Cancel operation?', 'Requests already sent may still complete.', [{ text: 'Stay' }, { text: 'Cancel', onPress: () => controller?.abort() }]); return true; }); return () => sub.remove(); }, [controller, creating]);
  const titles: Record<string, string> = { '/': 'RepoForge', '/activity': 'Uploads', '/import': 'Publish project', '/new-repository': 'New repository', '/account': 'Account', '/connect': 'GitHub access' };
  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.colors.background }}>{user ? <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, minHeight: 60 }}>{!['/', '/repositories', '/activity'].includes(path) ? <Pressable accessibilityRole='button' accessibilityLabel='Go back' onPress={back} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><Icon name='back' /></Pressable> : <View style={{ paddingRight: 10 }}><Icon name='branch' color={theme.colors.primary} /></View>}<Text variant='titleMedium' style={{ flex: 1 }}>{titles[path] || 'RepoForge'}</Text><Pressable accessibilityRole='button' accessibilityLabel={`Account ${user.login}`} accessibilityState={{ disabled: !!controller || creating }} disabled={!!controller || creating} onPress={() => router.navigate('/account')} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', opacity: controller || creating ? 0.5 : 1 }}><Avatar.Text size={34} label={user.login.slice(0, 1).toUpperCase()} /></Pressable></View> : null}<View style={{ flex: 1 }}>{children}</View></SafeAreaView>;
}
