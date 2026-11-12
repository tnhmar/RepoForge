import Constants from 'expo-constants';

export function authDiagnostics() {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const settings = extra?.githubAuth as Record<string, unknown> | undefined;
  const build = extra?.build as Record<string, unknown> | undefined;
  const issues: string[] = [];
  const clientId = typeof settings?.clientId === 'string' ? settings.clientId : '';
  const slug = typeof settings?.appSlug === 'string' ? settings.appSlug : '';
  const secret = typeof settings?.clientSecret === 'string' ? settings.clientSecret : '';
  if (!clientId || !/^[A-Za-z0-9._-]+$/.test(clientId)) issues.push('Client ID is missing or invalid: EXPO_PUBLIC_GITHUB_CLIENT_ID.');
  if (!/^[A-Za-z0-9-]+$/.test(slug)) issues.push('App slug is missing or invalid: EXPO_PUBLIC_GITHUB_APP_SLUG. Use the slug, not a URL.');
  if (!secret || /\s/.test(secret)) issues.push('App registration secret is missing or invalid: Actions secret REPOFORGE_CLIENT_SECRET must be supplied to the build as GITHUB_CLIENT_SECRET.');
  const branch = typeof build?.branch === 'string' ? build.branch : 'unknown branch';
  const commit = typeof build?.commit === 'string' && build.commit ? build.commit.slice(0, 12) : 'unknown commit';
  const version = Constants.expoConfig?.version || 'unknown version';
  return { issues, buildLabel: `Build ${version} · ${branch} · ${commit}` };
}
