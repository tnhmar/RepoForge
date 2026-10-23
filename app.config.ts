import base from './app.json';

export default {
  ...base.expo,
  version: '0.3.0',
  plugins: [
    ...base.expo.plugins,
    'expo-secure-store',
    'expo-audio',
    'expo-status-bar',
  ],
  extra: {
    githubAuth: {
      clientId: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '',
      appSlug: process.env.EXPO_PUBLIC_GITHUB_APP_SLUG || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
  },
};
