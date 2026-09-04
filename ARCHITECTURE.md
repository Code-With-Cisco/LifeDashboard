# LifeDashboard architecture

## System boundary

LifeDashboard is a static browser client backed by Supabase. GitHub Pages serves the public shell; Supabase Authentication and Row Level Security are the security boundary for personal records. The anonymous/publishable key is expected to be public and grants no privilege by itself.

```text
Browser UI
  ├─ SecurityService: escaping, identifier checks, log redaction
  ├─ BriefingService: deterministic daily prioritization
  ├─ domain services: recipes, habits, nutrition
  ├─ API layer: user-scoped Supabase queries
  └─ local cache: non-authoritative offline/UI state
               |
               v
Supabase Auth + RLS-protected tables

Future providers -> server-side connector broker -> normalized Supabase records
```

Privileged administration, OAuth token exchange, scheduled provider sync, and AI calls do not belong in the public client. They require a server-side function that revalidates the signed-in user and requested capability.

## Load order

`index.html` loads Supabase, `config.js`, security and logging helpers, state/utilities/API/rendering modules, pure services, and finally `app.js`. SecurityService loads before any module that persists logs or renders user-controlled data.

## Data flow

1. Authentication establishes the user identity.
2. API queries include the current user ID; database RLS must independently enforce that scope.
3. Pure services calculate ratings, streaks, nutrition totals, and the command brief.
4. UI renderers escape stored or remote text before placing it into HTML.
5. Local storage is a cache, not an authorization boundary or source of truth.

## Daily command brief

`BriefingService` accepts normalized tasks, today's calendar events, habit counts, an optional workout, and validated focus preferences. It supports balanced, deadline-first, and priority-first ranking; users can also choose the focus count and included sources. The result remains deterministic, explainable, and testable. A future AI narrator should receive this small output rather than unrestricted database access.

Brief preferences and the last browser-reminder date are device-local UI state, namespaced by profile ID. Browser notifications use generic text rather than task or event content and only fire while the dashboard is open. Cross-device preferences and reliable background delivery require the future server-side broker.

## Current constraints

- `app.js` remains a large legacy staged module with several historical overrides. New functionality should move toward small, tested modules rather than adding another override.
- Some older API calls still live in `app.js`; migrate them into `api.js` as touched.
- The database schema and RLS policies are not yet versioned in this repository. Export reviewed migrations before treating deployments as reproducible.
- The static client cannot securely create users, reset arbitrary passwords, hold OAuth refresh tokens, or protect a shared invite code.
- Unit coverage is strongest for pure services; auth, RLS, deployment, and browser flows still need integration tests.

## Supabase data domains

The client currently references profiles, tasks, calendar events, habits, nutrition/meal logs, weight, workouts, recipes, books/reading lists, and finance records. Every table containing private data must have RLS enabled and policies tied to `auth.uid()`. See [SECURITY.md](SECURITY.md) for the release checklist.

## Graphify

`graphify-out/graph.json` is the machine-readable knowledge graph, `GRAPH_REPORT.md` is the structural report, and `graph.html` is the interactive view. Rebuild the graph after architectural changes so repository analysis stays aligned with the code.
