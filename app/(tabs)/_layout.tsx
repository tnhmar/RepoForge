import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'react-native-paper';
import { Icon, type IconName } from '../../src/components/ui';
const tabs: { name: string; label: string; icon: IconName }[] = [{ name: 'index', label: 'home', icon: 'home' }, { name: 'repositories', label: 'repos', icon: 'repo' }, { name: 'import', label: 'import', icon: 'upload' }, { name: 'activity', label: 'activity', icon: 'activity' }, { name: 'settings', label: 'settings', icon: 'settings' }];
export default function TabsLayout() {
  const theme = useTheme(); const { t } = useTranslation();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.onSurfaceVariant, tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }, tabBarLabelStyle: { fontSize: 10 } }}>{tabs.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.label), tabBarIcon: ({ color }) => <Icon name={tab.icon} color={color} /> }} />)}</Tabs>;
}
