# Workstation handoff — September 28, 2026

## Continuation checkpoint — October 10, 2026

Finance lists, billing calendar, roadmap reads and summary totals now use `SectionReadService` to reject superseded/account-changed responses. Failed or malformed summary queries mark amounts, counts and progress unavailable instead of inventing zero records; successful empty reads clear stale debt progress. `renderFinancial` starts independent reads together, so an older sequential refresh cannot initiate new reads after a newer refresh. The obsolete Finance renderer wrappers and two obsolete totals implementations were removed. The debt list no longer overwrites summary progress using a fixed $800 baseline. Existing saved baseline data and unrelated work remain intact; roadmap writes still need real-schema review.

Validation: **307 tests across 24 suites passed**, including local PGlite suites and new read-order/account-switch/failure-recovery regressions. The allowlisted 34-file build passed with synthetic public configuration and connectors disabled; syntax and diff whitespace checks passed. No new live Auth/API/browser acceptance was performed. Nothing was staged, committed, pushed, deployed or changed in a database during this session.

Next: verify the separate test project's Auth/API health and settings, prepare private disposable login fixtures, and complete persistent browser acceptance across all sections. The October 1 live SQL results below remain historical. Full ICS details/recurrence, safe roadmap status writes, off-device recovery and live connector activation remain pending. The structural Graphify map still predates current source changes.

## Continuation checkpoint — October 1, 2026

LifeDashboard-Test is further along than the September 28 project-creation note below. Live read-only checks confirm 27 public application tables with RLS, no anonymous table grants, fixed search paths on the four principal authorization/save functions, and 26 restrictive MFA policies. The private September 28 schema export and baseline scripts were located under `%TEMP%/lifedashboard-test-setup-cbgoykmmlopwniufmxvw`; keep them outside Git. Their existence does not establish who applied the schema or current production deployment status. The project overview reported Unhealthy during this session, while SQL requests succeeded; Auth/API health still requires verification.

All eight existing SQL suites passed together against this separate Supabase project in a rollback-only transaction: profiles, data isolation, atomic workouts, password reset, personal documents, MFA, planning, and connector storage. Existing-record fingerprints matched before rollback. An independent read afterward confirmed zero Auth users, profiles, and connector rows and retained 26 restrictive MFA policies. No migrations, persistent account changes, or production operations were performed. `node scripts/prepare-test-acceptance.js` generates this transaction without connecting; it refuses command arguments, including a commit mode, and the SQL rejects populated Auth/profile tables. Review the destination before manually running it. Generated SQL and all private baseline output stay outside Git.

The active Nutrition, Habits, book-library, and habit-history renderers now use the tested `SectionReadService` to reject superseded/account-changed reads. Nutrition reports rejected network requests and malformed results. Habit history reads seven days in one query, uses the profile's current day and current habit definitions, and reports errors instead of zero completions. Its labels explicitly describe current habits, so removed habits do not distort percentages. No new staged rendering override was added.

The manual live harnesses' existing private-fixture backend selection now has tests for exact-project targeting and rejection of privileged/malformed keys. **Latest local validation: 292 tests across 24 suites, plus a 34-file synthetic-config build with connectors disabled.** Tests and internal SQL/scripts remain outside the static artifact. No commit, push, or deployment was performed.

Next: review test-project Auth settings/health, create private disposable login fixtures, and run real Auth/Data API and browser acceptance across populated sections, reloads, rejected writes, retries, account switching, session expiry, and mobile views. The SQL suites establish bounded database behavior; they do not establish actual Auth sessions or persistent browser behavior. Full ICS details/recurrence, safe legacy roadmap status writes, off-device recovery, and live connector activation remain pending. The 721-node structural Graphify map still predates these source changes; use current source and session memory.

## Separate test project created — September 28 evening

The owner completed project creation in Supabase. The dashboard verifies **LifeDashboard-Test**, organization **Project-Zeno (Free)**, region **East US / North Virginia (`us-east-1`)**, compute **Nano**, status **Healthy**. Test project reference: `cbgoykmmlopwniufmxvw`; dashboard: https://supabase.com/dashboard/project/cbgoykmmlopwniufmxvw. This is separate from the existing LifeDashboard production project. The overview shows no migrations and no repository connection.

Project creation is complete; the test backend is not yet prepared for application acceptance. Next: inspect the real application schema and permissions, prepare a schema-only test baseline, verify the test project's security/Auth settings, and create private synthetic fixtures before running persistence and cross-user tests. Do not substitute the partial PGlite fixture for the real schema or copy production personal records. No credentials were collected, no application schema was applied, and no production settings were changed in this project-creation workflow.

## Home integration checkpoint — September 28 evening

The office changes were committed as `1b048f5` (safe writes/import) and `1e1d49b` (docs/map), and are present on local `main`. The earlier references below to uncommitted office work describe the original checkpoint. Local connector work was subsequently reapplied with conflicts. Those conflicts are now resolved in `app.js`, `index.html`, `scripts/build-static.js`, and `test/AppSecurity.test.js`, and the four resolutions are staged. No commit, push, deployment, or production/database mutation was performed during this integration pass.

- Both runtime sets are loaded and allowlisted: safe writes/calendar import plus Connections, ConnectorService, and ObsidianService. Connector configuration remains disabled by default.
- Calendar month/week/day views combine local and connected events while retaining visible local-read failures. Old responses after account changes or a newer calendar request cannot replace the current view.
- Recipe fallback now explicitly says it is showing cached session data and offers retry; a successful refresh clears that warning.
- Dashboard now shows saved goals instead of fixed monthly weight milestones. Existing `milestone_status` data is untouched; the obsolete milestone writer and two dashboard rendering wrappers were removed. Custom habit labels are rendered directly, and nutrition targets use the shared target resolver.
- Dashboard tasks reject late/superseded responses, show read failures, put Urgent first, and describe an empty due-date query accurately rather than claiming all work is done. The duplicate delayed dashboard task refresh was removed.
- The mobile shell check now inspects CSS rules, including grouped selectors, instead of requiring one exact selector string.

**Verified locally:** 267 tests across 22 suites passed, including PGlite database suites and connector broker/service checks. `npm run build` produced 33 allowlisted public files with synthetic public configuration and connectors disabled. Syntax checks passed and no merge markers remain. New regression checks exercise calendar failure/session/order behavior, combined event sources, stale recipe recovery, saved goals/custom habits, and dashboard task ordering/cancellation. These are local tests; no new real-browser or live Auth/API acceptance is claimed.

At this integration checkpoint there was no separate test project; it has since been created as recorded above. Next: prepare that project using a reviewed schema, create private disposable-account fixtures, and verify persistence, rejection/retry, session expiry, and cross-user isolation across populated sections. Production compatibility and connector migration 009/application deployment remain unverified. Legacy roadmap status writes still need real-schema review before choosing a safe upsert key; full ICS recurrence/details and off-device recovery remain open. Keep connector activation separate from the default-disabled client integration.

The 721-node Graphify map predates this integration. Use the latest session memory and current source; the structural map was not rebuilt during this pass.

## Read this first

The owner wants **all existing Dashboard sections prioritized equally** and ready for daily use. A separately supplied private conversation also motivates reliable fitness logging and calendar import. Do not copy that conversation, its images, personal targets, or exported calendar into this public repository.

Office work began on a clean `main` at `0b27f19` (September 26 planning release). The original checkpoint below preceded commits `1b048f5` and `1e1d49b`; see the home integration checkpoint above for current status. Repository agreements require explicit authorization to commit/push. Check `git status` and preserve any later work before continuing.

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
3. Continue auditing remaining async renderers and legacy roadmap status writes for session changes, ignored database errors, and stale responses. Home integration replaced fixed dashboard milestones with saved goals, removed the old milestone writer, added recipe cache warnings, and repaired dashboard task/calendar cancellation. Nutrition retains preset meal references. Workout session saving, planning, personal documents, and MFA already have earlier bounded coverage; retain it.
4. Verify new client writes against the real schema and permissions using a separate test project or an owner-approved disposable-account procedure. The committed SQL fixtures intentionally do not represent every live domain constraint. Do not infer production compatibility solely from mock tests.
5. Resolve full calendar details/recurrence support using the **real schema** before proposing a migration. The current app has only a titles/times editor, so the private fitness calendar cannot yet become a complete in-app instruction plan.
6. Google Calendar/GitHub, selected Obsidian imports, and brief narration now have local connector implementation and tests, but live setup/application remains unverified. Mail/health connectors, privileged invitations/password administration, background notifications, independent off-device recovery, and a separate test project remain roadmap gaps. Do not imply they are connected.
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
