# RepoForge — UI milestone

## Scope

Interactive Android-first UI: dashboard, demo repository search/filter, repository sample file browser, four-stage archive import preview, local preview history, and persisted system/light/dark theme. Live GitHub publishing is intentionally disabled. No sign-in, ZIP selection, extraction, upload, repository creation, or real diff is implemented. The archive manifest and repository workspace are bundled examples, explicitly labeled in the UI.

The existing root README is left unchanged.

## Reference stack reconstructed from commit history

Reference: tnhmar/CitizenshipExam, main history at 20e0b2c021f79e977f6325e1ecfe0b12cb1b0483. Configuration was read from commit patches, not file downloads.

- 0e534f561f834fcf67f85fcb5b1772065cfe01ac: original Expo scaffold, dependencies, Babel, strict TypeScript, EAS configuration.
- 33944526c7cd14e813718c11fa299546fd0111f9 and 796d83bf8af7920a66a9cbb05cba37f22d2852b0: React Native Jest preset addition and SDK-aligned preset ranges.
- d4e6e6e51ad6a509b1c6aeb6d23e9c859d995482: notification dependency change; the later package patch includes ~56.0.16.
- 831c0af4e0e165c8a0c9dc3b32225be74f80b31f: datetimepicker 9.1.0.
- c7e483160362001a1acbf4edfae241edf1522c69: slider 4.5.6 and expo-haptics.

Core specifications: Expo ~56.0.0, Expo Router ~56.2.3, React ~19.2.0, React Native 0.85.3, Paper ^5.14.0, Zustand ^5.0.0, TypeScript ~5.9.2, i18next ^25.5.0. The reference uses wildcard ranges for several packages. Those specifications are preserved, but exact resolved dependency equality is NOT established: no lockfile was reconstructed and no install was run.

Intentional adaptations: RepoForge application identity and emerald/amber branding; content/audio generation removed; no study-specific notification plugin or exact-alarm permissions; assets generated from the RepoForge SVG; no automatic CI or release publication. Unused reference dependencies remain in package.json to preserve its version specifications.

## Development

Use Node 22, matching the reference scaffold's CI runtime.

```sh
npm install
npm start
# Native Android development, with Android SDK configured:
npm run android
```

Installation generates PNG icon and splash assets with sharp. Do not add OAuth client secrets or signing keys to the repository. EAS profiles mirror the reference profile structure with RepoForge-specific app identifiers.

## Validation status

Code has not been installed, typechecked, linted, tested, built, or run on a device in this environment. Test cases are included but not executed. No automatic workflow is included, per the request not to run verification before or after pushing. A successful commit is not evidence of a successful Android build.

## Import-preview boundary

The pure planner checks sample manifest paths, traversal, .git metadata, size metadata, case collisions, file/directory collisions, optional enclosing-folder removal, destination paths, and visible sensitive-file exclusion. It is NOT a secure archive extractor or a complete secret scanner. Its 10,000-entry and 250 MiB limits are local preview policy, not GitHub limits.

Add/update and replace are proposed behaviors only. No actual change classification or deletion list can be computed until a live destination tree is loaded. Replacement requires an acknowledgement in the UI. Local history saves metadata and paths only, never file bytes.

## Next implementation milestone

1. Approve GitHub App registration, device/browser flow, backend constraints, and least-privilege permissions.
2. Add platform-compatible native document selection and archive reading, preserving this reference SDK line.
3. Validate archive entries before writing; enforce streaming extraction limits, ZIP-bomb defenses, duplicate-entry checks, and explicit symlink/executable handling.
4. Load repository metadata and destination tree; calculate a real diff and permission failures.
5. Implement initial-repository setup, blob/tree/commit publication, non-force branch updates, conflicts, throttling, and job recovery.
6. Enable publishing only after the live authentication and import services are integrated.
