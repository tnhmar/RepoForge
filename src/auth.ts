import { AuthRequest, CodeChallengeMethod, ResponseType } from 'expo-auth-session';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { fromByteArray } from 'base64-js';
import { strToU8 } from 'fflate';
import { create } from 'zustand';
import { authorizationBody, CALLBACK_URI, parseTokenPair, refreshBody, TOKEN_ENDPOINT, validCallbackState, type TokenPair } from './authProtocol';

const settings = Constants.expoConfig?.extra?.githubAuth as Record<string, unknown> | undefined;
export const clientId = typeof settings?.clientId === 'string' ? settings.clientId : '';
export const appSlug = typeof settings?.appSlug === 'string' ? settings.appSlug : '';
// Public-client value: deliberately distributed in the APK, never a confidential app identity.
const clientSecret = typeof settings?.clientSecret === 'string' ? settings.clientSecret : '';
const config = { clientId, clientSecret };
const key = 'repoforge.github.session.v2';
const legacyKey = 'repoforge.github.session.v1';
export type User = { id: number; login: string };
type SavedSession = TokenPair & { clientId: string; user: User };
export const useSession = create<{ user: User | null; ready: boolean; notice: string }>(() => ({ user: null, ready: false, notice: '' }));
let generation = 0;
let storageQueue: Promise<unknown> = Promise.resolve();
let refreshTask: Promise<string> | null = null;
let loginTask: Promise<void> | null = null;
let restoreTask: Promise<void> | null = null;
function storage<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.catch(() => undefined).then(operation);
  storageQueue = result.then(() => undefined, () => undefined);
  return result;
}
export function configured() { return !!clientId && !!clientSecret && /^[A-Za-z0-9-]+$/.test(appSlug); }
function requireConfig() { if (!configured()) throw new Error('This APK is not configured for GitHub sign-in. The developer must set the app registration values and rebuild. No server or end-user token setup is needed.'); }
async function readSession(): Promise<SavedSession | null> {
  return storage(async () => {
    const raw = await SecureStore.getItemAsync(key); if (!raw) return null;
    try {
      const saved = JSON.parse(raw) as SavedSession;
      if (saved.clientId !== clientId || typeof saved.accessToken !== 'string' || typeof saved.refreshToken !== 'string' || !Number.isFinite(saved.accessExpiresAt) || !Number.isFinite(saved.refreshExpiresAt) || !Number.isSafeInteger(saved.user?.id) || typeof saved.user?.login !== 'string') throw new Error('Invalid stored session');
      return saved;
    } catch { await SecureStore.deleteItemAsync(key); return null; }
  });
}
async function save(pair: TokenPair, user: User, expected: number) {
  await storage(async () => {
    if (expected !== generation) throw new Error('Session changed. Sign in again.');
    await SecureStore.setItemAsync(key, JSON.stringify({ ...pair, clientId, user }), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    if (expected !== generation) throw new Error('Session changed.');
    useSession.setState({ user, ready: true, notice: '' });
  });
}
async function clear(expected: number, notice: string) {
  await storage(async () => {
    if (expected !== generation) return;
    await SecureStore.deleteItemAsync(key);
    useSession.setState({ user: null, ready: true, notice });
  });
}
async function exchange(body: string): Promise<TokenPair> {
  requireConfig();
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(TOKEN_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: controller.signal });
    const data = await response.json() as Record<string, unknown>;
    if (!response.ok || data.error) {
      const kind = typeof data.error === 'string' ? data.error : '';
      if (kind === 'incorrect_client_credentials') throw new Error('GitHub rejected this APK’s app credentials. The developer must check or rotate the registration values and rebuild.');
      if (kind === 'redirect_uri_mismatch') throw new Error('GitHub callback mismatch. The registered callback must be exactly repoforge://oauth.');
      throw new Error('GitHub could not complete authorization. Start sign-in again.');
    }
    return parseTokenPair(data, Date.now());
  } finally { clearTimeout(timer); }
}
async function identity(accessToken: string): Promise<User> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: controller.signal });
    if (!response.ok) throw new Error('GitHub could not verify the user. Sign in again when online.');
    const user = await response.json() as Partial<User>;
    if (!Number.isSafeInteger(user.id) || typeof user.login !== 'string') throw new Error('Invalid GitHub identity response.');
    return { id: user.id as number, login: user.login };
  } finally { clearTimeout(timer); }
}
export async function token(): Promise<string> {
  requireConfig(); const expected = generation; const saved = await readSession();
  if (expected !== generation || !saved) throw new Error('Sign in with GitHub first.');
  if (saved.accessExpiresAt > Date.now() + 90000) return saved.accessToken;
  if (saved.refreshExpiresAt <= Date.now()) { await clear(expected, 'Your authorization expired. Sign in with GitHub again.'); throw new Error('Session expired. Sign in again.'); }
  if (!refreshTask) {
    const task = (async () => {
      try {
        const pair = await exchange(refreshBody(config, saved.refreshToken));
        // Save both rotated tokens together before any further network request.
        await save(pair, saved.user, expected);
        return pair.accessToken;
      } catch {
        await clear(expected, 'Session refresh was not completed. Sign in again; the previous refresh token may already have been rotated.');
        throw new Error('Unable to refresh safely. Sign in with GitHub again.');
      }
    })();
    refreshTask = task;
    void task.then(() => { if (refreshTask === task) refreshTask = null; }, () => { if (refreshTask === task) refreshTask = null; });
  }
  return refreshTask;
}
export function restoreSession(): Promise<void> {
  if (!restoreTask) restoreTask = (async () => {
    const expected = generation;
    try {
      await storage(() => SecureStore.deleteItemAsync(legacyKey));
      const saved = await readSession();
      if (!saved || !configured()) { if (expected === generation) useSession.setState({ user: null, ready: true }); return; }
      const user = await identity(await token());
      if (user.id !== saved.user.id) { await clear(expected, 'Account identity changed. Sign in again.'); return; }
      if (expected === generation) useSession.setState({ user, ready: true, notice: '' });
    } catch { if (expected === generation) useSession.setState({ user: null, ready: true, notice: 'Session could not be verified. Check your connection and sign in again.' }); }
  })();
  return restoreTask;
}
export function signIn(): Promise<void> {
  if (loginTask) return loginTask;
  const task = (async () => {
    requireConfig(); const expected = ++generation; useSession.setState({ notice: '' });
    const request = new AuthRequest({ clientId, redirectUri: CALLBACK_URI, responseType: ResponseType.Code, scopes: ['offline_access'], usePKCE: true, codeChallengeMethod: CodeChallengeMethod.S256 });
    const discovery = { authorizationEndpoint: 'https://github.com/login/oauth/authorize' };
    await request.makeAuthUrlAsync(discovery);
    const result = await request.promptAsync(discovery);
    if (result.type === 'cancel' || result.type === 'dismiss') return;
    if (expected !== generation || result.type !== 'success' || !validCallbackState(request.state, result.params.state) || !request.codeVerifier || !result.params.code) throw new Error('Authorization was interrupted or the callback state did not match. Start sign-in again.');
    const pair = await exchange(authorizationBody(config, result.params.code, request.codeVerifier));
    await save(pair, await identity(pair.accessToken), expected);
  })();
  loginTask = task;
  void task.then(() => { if (loginTask === task) loginTask = null; }, () => { if (loginTask === task) loginTask = null; });
  return task;
}
export async function signOut(revoke = false) {
  const expected = ++generation;
  const saved = await storage(async () => {
    const raw = await SecureStore.getItemAsync(key);
    await SecureStore.deleteItemAsync(key); await SecureStore.deleteItemAsync(legacyKey);
    if (expected === generation) useSession.setState({ user: null, ready: true, notice: '' });
    return raw ? JSON.parse(raw) as SavedSession : null;
  });
  if (!revoke || !saved) return;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
  try {
    requireConfig();
    const response = await fetch(`https://api.github.com/applications/${encodeURIComponent(clientId)}/token`, { method: 'DELETE', headers: { Authorization: `Basic ${fromByteArray(strToU8(`${clientId}:${clientSecret}`))}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' }, body: JSON.stringify({ access_token: saved.accessToken }), signal: controller.signal });
    if (response.status !== 204) throw new Error('Revocation not confirmed');
    if (expected === generation) useSession.setState({ notice: 'Signed out. GitHub confirmed revocation of the submitted access token.' });
  } catch { if (expected === generation) useSession.setState({ notice: 'Local sign-out is complete, but remote revocation was not confirmed. Revoke RepoForge in GitHub Settings → Applications → Authorized GitHub Apps.' }); }
  finally { clearTimeout(timer); }
}
WebBrowser.maybeCompleteAuthSession();
