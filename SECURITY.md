# Security

LifeDashboard contains personal health, schedule, finance, reading, and goal data. Treat every deployment as a private-data application even when its static shell is hosted publicly.

## Security model

- The browser receives only a Supabase publishable/anonymous key. A `service_role` key must never appear in this repository, GitHub Pages, browser storage, or client logs.
- The browser hides self-signup and disables administrative user creation. Supabase public signup is now disabled, email confirmation enabled, and email changes require confirmation at both addresses, following the owner's September 5 approval. Administrative invitations/reset requirements need reviewed server operations. Users change their own password through Supabase Auth.
- All tables containing user data must enforce Row Level Security (RLS), with policies that scope rows to `auth.uid()`. Admin operations must also verify a server-side role or explicit allowlist.
- The deployment workflow uploads an explicit allowlist from `dist/`; repository internals and local tooling are not published.
- Logger keeps only event codes in session memory and omits payloads, raw errors, and stack traces. Old persisted diagnostics and shared derived caches are removed. Remaining direct console calls in legacy code still require cleanup.
- Recipe and habit fallback caches are isolated per user in memory and cleared on sign-out. Local-only goals, custom definitions, and purchase decisions still persist on this device; sign-out preserves those records to prevent data loss.
- The build rejects privileged/unknown keys and serves a lockfile-pinned Supabase SDK. Production CSP connections are restricted to the configured Supabase origin. Inline handlers still require `unsafe-inline`, so output escaping remains essential.
- Browser reminders are opt-in and contain a generic prompt, not task titles, calendar details, health data, or financial data.

## Required Supabase checks

Before using real personal data:

1. Enable **Leaked password protection** when the chosen plan supports it; the inspected Free-plan control is unavailable. Record this limitation until addressed.
2. Keep email confirmation and a strong minimum password policy enabled.
3. Run the Security Advisor and resolve every error or warning.
4. Confirm RLS is enabled for every table and test each policy as two different non-admin users. All 25 public tables had RLS enabled, but permissive policies still exposed data. Review grants, protected columns, RPCs, and ownership chains together.
5. Restrict Site URL and redirect URLs to the production origin and trusted local development origins.
6. Put integrations and privileged operations behind Edge Functions or another server-side broker. Store provider refresh tokens only in encrypted server-side storage.

These are requirements, not a claim that the live database satisfies all of them. Profile migration 001 is applied and verified with live database role tests and an anonymous Data API denial check. Migrations 002–004 remain unapplied. The Free plan also provides no project backups; establish private backup and restore procedures. See [REVIEW.md](REVIEW.md) and [database/README.md](database/README.md) for evidence, remaining checks, and the deployment order.

## Repository and GitHub checks

- Keep CodeQL and Dependabot workflows passing.
- Enable Dependabot alerts, secret scanning, push protection, and private vulnerability reporting in repository settings where available.
- Protect `main`: require the test and CodeQL checks, disallow force pushes after the contributor-history cleanup, and require review for workflow changes.
- Rotate any credential immediately if it appears in Git history, logs, screenshots, or an issue.

## Reporting a vulnerability

Do not open a public issue containing personal data, credentials, or exploit details. Use GitHub private vulnerability reporting after it is enabled, or contact the repository owner privately.
