export const CALLBACK_URI = 'repoforge://oauth';
export const TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token';
export type PublicClientConfig = { clientId: string; clientSecret: string }; // Native apps cannot keep this secret confidential; PKCE is still required.
export type TokenPair = { accessToken: string; refreshToken: string; accessExpiresAt: number; refreshExpiresAt: number };
export function formEncode(values: Record<string, string>): string {
  return Object.entries(values).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}
export function authorizationBody(config: PublicClientConfig, code: string, verifier: string) {
  if (!/^[A-Za-z0-9-]+$/.test(config.clientId) || !config.clientSecret || !code || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new Error('Invalid authorization exchange parameters.');
  return formEncode({ client_id: config.clientId, client_secret: config.clientSecret, code, code_verifier: verifier, redirect_uri: CALLBACK_URI });
}
export function refreshBody(config: PublicClientConfig, refreshToken: string) {
  if (!/^[A-Za-z0-9-]+$/.test(config.clientId) || !config.clientSecret || !refreshToken) throw new Error('Invalid refresh parameters.');
  return formEncode({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken });
}
export function validCallbackState(expected: string, received: unknown) {
  return expected.length > 0 && typeof received === 'string' && received === expected;
}
export function parseTokenPair(input: unknown, now: number): TokenPair {
  if (!input || typeof input !== 'object') throw new Error('Invalid GitHub token response.');
  const data = input as Record<string, unknown>;
  const access = data.access_token; const refresh = data.refresh_token;
  const ttl = data.expires_in; const refreshTtl = data.refresh_token_expires_in;
  if (data.token_type !== 'bearer' || typeof access !== 'string' || !access || access.length > 4096 || typeof refresh !== 'string' || !refresh || refresh.length > 4096 || typeof ttl !== 'number' || !Number.isFinite(ttl) || ttl <= 0 || typeof refreshTtl !== 'number' || !Number.isFinite(refreshTtl) || refreshTtl <= 0) throw new Error('GitHub did not return the expected expiring token pair. Check the app registration.');
  return { accessToken: access, refreshToken: refresh, accessExpiresAt: now + ttl * 1000, refreshExpiresAt: now + refreshTtl * 1000 };
}
