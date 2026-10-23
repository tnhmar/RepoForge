import { Tabs } from 'expo-router';
export default function MainRoutes() {
  return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
    <Tabs.Screen name='index' />
    <Tabs.Screen name='repositories' />
    <Tabs.Screen name='activity' />
    <Tabs.Screen name='workbench' />
    <Tabs.Screen name='settings' />
    <Tabs.Screen name='import' options={{ href: null }} />
  </Tabs>;
}
