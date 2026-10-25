# v3 ZIP Launchpad UI

Implements the recommended option 2 from the three UI proposals: indigo/teal light and dark themes, ZIP-first Home, in-session project summary, searchable destination sheet, recent destinations derived from this account's publication history, and compact filtered Uploads with details sheets.

Flow: Home → choose and validate ZIP → select/create repository → import setup → exact change review → foreground progress → result. The primary action remains visible at the bottom of setup/review. Advanced branch/folder/replacement settings are collapsed. Creation still uses its existing checkpoint runner; ZIP bytes remain in memory while navigating to creation or access management. Sign-in/access routes returning to /repositories are compatibility-redirected to Home without changing working authentication.

Progress uses friendly stage labels and measured prepared-file counts, not a fictitious overall percentage. Unknown/started history records are Needs checking, never fake running jobs. Deletion acknowledgement, live preview, final confirmation, base/SHA safety, cancellation and unknown final publication behavior are preserved. Active transfers block tab/account changes; leaving/cancelling still explains that sent requests may finish.

The project selection is account-scoped RAM only. It clears on account changes and after confirmed success; there is no claim of restoration after process death. Background uploading, staging persistence, upload limits, pacing, transport, CI, auth registration configuration and APK identity are not changed in this UI-only commit. Existing ZIP limits still apply. No collaboration features are restored.

The older repository UI module is an alias to the Launchpad, not a second browsing implementation. Tests are included for presentation helpers but not run. No build, lint, typecheck, tests, CI inspection or post-push verification is performed. Runtime rendering and Android navigation still require validation.
