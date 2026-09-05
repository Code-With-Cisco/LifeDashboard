# LifeDashboard architecture

## System boundary

LifeDashboard is a static browser client backed by Supabase. GitHub Pages serves the public shell; Supabase Authentication and Row Level Security are the security boundary for personal records. The anonymous/publishable key is expected to be public and grants no privilege by itself.

```text
Browser UI
  ├─ SecurityService: escaping, identifier checks, log redaction
  ├─ ProfileService: profile validation and safe update payloads
  ├─ WorkoutService: weekday-aware plan selection and normalization
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

`index.html` loads Supabase, `config.js`, security and profile/workout helpers, logging helpers, state/utilities/API/rendering modules, the remaining pure services, and finally `app.js`. SecurityService loads before any module that persists logs or renders user-controlled data.

## Data flow

1. Authentication establishes the user identity.
2. API queries include the current user ID; database RLS must independently enforce that scope.
3. Pure services calculate ratings, streaks, nutrition totals, and the command brief.
4. UI renderers escape stored or remote text before placing it into HTML.
5. Private recipe/habit caches are per-user session memory. Local storage still holds authoritative local-only goals, custom definitions, and purchase decisions; those require an explicit database migration with data preservation.

Profile updates are made from a signed-in, user-scoped editor. The browser validates presentation and range rules, while Supabase RLS remains the authority that prevents one user from updating another profile.

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

The September 4 review changed authentication, caching, rendering, and briefing behavior. The existing graph is an orientation aid and is not a current line-level index; verify against source until it is rebuilt.

`graphify-out/graph.json` is the machine-readable knowledge graph, `GRAPH_REPORT.md` is the structural report, and `graph.html` is the interactive view. Rebuild the graph after architectural changes so repository analysis stays aligned with the code.
