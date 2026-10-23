import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useSession } from '../auth';
import { useJobs } from '../liveStore';
export const useAlertPreferences = create<{ enabled: boolean; setEnabled: (value: boolean) => void }>()(persist((set) => ({ enabled: false, setEnabled: (enabled) => set({ enabled }) }), { name: 'repoforge.local-alerts.v1', storage: createJSONStorage(() => AsyncStorage) }));
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
export async function enableLocalAlerts() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('repoforge-uploads', { name: 'RepoForge uploads', importance: Notifications.AndroidImportance.DEFAULT });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Android notification permission was not granted. Uploads still work.');
}
export function PublicationNotifier() {
  const userId = useSession((s) => s.user?.id); const enabled = useAlertPreferences((s) => s.enabled); const router = useRouter();
  useEffect(() => {
    if (!enabled || !userId) return;
    const unsubscribe = useJobs.subscribe((state, previous) => {
      for (const job of state.jobs) {
        const before = previous.jobs.find((item) => item.id === job.id);
        if (!before || job.userId !== userId || before.status === job.status || !['completed', 'failed', 'unknown'].includes(job.status)) continue;
        void Notifications.scheduleNotificationAsync({ identifier: `repoforge-upload-${job.id}`, content: { title: job.status === 'completed' ? 'Project upload completed' : 'Project upload needs attention', body: 'Open RepoForge to view the result.', data: { destination: 'activity', userId }, ...(Platform.OS === 'android' ? { sound: false } : {}) }, trigger: null }).catch(() => {});
      }
    });
    return unsubscribe;
  }, [enabled, userId]);
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data.destination === 'activity' && data.userId === useSession.getState().user?.id) router.navigate('/activity');
    });
    return () => subscription.remove();
  }, [router]);
  return null;
}
