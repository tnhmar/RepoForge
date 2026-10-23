# RepoForge 0.3 — developer setup, no backend

RepoForge is an Android public client. Authentication, refresh, repository browsing and uploads communicate directly with GitHub. No server, token broker, database, webhook receiver, app private key or paid hosting is required. The obsolete broker file from 0.2 is unused; its deletion is a separate connector operation. The npm broker command and broker-URL dependency are removed. Earlier setup instructions requiring hosting are superseded.

## One-time GitHub App registration

1. Open your GitHub account Settings → Developer settings → GitHub Apps → New GitHub App.
2. Choose a unique app name. Use the public RepoForge repository URL as the homepage; a hosted website is unnecessary.
3. Set the exact user authorization callback to `repoforge://oauth`. Disable wildcard matching. Do not configure a hosted callback.
4. Keep user-token expiration enabled. RepoForge also requests `offline_access` to require an expiring access/refresh pair. This scope controls expiration, not repository permissions.
5. Keep Device Flow disabled. Keep Request user authorization during installation disabled so Android starts authorization with its own PKCE/state. Leave Setup URL empty.
6. Disable active webhooks. Do not generate or distribute an app private key for this client.
7. Repository permissions: Metadata read; Contents read/write. Workflows read/write only if workflow-file imports are intended. No issue, pull-request, organization or account permissions are needed for this milestone.
8. Administration is NOT required for ZIP publication into existing repositories. The optional personal-repository creation button in the existing repository screen has separate endpoint permission requirements and can fail without them. Do not grant broad administration solely to enable imports; create a repository on GitHub if needed.
9. Choose installation visibility: any account for public distribution, or your account only while privately testing.
10. Save the registration, note its Client ID (not App ID), note its slug, and generate its client secret.

## Configure GitHub Actions builds

Repository Settings → Secrets and variables → Actions:

- VARIABLE `EXPO_PUBLIC_GITHUB_CLIENT_ID`: the GitHub App Client ID.
- VARIABLE `EXPO_PUBLIC_GITHUB_APP_SLUG`: the app slug.
- SECRET `GITHUB_CLIENT_SECRET`: the app client secret. Do not paste it in chat, source code, issues or logs.

Delete the old `EXPO_PUBLIC_AUTH_BROKER_URL` variable if it exists; it is no longer read. No hosted service configuration is needed.

The client secret is injected only into the Android build job for trusted main pushes / main manual runs, not tests or PR builds. PR APKs intentionally lack sign-in configuration. app.config.ts embeds the registration values in the Android app configuration. Never print full resolved Expo configuration in CI because it includes the distributed value. Rebuild after configuration or app-secret changes.

## Public-client threat model — important

This GitHub client secret is EXTRACTABLE FROM THE APK, including public release APKs. Using an Actions secret keeps it out of source and ordinary logs; it does not hide it from application users. This is GitHub's documented native/public-client authorization-code + PKCE model. It must never be used as proof of an authentic official installation or as a key to your own services. Public clients can be impersonated. Do not distribute an app private key.

User access tokens and refresh tokens are different credentials: stored only in platform SecureStore, never in app configuration or AsyncStorage, and never logged. Rotate the public-client secret with a coordinated rebuild if required; old APK refresh may stop working after rotation.

## User experience

See docs/USER_GUIDE.md. Users do not register applications, configure secrets, deploy services or paste access tokens. Sign in → choose repositories if needed → return → open repositories. The Account screen checks access after browser return and offers an explicit refresh. GitHub installation approval and user authorization are distinct steps. Organizations can require owner approval and SAML SSO.

## Token lifecycle and failure handling

Authorization uses the system browser, random state and S256 PKCE. Codes and refresh grants are sent directly to GitHub over HTTPS in a form body. The returned identity is checked with GET /user and recorded using its stable numeric ID. Callback codes are accepted only by a matching in-memory authorization request; an interrupted process requires fresh sign-in.

Access/refresh pairs and both expiration times are stored together. Refresh is single-flight and saves the rotated pair before another network request. Ambiguous or failed refresh clears the old session and requests sign-in rather than repeatedly reusing a possibly spent refresh token. Sign-out cannot guarantee recall of a request already sent. Explicit access-token revocation talks directly to GitHub; failure is surfaced as unconfirmed, with instructions for manual app-authorization revocation.

The storage key changes from v1 to v2; old broker-era sessions are removed locally and users sign in again. A session change invalidates pending saves. No project bytes pass through authentication infrastructure.

## CI and validation

The existing Node 22 / Expo SDK 56 / JDK 17 / Gradle / latest-apk pipeline is preserved. Tests cover form construction, PKCE verifier requirements, callback-state checks, expiring token-pair validation, and the previous ZIP/import logic. No install, lint, typecheck, tests, device run, CI inspection or post-push verification was performed in preparing this change. Source implementation is not proof that CI or a real sign-in passes. These remain test APKs, not a production signing or audited security release.

## Official basis

GitHub Docs: Best practices for creating a GitHub App (Client secrets / public clients); Generating a user access token for a GitHub App; Refreshing user access tokens. The public-client secret limitation is intentional, not a claim that APK secrets are confidential.
