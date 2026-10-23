# RepoForge UI redesign status

The application has been recomposed around a mobile-first information architecture.

## Global navigation

The authenticated mobile shell now exposes five persistent destinations:

- Home
- Repositories
- Activity
- Work
- Account

Expo Router remains the route source of truth; the tab route only supplies presentation and the shell renders the mobile navigation surface.

## Repository context

Opening a repository now keeps the user inside one repository workspace with:

- Overview
- Code
- Issues
- Pull requests
- Actions
- More (releases and local alerts)

The old standalone "Repository tools" jump has been removed from the primary mobile navigation.

## Home

Home now focuses on continuity:

- unfinished / ambiguous local publication jobs
- recent repositories
- quick repository creation
- project import entry point
- local publication statistics

## Repository browser

The repository list now uses compact, touch-friendly rows with:

- large search target
- owner/visibility/sort pickers
- pull-to-refresh
- clear repository identity/status hierarchy

## Code browser

The repository workspace provides:

- branch picker
- path navigation
- directory/file browsing
- text preview
- empty repository initialization
- GitHub fallback for unsupported previews

## Import flow

ZIP import is now organized as:

1. Choose ZIP
2. Configure destination and safety options
3. Review exact changes and publish

The underlying importer, review, safety checks, unknown publication handling and local job tracking remain unchanged.

## Repository creation

Repository creation is now organized as:

1. Basics
2. Advanced
3. Review

The existing creation runner, checkpointing, uncertain-result adoption and safe default-branch handling remain in place.

## Write safety

Mutation confirmation now presents a human-readable confirmation first, with technical HTTP/payload details available under an advanced section.

## Limitations intentionally preserved

The UI does not claim capabilities that are not implemented, including native GitHub notification inbox support, durable background project publishing, or native private Actions-log downloads.
