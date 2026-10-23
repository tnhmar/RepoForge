import '../src/i18n';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ScrollView, useColorScheme } from 'react-native';
import { Button, PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { restoreSession, useSession } from '../src/auth';
import { useApp } from '../src/store';
import { darkTheme, lightTheme } from '../src/theme';
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) { return <ScrollView contentContainerStyle={{ padding: 32, paddingTop: 64, gap: 16 }}><Text>RepoForge encountered an error.</Text><Text selectable>{error.message}</Text><Button onPress={retry}>Try again</Button></ScrollView>; }
export default function RootLayout() {
  const system = useColorScheme(); const preference = useApp((s) => s.theme); const user = useSession((s) => s.user); const ready = useSession((s) => s.ready);
  useEffect(() => { void restoreSession(); }, []);
  const dark = preference === 'dark' || (preference === 'system' && system === 'dark');
  return <SafeAreaProvider><PaperProvider theme={dark ? darkTheme : lightTheme}><StatusBar style={dark ? 'light' : 'dark'} />{ready ? <Stack key={user?.id ?? 'signed-out'} screenOptions={{ headerShown: false }} /> : <Text style={{ padding: 40 }}>Restoring session…</Text>}</PaperProvider></SafeAreaProvider>;
}
