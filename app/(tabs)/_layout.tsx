import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Icon, type IconName } from '../../src/components/ui';
const icon = (name: IconName) => ({ color }: { color: string }) => <Icon name={name} color={color} size={21} />;
export default function MainTabs() {
  const theme = useTheme();
  return <Tabs screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true, tabBarActiveTintColor: theme.colors.secondary, tabBarInactiveTintColor: theme.colors.onSurfaceVariant, tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }, tabBarLabelStyle: { fontSize: 11 } }}><Tabs.Screen name='index' options={{ title: 'Home', tabBarIcon: icon('home') }} /><Tabs.Screen name='repositories' options={{ title: 'Repositories', tabBarLabel: 'Repos', tabBarIcon: icon('repo') }} /><Tabs.Screen name='activity' options={{ title: 'Activity', tabBarIcon: icon('activity') }} /><Tabs.Screen name='work' options={{ title: 'Work', tabBarIcon: icon('branch') }} /><Tabs.Screen name='account' options={{ title: 'Account', tabBarLabel: 'Me', tabBarIcon: icon('settings') }} /><Tabs.Screen name='settings' options={{ href: null }} /><Tabs.Screen name='workbench' options={{ href: null }} /><Tabs.Screen name='import' options={{ href: null }} /></Tabs>;
}
