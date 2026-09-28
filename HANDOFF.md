# Workstation handoff — September 28, 2026

## Read this first

The owner wants **all existing Dashboard sections prioritized equally** and ready for daily use. A separately supplied private conversation also motivates reliable fitness logging and calendar import. Do not copy that conversation, its images, personal targets, or exported calendar into this public repository.

Work began on a clean `main` at `0b27f19` (September 26 planning release). The changes below are local and uncommitted. **No commit, push, deployment, production data mutation, or schema migration is authorized by the current conversation.** Repository agreements require explicit authorization to commit/push. Check `git status` and preserve any later work before continuing.

## Work completed locally

- Added `data-operations.js`: session-bound write orchestration, duplicate-click protection, stable retry IDs, in-memory confirmation of multi-step saves, generic error messages, and cancellation after session changes.
- Added scoped, confirmed `API.records` writes. Inserts recover a lost response only if the same owner/ID/payload is already saved; a changed record is not overwritten. This is client behavior, not proof of database isolation.
- Repaired active weight, meal, finance, reading, recipe, calendar-event, and workout-plan write paths. Forms stay open on failure. Custom meals/books resume their confirmed first step on unchanged retries; these remain multiple transactions, not atomic database operations.
- Nutrition totals use profile calorie/protein targets and still render without a template meal catalog. Empty reading shelves replace stale state and clear the current-book card. Failed reads in nutrition, financial totals/lists/calendar, reading, habits, and Schedule are visible instead of being shown as zero or empty results.
- Habit completion waits for the save before changing the checked state. Finance edits and deletes scope the current owner and confirm a returned row. Take-home pay accepts zero. The financial calendar displays due days beyond month-end on the last day of that month.
- Replaced the immediate ICS writer/parser with `services/CalendarImportService.js` and `calendar-import.js`: bounded file/event sizes, explicit-event preview, timezone conversion, date/end-time validation, all-day exclusive-end conversion, duplicate/conflict detection, deterministic per-owner import IDs, batches of 100, partial-failure feedback, and session cancellation.
- Calendar import explicitly rejects recurrence, recurrence exceptions, duration-only events, cancellation files, and ambiguous/nonexistent DST wall times. Import does **not** save descriptions, locations, attendees, attachments, or reminders. Files containing additional details require an explicit titles/times-only acknowledgment. Preserve the original calendar for those details. Do not describe this as a complete calendar sync or complete fitness-plan import.
- Empty recipes have an add-first-recipe action; failed recipe loads offer retry. Empty goals have an add action, and an unconfigured financial roadmap links to Goals. Financial lists stack below 768px.
- Removed the duplicate unchecked profile timezone writer. Automatic timezone detection now waits for confirmation and cannot affect a later session. Dashboard async rendering stops after sign-out.
- Build allowlist includes the three new runtime modules only. Tests, internal docs, Graphify, and private data remain excluded.

## Verification checkpoint

Latest full run at this checkpoint: **236 tests passed across 18 suites**, including the existing isolated PGlite SQL suites. The 30-file allowlisted build passed using synthetic public config. `npm ci --ignore-scripts` restored missing workstation dependencies from the lockfile and reported zero vulnerabilities.

The sandbox initially blocked Node subprocesses (`EPERM`), then a permitted rerun exposed missing PGlite. Restoring the exact locked dependencies resolved those environment failures. Run full tests with subprocess permissions where needed; do not weaken or skip the SQL tests.

Browser smoke checks opened all twelve navigation sections, Profile, and Data & backups; synthetic meal and recipe saves updated the UI. Workout day navigation and empty recipe/shelf/goal states were checked. A 390px viewport exposed clipped financial lists; they now stack, with all three card bounds inside the viewport. Mobile navigation and the Goals layout were also checked. This is bounded smoke coverage, not complete acceptance. The previous production verification recorded in `REVIEW.md` remains historical; no live verification of this new release has been performed.

## Remaining acceptance work

1. Extend the completed section smoke checks into end-to-end acceptance with a persistent test backend: populated records, create/edit/delete, rejected writes, retry, account switching, session expiry, reload persistence, and full mobile coverage. The local synthetic browser checks do not establish real Auth/RLS behavior.
2. Review the new code and add missing behavior coverage where a concrete failure is found. Older staged implementations still exist; modify active paths and remove obsolete wrappers when safe. Avoid adding another override.
3. Audit remaining async renderers and legacy milestone/roadmap status writes for session changes, ignored database errors, and stale responses. Dashboard monthly milestones still contain fixed legacy weight targets rather than user-configured goals; review this before calling the dashboard personalized. Nutrition retains preset meal references. Recipe cache fallback is session-scoped but lacks an explicit stale badge. Workout session saving, planning, personal documents, and MFA already have earlier bounded coverage; retain it.
4. Verify new client writes against the real schema and permissions using a separate test project or an owner-approved disposable-account procedure. The committed SQL fixtures intentionally do not represent every live domain constraint. Do not infer production compatibility solely from mock tests.
5. Resolve full calendar details/recurrence support using the **real schema** before proposing a migration. The current app has only a titles/times editor, so the private fitness calendar cannot yet become a complete in-app instruction plan.
6. External calendar/mail/health/task connectors, privileged invitations/password administration, background notifications, independent off-device recovery, and a separate test project remain the documented roadmap gaps. Do not imply they are connected.
7. When the concrete release is verified, get explicit commit/push authorization. Use the owner's configured Git identity, no assistant attribution. Verify Tests, CodeQL and Pages for the exact release, then update the handoff.

## Resume commands

```powershell
git status --short --branch
git diff --stat
npm ci --ignore-scripts
npm test -- --runInBand
npm audit --audit-level=high
# Set the actual public SUPABASE_URL and SUPABASE_KEY for a release build.
# Synthetic values validate packaging only; they cannot sign into production.
npm run build
```

## Graphify status

The official Graphify package (`graphifyy` 0.9.71) and Codex skill were obtained in an isolated temporary runtime. `graphify update .` rebuilt the code graph, report, HTML view, and manifest from the current working tree on base `0b27f191`. This is a **code graph refresh**; existing semantic/document annotations were retained and may predate this work. The optional SQL parser is absent, so SQL extraction was skipped. No API key or LLM backend was used.

Read `graphify-out/memory/query_20260928_daily_use_readiness.md` for current module pointers. On another machine use its installed Graphify runtime, run an incremental update after changes, and verify source. Do not copy this machine's temporary interpreter path or assume commit equality means the local graph matches uncommitted edits. The final graph count and diagnostic are recorded in that memory.

## Carrying this checkpoint home

An ignored `handoff-local/LifeDashboard-office-2026-09-28.zip` contains only selected changed source/docs/Graphify files, a tracked-file patch, hashes, and transfer instructions. It excludes configuration, secrets, dependencies, build output, personal records, and the synthetic preview server. It is a local transfer package, not a commit or deployment. Copy the ZIP to the home workstation; OneDrive synchronization has not been verified. Read its transfer instructions and inspect the home worktree before applying anything. Never overwrite newer or uncommitted home work blindly.

Start the next session with: **Read AGENTS.md, HANDOFF.md, REVIEW.md, and graphify-out/memory/query_20260928_daily_use_readiness.md. Review the working tree and continue the all-section readiness checklist. Do not commit/push without authorization.**

## Private local preview

A temporary loopback-only server in the Windows temp directory serves `dist` with a synthetic Supabase substitute. It contains only invented account/data fixtures and does not connect to production. It is a browser smoke test, not a shipped runtime or a persistent backend. It may not exist on the next workstation. Do not add it or generated test artifacts to the public static build.
