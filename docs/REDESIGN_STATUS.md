# Approved GitHub-web-inspired redesign — milestone 1

## Implemented in this source change

- Neutral light/dark surfaces, blue links, green primary actions, thin borders and compact shared panels/headings. Existing screens inherit the baseline tokens without being represented as fully redesigned.
- Global app header, account menu, compact navigation drawer on phones and sidebar on wide screens. Bottom tabs are hidden while their existing routes remain mounted by the tab navigator to retain screen state.
- Repositories are the default signed-in destination. Protected routes separate signed-out, callback, repository and signed-in screens using Expo Router's pre-SDK-58 default protected-route behavior; no SDK-58-only redirectTo API is used.
- Dedicated sign-in screen with one primary action and concise connecting states. Developer configuration and error diagnostics appear only when relevant, with expandable details.
- Automatic access discovery after sign-in; existing repository access skips the selection page. Missing access opens a focused GitHub selection page, checks on browser return and provides retry without a permanent multi-card onboarding dashboard. GitHub installation/organization approval cannot be bypassed.
- Settings separated from onboarding: current identity, appearance, manage access, sign-out and local-history cleanup. The extractable app-secret threat model is retained in optional privacy details and documentation, not as a permanent alert banner.
- Compact repository rows, owner/visibility/sort pickers, search across the progressively loaded installation index, pull-to-refresh, empty/error states, and a header search shortcut. The index follows paginated installations and repositories; a disclosed 5,000-repository app cap prevents an unbounded mobile index. This is not global GitHub search. Index caching is in memory for this session, not durable offline storage.
- A dedicated basic repository creation page preserves and modestly extends the previous personal-repository creation capability: name, description, homepage, public/private and README. This is NOT the full approved creation-form milestone.
- A repository-created result is distinct from a failed/unconfirmed request; no automatic repeat of creation after network ambiguity.

## Remaining approved work

1. Repository-local Code / Issues / Pull requests / Actions / More navigation, branch/path state, file table, proper file and Markdown viewers. Existing repository detail and Work screens are still the prior implementation.
2. Full repository creation: organization owner selection, templates, gitignore/license pickers, supported feature flags, merge options/defaults, conditional organization options and post-creation settings. No claim that all writable GitHub options are present yet.
3. Bulk import engine using measured request budgets, batched eligible text entries and appropriate binary handling; adaptive rate scheduling, immutable staging and checkpoints. Current importer still sends blobs individually.
4. Numeric stage-based upload sheet and persistent upload center; native Android background transfer/scheduling and restart reconciliation. Current uploader remains foreground-only; no minimized UI is misrepresented as a worker.
5. Collaboration redesign: issue/PR timelines, Write/Preview editors, searchable metadata pickers, diff viewer, review drafts, structured workflow inputs and release forms. Existing JSON-confirmation dialogs and dense forms remain until this stage replaces them.
6. Notification preference entry point, consistent snackbar feedback, diagnostics, accessibility, keyboard/scroll behavior and draft preservation across the remaining screens. Current local alerts and browser inbox behavior are unchanged.
7. Persistent/cached offline repository behavior and stronger session-restoration UX under network failure remain to be refined; this change does not alter token-exchange security or pretend offline identity verification succeeded.

## Boundaries

No backend, multi-account profile switching, Enterprise host support, production-signing automation or formal security audit is added. Safe credential storage, PKCE, scoped access and confirmation of destructive operations remain. No registration values, secret values or CI secret mappings are changed.

## Validation / completion reporting

This is implementation code, not a claim of successful execution. No dependency installation, typecheck, lint, tests, device run, CI inspection or post-push verification was performed. CI and actual first-run Android testing remain required. After a successful connector push, report the commit and separate the completed milestone from the remaining items above.
