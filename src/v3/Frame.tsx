import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { Alert, BackHandler, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../auth';
import { useCreation } from '../creation/runner';
import { useTransfer } from './shared';
export function Frame({ children }: { children: ReactNode }) {
  const user = useSession((state) => state.user); const controller = useTransfer((state) => state.controller); const creating = useCreation((state) => state.busy); const router = useRouter(); const path = usePathname(); const theme = useTheme();
  const leave = () => { const go = () => router.canGoBack() ? router.back() : router.replace('/repositories'); if (creating) { Alert.alert('Creating repository', 'Wait for the result before leaving. An accepted request cannot be recalled.'); return; } if (controller) Alert.alert('Leave this operation?', 'Cancel the local operation. A request already sent to GitHub may still complete; check Uploads if publication was in progress.', [{ text: 'Stay', style: 'cancel' }, { text: 'Cancel and leave', onPress: () => { controller.abort(); go(); } }]); else go(); };
  useEffect(() => { if (!controller && !creating) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (creating) Alert.alert('Creating repository', 'Please wait for the creation result.'); else Alert.alert('Cancel operation?', 'Sent GitHub requests may still complete.', [{ text: 'Stay' }, { text: 'Cancel', onPress: () => controller?.abort() }]); return true; }); return () => sub.remove(); }, [controller, creating]);
  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.colors.background }}>{user ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }}>{path !== '/repositories' && path !== '/' ? <Button onPress={leave}>‹ Back</Button> : null}<Text variant='titleMedium' style={{ flex: 1, padding: 12 }}>RepoForge ZIP</Text><Button disabled={!!controller || creating} onPress={() => router.navigate('/activity')}>Uploads</Button><Button disabled={!!controller || creating} onPress={() => router.navigate('/account')}>Account</Button></View> : null}<View style={{ flex: 1 }}>{children}</View></SafeAreaView>;
}
