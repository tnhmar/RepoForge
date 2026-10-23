# Remaining work — exactly three parts

The web-style shell, repository index and simplified first-run screens were already committed in c41a55c00a5bc31aa65e83109327dc456a7d5d3b. Those changes are retained. The earlier unpushed milestone-2A proposal is replaced, not counted as completed.

## Part 1 — repository creation

Fresh implementation in src/creation, routed through the existing NewRepositoryScreen entry point. Supports personal and installed-organization owners, descriptions/homepages, public/private, README/gitignore/license, verified template generation/all branches, default-preserving feature flags, merge modes and commit defaults, topics, default-branch setup, discussions, forking/sign-off, and permission-dependent organization teams and schema-driven custom properties. Pickers are searchable; multi-select properties use structured checkboxes. Deprecated duplicate squash-title controls and unsupported Enterprise-host visibility are not added.

Personal, organization and template APIs have separate payloads. Template creation does not receive unsupported initialization fields. Post-creation settings use separate operations. Organization custom-property updates use the organization values endpoint, not external-installation-property APIs. Team discovery is capped at 1,000 with a visible disclosure. Custom-property definitions are read, not modified.

A local checkpoint distinguishes rejected/unknown initial creation from unfinished settings on a created repository. No unknown creation is automatically repeated. The user can explicitly adopt the matching expected repository and resume remaining settings. Branch setup never force-updates or deletes an existing ref. Sign-out stops subsequent work. Checkpoints contain metadata, not credentials. This recovery concerns repository SETUP, not project uploads.

Status: source prepared in this Part 1 commit; build, API behavior and device operation unverified.

## Part 2 — navigation and screen redesign

Remaining: repository-local Code/Issues/Pull requests/Actions/More tabs; branch/path/scroll state; file table and file/Markdown viewer; issue/PR timelines, structured metadata selectors and Write/Preview; proper review/diff UX; structured Actions dispatch inputs; release editor/assets handling; consistent feedback, accessibility and offline/session UX. Existing implementations remain available until replaced.

## Part 3 — project transfers

Remaining: request-size-aware bulk text/binary publication, adaptive throttling, immutable persistent staging and checkpoints, numeric stage-based progress sheet, upload center, native Android user-initiated/foreground transfer scheduling as appropriate, single credential/refresh authority, cancellation and network/auth states, reconciliation after ambiguous publication, OS-permitted restart recovery and native completion alerts. Create-and-import-ZIP integration is completed with this transfer flow.

Current uploader is still foreground-only, still uploads blobs individually and does not become durable merely because this creation workflow has checkpoints. No force-stop/uninstall execution guarantee is promised.

## Boundaries and reporting

No backend, multi-account profiles, Enterprise hosts, production-signing automation or formal audit. Ordinary safe coding remains required. Secret configuration is unchanged. Advanced repository management can require additional GitHub App permissions and organization approval.

No install, typecheck, lint, tests, device execution, CI inspection or post-push verification was performed. Tests are provided, not reported as passing. After each actual push, report its commit, completed scope, remaining two/one parts and unverified behavior. A prepared payload awaiting approval is not a pushed commit.
