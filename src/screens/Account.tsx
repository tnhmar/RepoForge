import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppState, Alert, Linking } from 'react-native';
import { ActivityIndicator, Button, Chip, Text } from 'react-native-paper';
import { appSlug, configured, signIn, signOut, useSession } from '../auth';
import { installedRepos, installations, type Installation } from '../github';
import { useJobs } from '../liveStore';
import { useApp } from '../store';
import { Heading, Notice, Page, Panel, Row } from '../components/ui';

export function AccountScreen() {
  const router = useRouter(); const user = useSession((s) => s.user); const notice = useSession((s) => s.notice);
  const theme = useApp((s) => s.theme); const setTheme = useApp((s) => s.setTheme);
  const [busy, setBusy] = useState(false); const [checking, setChecking] = useState(false); const [error, setError] = useState('');
  const [access, setAccess] = useState<{ userId: number; installations: Installation[]; repositoryCount: number; more: boolean } | null>(null);
  const refresh = useCallback(async () => {
    if (!user) return;
    const userId = user.id; setChecking(true); setError('');
    try {
      const result = await installations();
      const counts = await Promise.all(result.installations.map(async (installation) => {
        try { return (await installedRepos(installation.id)).total_count; } catch { return null; }
      }));
      if (counts.length && counts.every((n) => n === null)) throw new Error('Repository access could not be checked. Complete organization approval / SSO or retry when online.');
      if (useSession.getState().user?.id === userId) setAccess({ userId, installations: result.installations, repositoryCount: counts.reduce<number>((sum, n) => sum + (n ?? 0), 0), more: result.total_count > result.installations.length });
    } catch (e) { if (useSession.getState().user?.id === userId) setError(e instanceof Error ? e.message : 'Unable to check repository access.'); }
    finally { setChecking(false); }
  }, [user]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) return refresh(); });
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active' && active) void refresh(); });
    return () => { active = false; subscription.remove(); };
  }, [refresh]);
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Operation failed.'); } finally { setBusy(false); } };
  const openInstall = async () => {
    try { await Linking.openURL(`https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new`); }
    catch { setError('Could not open GitHub. Try again with a browser installed.'); }
  };
  const ownAccess = access?.userId === user?.id ? access : null;
  return <Page>
    <Heading eyebrow='Android + GitHub only' title='Account & access' detail='No RepoForge server, hosting, or manual access token.' />
    {notice ? <Notice>{notice}</Notice> : null}{error ? <Notice>{error}</Notice> : null}
    {!configured() ? <Notice>This test APK is missing its developer registration values. Users should not enter credentials here. The developer must configure the GitHub App and rebuild; see docs/SETUP.md.</Notice> : null}
    <Panel>
      <Text variant='titleLarge'>1. Sign in</Text>
      <Text>{user ? `Signed in as @${user.login}` : 'GitHub handles your password and approval in the browser.'}</Text>
      <Button mode='contained' disabled={busy || !configured()} loading={busy} onPress={() => void run(signIn)}>{user ? 'Authorize again' : 'Sign in with GitHub'}</Button>
      <Text variant='bodySmall'>Android validates OAuth state and PKCE, then exchanges the code directly with GitHub. Personal access and refresh tokens stay in SecureStore.</Text>
    </Panel>
    {user ? <Panel>
      <Text variant='titleLarge'>2. Choose repository access</Text>
      {checking ? <ActivityIndicator /> : null}
      {ownAccess ? <Text>{ownAccess.installations.length} accessible installations checked · {ownAccess.repositoryCount} repositories available{ownAccess.more ? ' · more accounts are available in Repositories' : ''}</Text> : <Text>Check which accounts and repositories GitHub has authorized.</Text>}
      {ownAccess && !ownAccess.installations.length ? <Notice>Sign-in succeeded. Next, install RepoForge on your GitHub account and choose repositories. If your organization requires approval, its owner must approve the installation.</Notice> : null}
      {ownAccess?.installations.map((installation) => <Text key={installation.id}>{installation.account.login} · Contents: {installation.permissions.contents || 'not granted'} · Workflows: {installation.permissions.workflows || 'not granted'}</Text>)}
      <Button mode='outlined' disabled={!appSlug || busy} onPress={() => void openInstall()}>Choose / manage repositories on GitHub</Button>
      <Button disabled={checking} onPress={() => void refresh()}>I finished — refresh access</Button>
      <Text variant='bodySmall'>When you return from GitHub, access is checked again. GitHub may request organization approval or SSO. Contents write access and your own write permission are both needed to import.</Text>
    </Panel> : null}
    {user ? <Panel>
      <Text variant='titleLarge'>3. Start working</Text>
      <Button mode='contained' disabled={checking || !ownAccess || (!ownAccess.repositoryCount && !ownAccess.more)} onPress={() => router.navigate('/repositories')}>Open my repositories</Button>
      <Text>Browse a repository, select an existing base branch, and import a ZIP into a new branch after reviewing its changes.</Text>
    </Panel> : null}
    <Panel><Text variant='titleMedium'>Appearance</Text><Row>{(['system', 'light', 'dark'] as const).map((value) => <Chip key={value} selected={theme === value} onPress={() => setTheme(value)}>{value}</Chip>)}</Row></Panel>
    {user ? <Panel>
      <Button disabled={busy} onPress={() => void run(() => signOut(false))}>Sign out on this device</Button>
      <Button disabled={busy} onPress={() => Alert.alert('Revoke this access token?', 'Clears this device’s session and asks GitHub directly to revoke the submitted access token. To withdraw all app authorization, use GitHub Settings → Applications → Authorized GitHub Apps.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Revoke and sign out', onPress: () => void run(() => signOut(true)) }])}>Revoke token and sign out</Button>
      <Button onPress={() => Alert.alert('Clear local publication history?', 'Only this account’s local metadata will be removed. GitHub repositories and commits are unchanged.', [{ text: 'Cancel' }, { text: 'Clear', onPress: () => useJobs.getState().clear(user.id) }])}>Clear this account’s history</Button>
    </Panel> : null}
    <Notice>Public-client design: the APK contains an extractable app client secret. It is not proof of an official client. It is distinct from your personal tokens. RepoForge never contains a GitHub App private key.</Notice>
  </Page>;
}
