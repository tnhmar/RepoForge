import base from './app.json';

const clientId = (process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '').trim();
const appSlug = (process.env.EXPO_PUBLIC_GITHUB_APP_SLUG || '').trim();
const clientSecret = (process.env.GITHUB_CLIENT_SECRET || '').trim();
const missing = [
  ...(!clientId || !/^[A-Za-z0-9._-]+$/.test(clientId) ? ['EXPO_PUBLIC_GITHUB_CLIENT_ID'] : []),
  ...(!/^[A-Za-z0-9-]+$/.test(appSlug) ? ['EXPO_PUBLIC_GITHUB_APP_SLUG'] : []),
  ...(!clientSecret || /\s/.test(clientSecret) ? ['REPOFORGE_CLIENT_SECRET (build environment: GITHUB_CLIENT_SECRET)'] : []),
];
if (process.env.REPOFORGE_REQUIRE_AUTH === '1' && missing.length) throw new Error(`Refusing an unconfigured sign-in APK. Missing or invalid registration fields: ${missing.join(', ')}. Set the repository Actions variables/secrets and rebuild. No registration values were printed.`);

export default {
  ...base.expo,
  version: '0.3.1',
  plugins: [...base.expo.plugins, 'expo-secure-store', 'expo-audio', 'expo-status-bar', 'expo-notifications'],
  extra: {
    githubAuth: { clientId, appSlug, clientSecret },
    build: {
      branch: process.env.REPOFORGE_BUILD_BRANCH || 'local',
      commit: process.env.REPOFORGE_BUILD_SHA || '',
      runId: process.env.REPOFORGE_BUILD_RUN_ID || '',
    },
  },
};
