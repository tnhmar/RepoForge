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
import { Frame } from '../src/v3/Frame';
export function ErrorBoundary({ retry }: ErrorBoundaryProps) { return <ScrollView contentContainerStyle={{ padding: 32, paddingTop: 64, gap: 16 }}><Text>Something went wrong. Check Uploads before repeating an unconfirmed publication.</Text><Button onPress={retry}>Try again</Button></ScrollView>; }
export default function RootLayout() { const system = useColorScheme(); const preference = useApp((state) => state.theme); const user = useSession((state) => state.user); const dark = preference === 'dark' || (preference === 'system' && system === 'dark'); const theme = dark ? darkTheme : lightTheme; useEffect(() => { void restoreSession(); }, []); return <SafeAreaProvider><PaperProvider theme={theme}><StatusBar style={dark ? 'light' : 'dark'} /><Frame><Stack screenOptions={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: theme.colors.background } }}><Stack.Protected guard={!!user}><Stack.Screen name='(tabs)' /><Stack.Screen name='repository/[name]' /><Stack.Screen name='connect' /><Stack.Screen name='new-repository' /></Stack.Protected><Stack.Protected guard={!user}><Stack.Screen name='sign-in' /></Stack.Protected><Stack.Screen name='oauth' /></Stack></Frame></PaperProvider></SafeAreaProvider>; }
