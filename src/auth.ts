import { AuthRequest, CodeChallengeMethod, ResponseType } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';
export const clientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '';
export const appSlug = process.env.EXPO_PUBLIC_GITHUB_APP_SLUG || '';
const brokerUrl = process.env.EXPO_PUBLIC_AUTH_BROKER_URL || '';
const key = 'repoforge.github.session.v1';
export type User = { id: number; login: string };
type Tokens = { access_token: string; refresh_token?: string; expiresAt?: number; user: User };
export const useSession = create<{ user: User | null; ready: boolean }>(() => ({ user: null, ready: false }));
let generation = 0;
let refreshing: Promise<Tokens> | null = null;
let restoring: Promise<void> | null = null;
export function configured() { return !!clientId && /^https:\/\/[^/?#@]+$/.test(brokerUrl); }
async function broker(path: string, body: object) {
  if (!configured()) throw new Error('Configure the GitHub App client ID and HTTPS token broker first. See docs/SETUP.md.');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${brokerUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error('Authorization service rejected the request. Sign in again or check server configuration.');
    return data as { access_token: string; refresh_token?: string; expires_in?: number };
  } finally { clearTimeout(timer); }
}
async function identity(token: string): Promise<User> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: controller.signal });
    if (!response.ok) throw new Error('GitHub could not validate this session.');
    const user = await response.json();
    if (!Number.isSafeInteger(user.id) || typeof user.login !== 'string') throw new Error('Invalid GitHub identity');
    return { id: user.id, login: user.login };
  } finally { clearTimeout(timer); }
}
async function save(data: { access_token: string; refresh_token?: string; expires_in?: number }, user: User, expected: number): Promise<Tokens> {
  if (expected !== generation) throw new Error('Session changed; sign in again.');
  const tokens: Tokens = { access_token: data.access_token, refresh_token: data.refresh_token, expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined, user };
  await SecureStore.setItemAsync(key, JSON.stringify(tokens), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  if (expected !== generation) { await SecureStore.deleteItemAsync(key); throw new Error('Session changed'); }
  useSession.setState({ user, ready: true }); return tokens;
}
export async function token(): Promise<string> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) throw new Error('Sign in to GitHub first.');
  const saved = JSON.parse(raw) as Tokens;
  if (!saved.expiresAt || saved.expiresAt > Date.now() + 90000) return saved.access_token;
  if (!saved.refresh_token) throw new Error('Session expired. Sign in again.');
  if (!refreshing) {
    const expected = generation;
    refreshing = (async () => {
      const data = await broker('/refresh', { refreshToken: saved.refresh_token });
      const user = await identity(data.access_token);
      if (user.id !== saved.user.id) throw new Error('Account changed unexpectedly. Sign in again.');
      return save(data, user, expected);
    })().finally(() => { refreshing = null; });
  }
  return (await refreshing).access_token;
}
export function restoreSession() {
  if (!restoring) restoring = (async () => {
    try { const access = await token(); const user = await identity(access); useSession.setState({ user, ready: true }); }
    catch { useSession.setState({ user: null, ready: true }); }
  })();
  return restoring;
}
export async function signIn() {
  if (!configured()) throw new Error('GitHub App / broker configuration is missing. See docs/SETUP.md.');
  const expected = generation;
  const request = new AuthRequest({ clientId, redirectUri: 'repoforge://oauth', responseType: ResponseType.Code, scopes: ['offline_access'], usePKCE: true, codeChallengeMethod: CodeChallengeMethod.S256 });
  const discovery = { authorizationEndpoint: 'https://github.com/login/oauth/authorize' };
  await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss') return;
  if (result.type !== 'success' || result.params.state !== request.state || !request.codeVerifier || !result.params.code) throw new Error('Authorization failed or the OAuth state did not match.');
  const data = await broker('/token', { code: result.params.code, verifier: request.codeVerifier });
  await save(data, await identity(data.access_token), expected);
}
export async function signOut(revoke = false) {
  generation += 1;
  const raw = await SecureStore.getItemAsync(key);
  await SecureStore.deleteItemAsync(key);
  useSession.setState({ user: null, ready: true });
  if (revoke && raw) await broker('/revoke', { accessToken: (JSON.parse(raw) as Tokens).access_token });
}
WebBrowser.maybeCompleteAuthSession();
