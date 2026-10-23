import { describe, expect, test } from '@jest/globals';
import { authorizationBody, CALLBACK_URI, formEncode, parseTokenPair, refreshBody, validCallbackState } from './authProtocol';
const config = { clientId: 'test-client', clientSecret: 'test-secret' };
describe('direct native OAuth protocol', () => {
  test('exchanges a code with matching redirect and PKCE verifier', () => {
    const verifier = 'a'.repeat(43); const body = authorizationBody(config, 'test-code', verifier);
    expect(body).toContain('client_id=test-client');
    expect(body).toContain('client_secret=test-secret');
    expect(body).toContain(`redirect_uri=${encodeURIComponent(CALLBACK_URI)}`);
    expect(body).toContain(`code_verifier=${verifier}`);
  });
  test('uses the refresh grant without a backend', () => {
    expect(refreshBody(config, 'test-refresh')).toContain('grant_type=refresh_token');
    expect(refreshBody(config, 'test-refresh')).toContain('refresh_token=test-refresh');
  });
  test('form encoding cannot inject extra parameters', () => { expect(formEncode({ code: 'a&b=c+ d' })).toBe('code=a%26b%3Dc%2B%20d'); });
  test('rejects absent or mismatched callback state', () => {
    expect(validCallbackState('expected', 'expected')).toBe(true);
    expect(validCallbackState('expected', 'other')).toBe(false);
    expect(validCallbackState('expected', undefined)).toBe(false);
    expect(validCallbackState('', '')).toBe(false);
  });
  test('requires a real PKCE verifier', () => { expect(() => authorizationBody(config, 'code', 'short')).toThrow(); });
  test('tracks both token lifetimes and rejects non-expiring responses', () => {
    const pair = parseTokenPair({ access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 28800, refresh_token_expires_in: 15897600 }, 1000);
    expect(pair.accessExpiresAt).toBe(28801000);
    expect(pair.refreshExpiresAt).toBe(15897601000);
    expect(() => parseTokenPair({ access_token: 'test-access', token_type: 'bearer' }, 1000)).toThrow();
  });
});
