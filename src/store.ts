import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
export type PreviewRecord = { id: string; repository: string; branch: string; files: number; message: string; mode: string; paths: string[]; createdAt: string };
interface State {
  theme: 'system' | 'dark' | 'light';
  history: PreviewRecord[];
  setTheme: (theme: State['theme']) => void;
  addPreview: (record: PreviewRecord) => void;
  clearHistory: () => void;
}
export const useApp = create<State>()(persist((set) => ({
  theme: 'system', history: [],
  setTheme: (theme) => set({ theme }),
  addPreview: (record) => set((s) => ({ history: [record, ...s.history].slice(0, 50) })),
  clearHistory: () => set({ history: [] }),
}), { name: 'repoforge-ui-v1', storage: createJSONStorage(() => AsyncStorage) }));
