# APK sign-in configuration failure

The disabled sign-in screenshot is the local configured() guard, before any GitHub authorization request. At least one embedded registration field is absent/invalid: client ID, app slug, or public-client registration secret. It is not evidence of a wrong password, upload failure or callback rejection. The screenshot alone cannot identify the specific field or installed commit.

The old pipeline read the two public registration fields only from Actions vars and silently substituted empty strings in app.config.ts; an unconfigured APK could still build. A developer who saved the public fields under Actions secrets instead of variables would also get empty strings. PR builds intentionally lacked the registration secret but could still produce an APK. The UI misleadingly instructed everyone to install a main-branch APK, despite v3 being supported.

The fix accepts public registration fields from vars or identically named secrets, trims app configuration, and fails trusted APK builds if any registration field is absent or malformed. The check also resolves Expo config and checks the exact embedded fields without printing values. It is not a live test that the credentials are valid with GitHub. app.config.ts repeats the presence/format gate whenever REPOFORGE_REQUIRE_AUTH=1. CI no longer packages unusable PR APKs; PR lint/typecheck/tests still run without the app secret. Existing PKCE, token rotation and SecureStore behavior is unchanged. No private key, backend or manual token entry is introduced.

Repository Settings > Secrets and variables > Actions:
- EXPO_PUBLIC_GITHUB_CLIENT_ID: GitHub App Client ID, normally a variable; the identically named secret is also accepted.
- EXPO_PUBLIC_GITHUB_APP_SLUG: slug only, normally a variable; the identically named secret is also accepted. Existing setup docs identify repoforgehmar for this registration. Do not use the app URL or numeric App ID.
- REPOFORGE_CLIENT_SECRET: Actions secret. The workflow maps it to process environment GITHUB_CLIENT_SECRET. Never paste the value in chat/source/logs. A completely unset secret cannot be reconstructed by code.

If these values are environment-scoped instead of repository/organization-scoped, the build job must explicitly name the matching GitHub environment; no unknown environment is guessed here. Do not weaken fork/PR restrictions to retrieve secrets.

Builds display version/branch/commit on sign-in and in Account. CI artifacts are branch-qualified, e.g. repoforge-v3-android-release-apk, and include safe apk-build-info.json with presence booleans and build identity only. The shared latest-apk release remains main-only; use the artifact from the desired v3 run for v3.

An already installed APK cannot be repaired by changing repository settings. A correctly configured replacement APK must be built and installed. This patch cannot prove which field is absent from the user's existing binary because no APK/config report or CI log was supplied. If fields are entirely unset or inaccessible, the new CI step fails naming the setting rather than distributing a broken APK. No secret setting or value has been read or modified through the connector.

Source-only fix. No install, build, tests, typecheck, lint, CI inspection, resolved-config command or post-push verification is run by the assistant. The new CI preflight is code for subsequent workflow runs, not a claimed successful verification.
