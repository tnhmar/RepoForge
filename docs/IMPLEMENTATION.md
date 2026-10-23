# RepoForge implementation milestones

## 0.3 — current authentication architecture

Android communicates directly with GitHub for browser authorization-code + S256 PKCE, token exchange, refresh, identity, repository access and project publication. No backend is part of the runtime. The obsolete broker source is unused pending a separate deletion operation; there is no broker command, URL setting or active authentication dependency.

See docs/SETUP.md for one-time DEVELOPER registration/build configuration and the public-client secret threat model. See docs/USER_GUIDE.md for END-USER sign-in and repository selection. Users do not deploy services or supply developer credentials.

The APK distributes an extractable app client secret as permitted by GitHub's documented public-client model. User access/refresh tokens are stored separately in SecureStore. No app private key is distributed. CI injects the app-level value only into trusted-main Android builds.

Settings now routes to src/screens/Account.tsx, which guides sign-in, installation access and repository discovery. The older SettingsScreen export in src/screens/Live.tsx is not routed and is superseded. Existing live repository and ZIP-import screens remain in place.

## 0.2 — repository/import engine

Live repository discovery, branch and directory browsing, binary-safe ZIP import, add/update or destination-scoped replacement, live change planning, blob/tree/commit publication to a NEW branch, foreground progress/cancellation and account-scoped publication records. Test APK pipeline follows CitizenshipExam's Node 22 / Expo SDK 56 / JDK 17 / Gradle shape.

Supported import policy remains 20 MiB compressed, 50 MiB extracted, 5 MiB per file, 300 files and 1000 ZIP entries. Symlinks, special files, encrypted/split/ZIP64 archives and unsafe paths are rejected; empty directories are not tracked by Git. Secret filename checks are heuristic. The parser needs adversarial testing and security review before public release.

## 0.1 — original UI foundation

Reference dependency version specifications and configuration were reconstructed from tnhmar/CitizenshipExam commit history. Expo Router, React Native Paper, strict TypeScript, SVG components and Zustand/AsyncStorage were retained. The fixtures in src/data.ts are no longer used by the live routes. Several inherited dependency ranges remain wildcards; no cross-run reproducibility claim is made until a reviewed lockfile is committed.

## Not included / not verified

Broader issue/PR/Actions/release clients, multi-account and Enterprise support remain deferred. Durable background upload / automatic process-death resume and production signing are not included. No developer GitHub App is automatically registered and no Actions variables or secrets are created by these source changes. CI and real-device sign-in/import remain to be validated. No local verification or post-push inspection was performed.
