import { Tabs } from 'expo-router';
export default function MainRoutes() {
  return <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}><Tabs.Screen name='index' /><Tabs.Screen name='repositories' /><Tabs.Screen name='import' /><Tabs.Screen name='workbench' /><Tabs.Screen name='activity' /><Tabs.Screen name='settings' /></Tabs>;
}
