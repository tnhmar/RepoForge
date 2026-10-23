# RepoForge 0.2: deployment and operating limits

## Status

This commit adds live implementation code, not evidence of a successful build or deployed authentication. No local install, typecheck, lint, tests, APK build or post-push inspection was performed. The new GitHub Actions pipeline is responsible for validation. CI success and device testing must still be observed by the owner.

The earlier UI-only description in docs/IMPLEMENTATION.md documents milestone 0.1 and is superseded here. Bundled fixtures in src/data.ts are no longer used by the live routes. Item 5 (issues, PRs, Actions browsing, notifications, releases UI, multi-account and Enterprise) remains deferred.

## Authentication decision

GitHub App user authorization with system-browser code flow, S256 PKCE, random state, expiring tokens and a minimal HTTPS token broker. No device flow, client secret in the APK, app private key, password capture, or personal-token login. The broker processes authentication tokens, never project contents. Tokens are stored with Expo SecureStore; publication metadata is in AsyncStorage. Session data and job display are scoped by durable GitHub user ID.

1. Register a GitHub App in your developer settings. Use your RepoForge repository URL as the homepage and EXACT callback `repoforge://oauth`. Disable callback wildcard matching. Keep device flow disabled. This callback requires the standalone Android build, not Expo Go.
2. Repository permissions: Metadata read, Contents read/write. Add Workflows read/write only if workflow import is needed. Add Administration read/write only if using in-app repository creation. No issue, PR, or organization-membership permission is needed for this milestone. Keep expiring user access tokens enabled. Webhooks are not used.
3. Install the app on selected repositories or all repositories. Organization policy can require approval and SAML SSO. User permissions and installation permissions both constrain writes. New personal repositories may require installation access to be updated before browsing.
4. Deploy broker/server.mjs using Node 22 behind an HTTPS reverse proxy. Set SERVER-ONLY environment variables `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, optionally `HOST` and `PORT`. Default listener is 127.0.0.1:3000. Never put the client secret in repository variables prefixed EXPO_PUBLIC, source, logs, or the APK. Keep tokens out of reverse-proxy request logging. Use process supervision and infrastructure-level rate limits; the in-process IP limiter is only a basic safeguard and sees the proxy IP by default. Run `npm run broker` on the server. No server-side token database is used.
5. Add GitHub Actions repository VARIABLES (not secrets): `EXPO_PUBLIC_GITHUB_CLIENT_ID`, `EXPO_PUBLIC_GITHUB_APP_SLUG`, `EXPO_PUBLIC_AUTH_BROKER_URL`. The last value is the broker's HTTPS origin without a trailing slash or path. These are public build configuration. Use the same names in your local environment for development. Rebuild after changing them. The server client ID must match the app client ID.
6. Sign in in the APK, install/manage access from Settings, then refresh Repositories. The app lists installation accounts and paginates their repositories. GitHub remains the final authorization authority; API errors report restrictions. Sign-out clears the local token. Explicit revoke asks the broker to revoke the token; on network failure revoke manually in GitHub settings.

No App registration, server deployment, secret creation, or repository-variable configuration is performed by this source commit. Those require owner setup outside the available connector's capabilities.

## CI pipeline

Reconstructed from CitizenshipExam workflow commit history: original 0e534f561f834fcf67f85fcb5b1772065cfe01ac, build/prerelease change 5ccf44c653f2b264539ea9a52b78d0f0b7e39af8, PR-trigger fix 595b8a236e87d6abd234101d8d04db8b20ffa972.

Push main, any PR, or manual dispatch -> Node 22 install -> Expo SDK alignment -> typecheck/lint/Jest -> JDK 17 -> Expo prebuild -> Gradle assembleRelease -> APK artifact. Trusted main builds replace the rolling `latest-apk` prerelease. PR builds NEVER publish releases. The build consumes exactly the dependency manifests resolved by its test job. Artifacts include the generated lockfile; commit a reviewed lockfile later for reproducibility across separate CI runs. Existing reference version specifications remain unchanged; new native packages use documented SDK 56 version ranges. Expo alignment may update compatible patch specifications inside the runner.

These are test APKs using generated native signing configuration, not a production signing setup. Do not rely on signing-key continuity for updates between builds. Production signing, secure keystore storage and Play Store delivery are not included.

## Live repository functions

Installation-account selection, paginated repository and branch lists, local search/filter of the current repository page, directory navigation, UTF-8 text/README source display up to 256 KiB, GitHub links, personal repository creation, and separately confirmed empty-repository initialization. Initialization creates README.md in an initial commit and cannot overwrite an existing README because no existing file SHA is supplied. README source is displayed as text, not rendered Markdown. Directory endpoint results may be capped; import uses a complete recursive Git tree and rejects truncation.

## Real ZIP import

Select repository -> select native ZIP document -> validate archive -> configure existing base and NEW target branch -> choose optional destination, enclosing-folder removal and sensitive-file exclusions -> calculate complete live added/modified/unchanged/deleted preview -> acknowledge deletions -> approve publication.

Regular file bytes are preserved, including binary content; executable flags are taken from Unix ZIP attributes when supplied. Files are decompressed into bounded memory, not written using archive paths. Only the picker-created cached ZIP copy is removed afterward. Git has no tracked empty-directory representation. Symlinks/special files, .git entries, encryption, split archives, ZIP64 and non-UTF-8 non-ASCII names are rejected rather than silently transformed. Compression methods 0 and 8 are supported. Central/local headers, duplicate and case-normalized paths, file/directory collisions, declared and actual sizes, CRC, expansion ratios, and entry bounds are checked. This parser still needs extensive adversarial testing and a security review before public release.

Initial policy: 20 MiB compressed, 50 MiB extracted, 5 MiB per file, 300 regular files, 1000 archive entries, expansion <=200:1, path <=1024 UTF-8 bytes / 40 segments. These are app limits, NOT GitHub service limits. Full destination tree <=20,000 entries. Secret filename warnings are heuristic and cannot guarantee that source files contain no credentials.

Add/update retains destination files absent from the ZIP. Replacement removes only paths in the selected destination; every deletion is shown, including previously existing files excluded from the incoming ZIP. File/directory or case collisions fail closed. Workflow changes can trigger GitHub Actions and need Workflows write permission.

Publication creates binary-safe blobs, the complete resulting tree, one commit parented to the reviewed base, and finally a NEW branch reference. Existing branches are never updated or force-pushed. The base is checked before upload and before commit creation; a concurrent base change afterward does not overwrite it because publication still only creates a new branch. Target-name races fail safely at reference creation. Object uploads alone do not publish a branch.

Writes are serialized/paced at least 8 seconds apart to reduce primary/secondary content-generation limits; stricter endpoint limits can still return errors. Rate errors expose wait information; writes are not blindly retried. Foreground progress and cooperative network cancellation are implemented. An already-sent branch-creation request cannot be recalled. A lost response at final publication is explicitly recorded as UNKNOWN, with commit SHA and a branch-check link. Confirm GitHub's state before retrying.

Retry within a running process reuses confirmed uploaded blob hashes. Job status and any created commit SHA persist locally; file bytes and full previews do not. Process death or app restart requires reselecting the ZIP and rebuilding the preview. This is NOT durable background upload, automatic resume, a filesystem Git client, or a production-ready audited importer.
