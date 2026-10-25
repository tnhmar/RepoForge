const fs = require('node:fs');
const fields = [
  { key: 'clientId', env: 'EXPO_PUBLIC_GITHUB_CLIENT_ID', setting: 'EXPO_PUBLIC_GITHUB_CLIENT_ID (Actions variable or secret)', valid: (value) => /^[A-Za-z0-9._-]+$/.test(value) },
  { key: 'appSlug', env: 'EXPO_PUBLIC_GITHUB_APP_SLUG', setting: 'EXPO_PUBLIC_GITHUB_APP_SLUG (Actions variable or secret; slug only, not a URL)', valid: (value) => /^[A-Za-z0-9-]+$/.test(value) },
  { key: 'clientSecret', env: 'GITHUB_CLIENT_SECRET', setting: 'REPOFORGE_CLIENT_SECRET (Actions secret, mapped to GITHUB_CLIENT_SECRET)', valid: (value) => !!value && !/\s/.test(value) },
];
function fail(messages) { for (const text of messages) console.error(`::error::${text}`); process.exit(1); }
const expected = Object.fromEntries(fields.map((field) => [field.key, (process.env[field.env] || '').trim()]));
const absent = fields.filter((field) => !field.valid(expected[field.key]));
if (absent.length) fail(absent.map((field) => `Missing or invalid ${field.setting}. Configure Repository Settings > Secrets and variables > Actions, then rebuild. Values are not logged.`));
let auth;
try {
  const { getConfig } = require('@expo/config');
  const { exp } = getConfig(process.cwd(), { skipSDKVersionRequirement: true, skipPlugins: true });
  auth = exp.extra && exp.extra.githubAuth;
} catch {
  fail(['Expo application configuration could not be resolved. No resolved config or registration values were logged.']);
}
const mismatches = fields.filter((field) => !auth || typeof auth[field.key] !== 'string' || auth[field.key] !== expected[field.key]);
if (mismatches.length) fail(mismatches.map((field) => `Resolved Expo extra.githubAuth does not correctly embed ${field.env}. Refusing to package an unusable sign-in APK.`));
fs.writeFileSync('apk-build-info.json', JSON.stringify({
  branch: process.env.REPOFORGE_BUILD_BRANCH || 'local',
  commit: process.env.REPOFORGE_BUILD_SHA || '',
  runId: process.env.REPOFORGE_BUILD_RUN_ID || '',
  authenticationConfiguration: { clientIdPresent: true, appSlugPresent: true, clientSecretPresent: true },
}, null, 2) + '\n');
console.log('APK registration fields are present and correctly embedded in resolved Expo config. No values were logged. This is not a live GitHub credential validation.');
