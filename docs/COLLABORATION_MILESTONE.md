# Collaboration milestone — first implementation stage

## Scope in this commit

A Work tab and repository toolbar open real GitHub tools for one active GitHub.com account. No backend, multi-account profiles or Enterprise host support is added.

- Issues: paginated open/closed/all lists (PR entries filtered out), create/edit/close/reopen, conversation pagination, create/edit/delete own comments, replace labels and assignees with explicit review.
- Pull requests: paginated lists, draft creation, edit/close/reopen, conversation, reviewer requests, paginated changed-file patches, line-based local review comments, pending reviews and submission/deletion, approve/request changes, merge method selection and head-SHA-bound merge, expected-head branch update. GitHub enforces permissions, branch rules and self-review restrictions. Full pending inline-comment editing, draft-to-ready transitions, team review requests, merge queues and auto-merge are not in this first stage.
- Actions: paginated workflows/runs/jobs/artifacts; job steps and results; workflow_dispatch with JSON inputs, enable/disable, rerun all/failed jobs/individual job, cancellation. Raw log and artifact downloads open GitHub in the browser; the app never forwards bearer tokens to redirected download hosts. Native authenticated download/log rendering is not claimed.
- Releases: pagination, notes and asset display, create/edit drafts, publish/prerelease flags and deletion review; immutable releases are protected in the UI. Asset download opens the browser. Asset upload and native private-asset download are not implemented in this stage.
- Notifications: browser link to the real GitHub inbox because its REST endpoints reject GitHub App user tokens. Optional LOCAL upload-result notifications are based on live in-process job-state transitions, with Android permission handling. There is no remote push server, PAT fallback, background inbox polling or complete notification-inbox API integration. The first alert implementation does not replay old jobs on storage hydration, expose repository names in notification content, or claim to execute after process death.

Mutating operations show the exact method, target and JSON payload for confirmation. Writes remain paced by the shared API client. PR review preflight rejects a changed head; merge submits the reviewed SHA to GitHub. Ambiguous writes are not automatically retried. The API client now handles successful empty response bodies, including Actions endpoints, instead of treating them as malformed JSON.

## Permissions to approve

GitHub App repository permissions: Issues write, Pull requests write, Actions WRITE for controls, Contents write for merges/releases. Checks and Commit statuses read support future status expansion; the first UI shows Actions job/step results. Workflows write is distinct and remains needed for importing workflow-file changes. Update the app registration and approve changes on its installations; selecting a permission in registration alone does not approve existing installations. No organization Administration is requested.

## Next stage: durable Android uploads — NOT implemented by this commit

The existing importer is still foreground-only. Durable uploads require a native Android scheduling/transfer implementation, not keeping a JS promise or view mounted. Plan:

1. Copy approved project bytes to private persistent staging; atomically persist an immutable reviewed manifest, user/repository identity, base SHA, target branch, content hashes and job state.
2. Use a single credential authority for JS and native execution so rotating refresh tokens cannot be spent concurrently. Never write token values into WorkManager input data or plain job manifests. Pause for explicit reauthorization when necessary.
3. Add an Expo-compatible local Android module with persisted, unique WorkManager jobs and the foreground data-sync service/notification configuration required by the target Android version. Preserve Expo SDK 56 and generate native configuration through supported module/plugin integration.
4. Checkpoint successful blob/tree/commit objects. Resume idempotent object work after interruptions. Before final publication, reconcile the target ref against the recorded commit SHA; distinguish the exact previous result from a conflicting branch. Do not blindly repeat a possibly successful branch write.
5. Persist cancellation, waiting-network, waiting-auth, needs-new-preview, publishing/unknown and terminal states. Clean staging after terminal retention policy. Stop old-account jobs on sign-out; do not resume under another identity.
6. Support OS-permitted restart/reboot recovery. Do not promise execution during a user force-stop, after uninstall, or outside Android scheduling/service quotas. Android 16 can impose quotas on long-running workers.
7. Add native interruption/reboot/network-loss/rotation/ambiguous-publication tests and connect the real worker to the import UI. Local worker completion notifications must originate from native execution when JS is absent.

There is deliberately no fake worker or success stub in this commit. Background work is an outstanding part of the accepted scope.

## Deferred / excluded as requested

- Multiple active GitHub profiles and Enterprise host support are excluded.
- Production signing/key-management automation and a formal public-release security audit are deferred, not silently enabled. Every installable APK is already signed; production signing means controlling a stable private signing key for trustworthy updates. It is unrelated to the GitHub App private key and does not require a backend. Existing CI APKs remain test builds.
- Safe coding is not deferred: review payloads, token handling, upload safeguards and permission checks remain necessary. This source generation is not a security audit.

## Validation status

Source was prepared using repository commit history and official GitHub/Android/Expo documentation. No dependency install, typecheck, lint, tests, device run, CI inspection or post-push verification was performed. CI and real-device validation remain required.
