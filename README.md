# LifeDashboard

A private personal command center for habits, nutrition, recipes, workouts, finances, reading, goals, tasks, and calendar events. The home page produces a deterministic daily command brief: what is due, what is on the calendar, habit progress, and the best next actions. Each user can tune the ranking rule, focus count, and included sources without handing personal data to an AI service.

Signed-in users can edit their display name, username, timezone, health targets, take-home pay, and hourly rate from the profile control in the navigation rail. These values drive the relevant Dashboard, nutrition, financial, and purchase-decision views.

The browser application is static and uses Supabase for authentication and user-scoped data. It deliberately does not perform privileged account administration or store provider credentials.

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
| Local state, logging, utilities | `state.js`, `logs.js`, `utils.js`, `render.js` |
| Pure domain logic | `services/` |
| Unit tests | `test/` |
| Safe static build | `scripts/build-static.js` |
| Codebase knowledge graph | `graphify-out/graph.html`, `graphify-out/GRAPH_REPORT.md` |

See [ARCHITECTURE.md](ARCHITECTURE.md) for data flow and current constraints, [SECURITY.md](SECURITY.md) before loading personal data, and [INTEGRATIONS.md](INTEGRATIONS.md) for the Jarvis-style roadmap.

The current audit and unresolved priorities are in [REVIEW.md](REVIEW.md). [ROADMAP.md](ROADMAP.md) defines the next deliverables and platform choices. The [database inventory](database/README.md) prepares the live RLS review that is still required.

The brief now shows saved goal directions, refresh time, and warnings when a source fails. Private recipe/habit caches and diagnostic event codes are held only for the current session. Goals and other local-only records remain in browser storage until a reviewed migration is available.

The latest manual production regression record is in [QA_REPORT.md](QA_REPORT.md).

Brief preferences are stored per user in this browser. The optional morning notification contains only a generic prompt and works while LifeDashboard is open; reliable background delivery belongs in the future server-side broker.

## Current direction

The next architectural step is a small server-side connector broker for OAuth, scheduled sync, account invitations, and password administration. It should feed a minimal normalized summary into the dashboard. AI narration can be added after that boundary is in place; action-taking should always remain separately authorized and auditable.
