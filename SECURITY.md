# Security

LifeDashboard contains personal health, schedule, finance, reading, and goal data. Treat every deployment as a private-data application even when its static shell is hosted publicly.

## Security model

- The browser receives only a Supabase publishable/anonymous key. A `service_role` key must never appear in this repository, GitHub Pages, browser storage, or client logs.
- Self-signup and browser-side administrative user creation are disabled. Account invitations and password resets require a separately deployed, authenticated server-side function.
- All tables containing user data must enforce Row Level Security (RLS), with policies that scope rows to `auth.uid()`. Admin operations must also verify a server-side role or explicit allowlist.
- The deployment workflow uploads an explicit allowlist from `dist/`; repository internals and local tooling are not published.
- Persisted application logs are redacted and omit stack traces. Do not log personal records, session objects, credentials, or authorization headers.

## Required Supabase checks

Before using real personal data:

1. Enable **Leaked password protection** in Authentication settings.
2. Keep email confirmation and a strong minimum password policy enabled.
3. Run the Security Advisor and resolve every error or warning.
4. Confirm RLS is enabled for every table and test each policy as two different non-admin users.
5. Restrict Site URL and redirect URLs to the production origin and trusted local development origins.
6. Put integrations and privileged operations behind Edge Functions or another server-side broker. Store provider refresh tokens only in encrypted server-side storage.

## Repository and GitHub checks

- Keep CodeQL and Dependabot workflows passing.
- Enable Dependabot alerts, secret scanning, push protection, and private vulnerability reporting in repository settings where available.
- Protect `main`: require the test and CodeQL checks, disallow force pushes after the contributor-history cleanup, and require review for workflow changes.
- Rotate any credential immediately if it appears in Git history, logs, screenshots, or an issue.

## Reporting a vulnerability

Do not open a public issue containing personal data, credentials, or exploit details. Use GitHub private vulnerability reporting after it is enabled, or contact the repository owner privately.
