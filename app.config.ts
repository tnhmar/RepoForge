import base from './app.json';

export default {
  ...base.expo,
  version: '0.2.0',
  plugins: [
    ...base.expo.plugins,
    'expo-secure-store',
    'expo-audio',
    'expo-status-bar',
  ],
};
