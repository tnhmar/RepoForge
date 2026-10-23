import '../src/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useApp } from '../src/store';
import { darkTheme, lightTheme } from '../src/theme';
export default function RootLayout() {
  const system = useColorScheme();
  const preference = useApp((s) => s.theme);
  const dark = preference === 'dark' || (preference === 'system' && system === 'dark');
  return <SafeAreaProvider><PaperProvider theme={dark ? darkTheme : lightTheme}><StatusBar style={dark ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false }} /></PaperProvider></SafeAreaProvider>;
}
