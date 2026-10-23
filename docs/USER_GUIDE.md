# RepoForge — user sign-in and repository access

You need a GitHub account and internet access. You do not need a server, developer account, client secret, personal access token or terminal commands.

1. Install a configured standalone RepoForge Android APK. Expo Go is not the sign-in target.
2. Open Settings / Account & access and tap Sign in with GitHub.
3. Your browser opens GitHub. Check that you are on GitHub, sign in, complete 2FA if requested, and authorize RepoForge. The app never asks for your GitHub password.
4. GitHub returns you to Android. RepoForge verifies the response and shows your signed-in account.
5. If repository access is missing, tap Choose / manage repositories on GitHub. Install RepoForge on your personal account or an organization and select the repositories you want it to access. You can choose only selected repositories.
6. Return to RepoForge. Access is checked on return; you can also tap I finished — refresh access. Organization approval or SSO may be needed.
7. Open my repositories. Select a repository and base branch, choose a real ZIP, review changes and exclusions, then approve publication to a new branch. Replacement mode needs approval of every deletion shown.

## You should never be asked to

- Register your own GitHub App.
- Configure a server or paste a client secret.
- Generate a token just to sign in.
- Give RepoForge permissions you do not understand.

## Troubleshooting

- APK missing registration values: this is a developer build-configuration issue, not something to fix by entering credentials.
- No repositories: install the app on the correct account, select repositories, complete organization approval / SSO and refresh.
- Repository visible but upload denied: your user account and the app both need write access; repository rules still apply.
- Session expired or interrupted: tap Sign in again. Normal token refresh happens automatically; failed/ambiguous refresh requires fresh authorization.
- Browser was interrupted or Android killed the process: start a new sign-in; do not copy callback codes manually.
- Sign out removes credentials from this device. To withdraw all user authorization, use GitHub Settings → Applications → Authorized GitHub Apps → RepoForge → Revoke. Repository installation access is managed separately on GitHub.
- Explicit token revocation in RepoForge only confirms revocation when GitHub returns success. If it is unconfirmed, use GitHub settings.

The importer remains foreground-only. Keep Android open during publication. Following a process restart, reselect the ZIP and rebuild the preview. If the result is UNKNOWN, check the linked GitHub branch before retrying.
