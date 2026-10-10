# LifeDashboard

**Current release:** [October 10 readiness](RELEASE_READINESS.md) is ready for owner testing. Start with [TESTING.md](TESTING.md). Verification passed 336 tests across 28 suites, real database/API/MFA checks and the 36-file build. Recurring ICS snapshots and calendar instructions are supported; live provider connections remain disabled until private setup and acceptance. Encrypted off-device recovery awaits the specifically prompted upload approval. Earlier checkpoints below are historical.

**September 28 office checkpoint:** local, unpublished reliability changes are documented in [HANDOFF.md](HANDOFF.md). Read it before continuing on another workstation; the production verification below applies to earlier releases.

A private personal command center for habits, nutrition, recipes, workouts, finances, reading, goals, tasks, and calendar events. The home page produces a deterministic daily command brief: what is due, what is on the calendar, habit progress, and the best next actions. Each user can tune the ranking rule, focus count, and included sources without handing personal data to an AI service.

After sign-in and any required account-security checks, users go directly to the dashboard. There is no introductory questionnaire. Existing profile values and assigned plans are preserved.

Signed-in users can edit their display name, username, timezone, health targets, take-home pay, and hourly rate from the profile control in the navigation rail. These values drive the relevant Dashboard, nutrition, financial, and purchase-decision views.

Tasks can link to a saved goal, carry a 5–1440 minute estimate, and name a concrete next action. Set weekly **Focus windows** from Schedule or the daily brief. The brief subtracts calendar commitments and elapsed time, suggests tasks that fit an uninterrupted window, and keeps oversized or unestimated tasks visible for review. Suggestions never create calendar events. Calendar events now support optional end times; unknown durations block time conservatively. Fixed workout/walk/meal-prep calendar entries have been replaced by chosen focus windows.

Migration **008 is applied in production**. Its rollback and committed transactions preserved existing records; live API checks verified planning writes, ownership and MFA enforcement. See the [planning rollout](database/README.md#task-planning-008).

The browser application is static and uses Supabase for authentication and user-scoped data. It deliberately does not perform privileged account administration or store provider credentials.

Authenticator setup is available under **Profile → Account security**. Enroll an authenticator, verify its six-digit code, and keep a backup authenticator or setup key securely. Password-only sign-ins for enrolled accounts stop at the second-factor screen. This client requires migration 007 before deployment; see the [MFA rollout and recovery procedure](database/README.md#authenticator-mfa-007).

## Local setup

1. Install dependencies with `npm ci`.
   Run `npm run setup` to copy the locked Supabase browser SDK into the ignored `vendor/` directory.
2. Copy `config.example.js` to the ignored `config.js`.
3. Add your Supabase project URL and publishable/anonymous key. Never use a `service_role` key.
4. Serve the repository with a local HTTP server and open it in a browser.

```bash
npm ci
npm run setup
python -m http.server 8000
```

The self-signup UI is disabled by default; disable signup in Supabase Auth as well to enforce invitation-only access. Provision users through a trusted server-side admin path, then use the sign-in screen.

## Verification and deployment

```bash
npm test -- --runInBand
npm audit --audit-level=high

# Production build requires the public Supabase browser values.
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_KEY=your-publishable-key npm run build
```

The build creates `dist/` from an explicit public-file allowlist. GitHub Pages deploys only that directory. Repository tools, tests, documentation, and local files are not published.

## Project map

| Area | Files |
|---|---|
| Application shell and UI behavior | `index.html`, `styles.css`, `app.js` |
| Supabase access and orchestration | `api.js`, `main.js` |
| Confirmed writes and calendar import | `data-operations.js`, `calendar-import.js`, `services/CalendarImportService.js` |
| Local state, logging, utilities | `state.js`, `logs.js`, `utils.js`, `render.js` |
| Pure domain logic | `services/` |
| Unit tests | `test/` |
| Safe static build | `scripts/build-static.js` |
| Codebase knowledge graph | `graphify-out/graph.html`, `graphify-out/GRAPH_REPORT.md` |

See [ARCHITECTURE.md](ARCHITECTURE.md) for data flow and current constraints, [SECURITY.md](SECURITY.md) for the security model, and [ROADMAP.md](ROADMAP.md) for the current Jarvis platform choices. [INTEGRATIONS.md](INTEGRATIONS.md) retains earlier integration notes.

The current implementation and verification are in [RELEASE_READINESS.md](RELEASE_READINESS.md). Migrations 001–010 are present in production and Test. The [database runbook](database/README.md) records reproducible checks, private recovery scope and provider activation gates.

The brief shows saved goal directions, refresh time, and warnings when a source fails. Private recipe/habit caches and diagnostic event codes are held only for the current session. Use **Data & backups → Preview device migration** to move supported browser records into protected account storage. Review values and explicitly select replacements; original device records are preserved.

The September 8 live database and browser checks are recorded in [REVIEW.md](REVIEW.md). [QA_REPORT.md](QA_REPORT.md) retains the earlier regression record.

Brief preferences are stored per user in this browser. The optional morning notification contains only a generic prompt and works while LifeDashboard is open; reliable background delivery belongs in the future server-side broker.

## Current direction

The October 10 readiness work protects overlapping section loads, confirms writes and repairs calendar/roadmap behavior. Latest verification passed 336 tests in 28 suites, the 36-file build and a full dependency audit with zero vulnerabilities. Real Test API checks covered 14 relational domains, ownership isolation, rejection/retry, MFA and encrypted personal-record restore. Disposable account cleanup was independently verified. Use [TESTING.md](TESTING.md) for hands-on acceptance; connectors remain disabled by default.

All existing sections receive equal readiness priority: confirmed saves, recoverable drafts, session isolation, visible read failures, usable empty states, and mobile access. Calendar files are previewed before import, with duplicate/conflict checks and timezone conversion. Supported recurrence expands into snapshots within a bounded date window; descriptions, locations and inert source details are retained. It does not synchronize with the source calendar.

The private OAuth/sync broker and optional narration are setup-ready. Live activation requires private provider credentials and the checks in [CONNECTOR_SETUP.md](database/CONNECTOR_SETUP.md). Invitations, privileged password administration and broader roadmap features remain deferred; action-taking requires separate authorization and audit.
