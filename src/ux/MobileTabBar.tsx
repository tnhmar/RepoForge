import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { usePathname, useRouter } from 'expo-router';
import { Icon, type IconName } from '../components/ui';

type Tab = { path: string; label: string; icon: IconName };
const tabs: Tab[] = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/repositories', label: 'Repos', icon: 'repo' },
  { path: '/activity', label: 'Activity', icon: 'activity' },
  { path: '/workbench', label: 'Work', icon: 'branch' },
  { path: '/settings', label: 'Account', icon: 'person' },
];

export function MobileTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const active = pathname === '/' ? '/' : pathname.startsWith('/repositories') ? '/repositories' : pathname.startsWith('/activity') ? '/activity' : pathname.startsWith('/workbench') ? '/workbench' : pathname.startsWith('/settings') ? '/settings' : '';
  return <View style={[styles.bar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
    {tabs.map((tab) => {
      const selected = active === tab.path;
      return <Pressable key={tab.path} accessibilityRole='tab' accessibilityState={{ selected }} accessibilityLabel={tab.label} onPress={() => router.navigate(tab.path as never)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
        <View style={[styles.iconWrap, selected && { backgroundColor: theme.colors.primaryContainer }]}><Icon name={tab.icon} size={20} color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant} /></View>
        <Text variant='labelSmall' style={{ color: selected ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: selected ? '700' : '500' }}>{tab.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  bar: { height: 68, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 7 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 14 },
  iconWrap: { width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.72 },
});
