import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ColorValue } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
export type IconName = 'home' | 'repo' | 'upload' | 'activity' | 'settings' | 'branch' | 'file' | 'check';
const paths: Record<IconName, string> = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  repo: 'M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM5 17h14M8 7h6M8 10h4',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M10 15v6',
  branch: 'M6 5v14M6 12h7a5 5 0 0 0 5-5V5M4 3h4v4H4ZM4 17h4v4H4ZM16 3h4v4h-4Z',
  file: 'M5 3h9l5 5v13H5ZM14 3v6h5M8 13h8M8 17h6',
  check: 'm5 12 4 4L19 6',
};
export function Icon({ name, color, size = 22 }: { name: IconName; color?: ColorValue; size?: number }) {
  const theme = useTheme();
  return <Svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color ?? theme.colors.primary} strokeWidth={1.7} strokeLinecap='round' strokeLinejoin='round' accessible={false}><Path d={paths[name]} /></Svg>;
}
export function Page({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}><ScrollView keyboardShouldPersistTaps='handled' contentContainerStyle={styles.page}>{children}</ScrollView></SafeAreaView>;
}
export function Panel({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const theme = useTheme();
  const look = [styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }];
  return onPress ? <Pressable accessibilityRole='button' onPress={onPress} style={({ pressed }) => [look, { opacity: pressed ? 0.75 : 1 }]}>{children}</Pressable> : <View style={look}>{children}</View>;
}
export function Heading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  const theme = useTheme();
  return <View style={{ gap: 8 }}><Text variant='labelMedium' style={{ color: theme.colors.primary, letterSpacing: 2 }}>{eyebrow.toUpperCase()}</Text><Text variant='headlineLarge' style={{ fontWeight: '800' }}>{title}</Text>{detail ? <Text variant='bodyMedium' style={{ color: theme.colors.onSurfaceVariant }}>{detail}</Text> : null}</View>;
}
export function Notice({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.notice, { backgroundColor: theme.colors.primaryContainer }]}><Text variant='bodySmall' style={{ color: theme.colors.onPrimaryContainer }}>{children}</Text></View>;
}
export function Row({ children }: { children: ReactNode }) { return <View style={styles.row}>{children}</View>; }
export const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 880, alignSelf: 'center', padding: 22, paddingBottom: 36, gap: 20 },
  panel: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  notice: { padding: 14, borderRadius: 14 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  grow: { flex: 1 },
  mono: { fontFamily: 'monospace', fontSize: 12 },
});
