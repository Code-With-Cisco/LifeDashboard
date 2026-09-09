# LifeDashboard review — September 9, 2026

September 9 MFA checkpoint: the authenticator client and migration 007 are implemented, with 161 passing local tests. Restored-database and live rollback checks verified the 26-table MFA policies and unchanged existing rows. Twenty real Auth preflight assertions passed with disposable accounts. Chrome verified password-only challenge, successful verification and dashboard entry, account-security settings, setup QR rendering, and cancellation. Production application is awaiting explicit approval following automatic review; live API enforcement checks and client publication must follow the committed migration.

## Assessment

September 8 follow-up on `codex/personal-data-foundation`: account-scoped document storage and encrypted subset backups include previewed browser migration, revision checks, atomic batches, and failed-draft preservation. Onboarding confirms its profile write before success, password recovery initializes the document store, profile saves ignore late responses, and ingredient lookups no longer mutate shared runtime dictionaries. Migrations 005 and 006 are applied with preserved existing records. The client is ready for release following live API and Chrome verification. No provider integration is claimed as connected.

September 8 validation: 145 tests across 13 suites passed, including fresh and upgrade rollback/commit transactions in local PostgreSQL, preserved synthetic records, account switching, malformed records, revision conflicts, and encryption/decryption failures. The allowlisted build passed; the production dependency audit reported zero known vulnerabilities. All 66 personal-record Auth/Data API checks passed, including concurrent saves with exactly one winner, atomic rollback after an earlier batch write, protected columns, and disabled/reset-required accounts. Chrome used the production build on loopback with a disposable account against the live API to verify conflict feedback, draft preservation, reviewed migration, persistence after reload, and sign-out cleanup. All disposable users were removed; public-table and Auth user fingerprints were unchanged. This is bounded verification, not a complete browser/device matrix.

LifeDashboard is a personal tracking prototype with a deterministic daily brief. Critical authorization defects are repaired and tested through live SQL and authenticated APIs. Durable personal records and local logical-backup recovery now have verified paths. Independent off-device recovery, MFA, a separate test project, broader integrations, and a server boundary remain necessary for the longer-term assistant roadmap.

The September 5 browser inspection reached the live Supabase project and confirmed critical authorization gaps despite RLS being enabled on all 25 public tables. **Migrations 001–004 and the approved Auth settings are now live and verified.** The dependent workout/reset client changes passed a production build and a signed-in Chrome check against the repaired database before release.

## Live database findings and repair status

| Priority | Observed problem | Resolution |
|---|---|---|
| Critical | A permissive profile SELECT policy and anonymous table grants allowed unauthenticated profile reads. A read-only probe returned only a boolean confirming visibility; no profile contents were exported | **Applied:** migration 001 removes legacy profile policies, revokes anonymous access and unnecessary table privileges, and restricts reads to the owner or an active administrator |
| Critical | A standard user could update their own authorization columns; no protective trigger existed. Public signup was enabled and email confirmation disabled | **Applied:** migration 001 protects role/disabled fields and profile ownership. Public signup is now disabled and email confirmation enabled in Auth settings |
| High | Private catalog rows were readable by every authenticated account. Shared-template flags and one anonymous template-insert policy widened write access | **Applied:** migration 002 restricts private catalogs to their creator, reserves shared-template publishing/editing for administrators, defaults new rows to private, and authorizes plan days through their parent |
| High | Disabling an account in the UI did not consistently revoke database access with an existing session | **Applied:** migration 002 checks the current account state; an existing authenticated JWT lost private-data and workout access immediately when its disposable profile was disabled |
| High | The browser could clear its own required-password-reset flag | **Applied:** migration 004 protects that field and restricts data until Auth changes the password. Real Auth/API tests confirmed bypass denial, incorrect-password rejection, and successful reset completion |
| High | Workout save updated the parent, deleted prior sets, inserted replacements, and updated history as separate unchecked requests | **Applied:** migration 003 makes replacement one transaction with input limits and ownership checks. The client preserves failed drafts and uses stable session UUIDs; live SQL forced-failure and API/browser persistence checks passed |
| Medium | `increment_meal_usage` referred to a nonexistent ownership column | **Applied:** migration 002 uses the inspected `created_by` column and permits updates only to the caller's private meals; shared catalog counters are not writable by ordinary callers |
| Medium | The brief requested `start_time`, but the live calendar column is `event_time` | The client selects `start_time:event_time`, preserving the brief service's contract |
| Medium | The password form omitted the current-password field required by the live Auth configuration | Send `current_password` exactly as entered; remove the re-login fallback and report failed or unconfirmed updates accurately |
| Medium | Administrator toggles reported success even when the database rejected or affected no row | Require a returned row before reporting success; display read failures and ignore late responses after sign-out |

These findings establish exposure and authorization defects, not evidence that someone accessed or altered personal records. Raw catalog results and production audit output are kept out of Git and the static artifact. The checked-in schema fixture is synthetic and intentionally partial.

Auth inspection also confirmed correct production site/redirect URLs, refresh-token replay detection enabled, a 3,600-second access-token lifetime, and TOTP capability enabled. TOTP availability does not mean account enrollment or application enforcement has been verified. The application needs an MFA challenge flow and a deliberate policy for sensitive operations before requiring an elevated assurance level. Session inactivity/maximum-duration controls and leaked-password protection were unavailable on the current Free plan; no plan upgrade was made. With specific owner approval, public signup was disabled, email confirmation enabled, and secure email change enabled. The saved settings were verified; current-password verification remains enabled.

The inspected Free plan did not include project backups; no plan upgrade was made. A private logical archive now contains all 59 source tables and role/schema metadata. The isolated PostgreSQL restore matched 475 rows across 58 tables and the application security inventory; only the empty Supabase Vault table was excluded from the local drill. The encrypted recovery package and its checksum were verified. DPAPI recovery depends on this Windows account; independent off-device and complete managed-Supabase recovery remain pending. See the [recovery scope](database/README.md#private-recovery-verification).

Existing catalog rows marked as shared templates retain that designation. They need an owner review before treating every existing shared item as intentional. Any existing duplicate same-day workout sessions would remain unchanged: retries within one draft are idempotent, but independently opened new sessions can still create duplicates. Concurrent edits to the same session are serialized with the last successful save winning; version/conflict handling is a follow-up.

Baseline: public repository, `main` at `ee7cc02`, 84 passing tests, GitHub Pages deployment passing, one high CodeQL alert. The working tree was clean. The source map helped locate the auth, rendering, storage, and briefing boundaries, but its line references predated recent changes and required source verification.

## Findings addressed in this change

| Finding | Impact | Change |
|---|---|---|
| Custom workout fields entered HTML without escaping | Stored markup could execute in the signed-in browser | Escape workout, exercise, and related summary text and workout-log attributes; exercise actual renderers with hostile fixtures |
| Questionnaire values were reinterpreted as markup | GitHub CodeQL alert #1, high | Escape input values on rerender, with an application regression test |
| Recipe cache was shared across users; habit cache was keyed only by date | Another account on the same browser could receive the previous user's fallback data | Use bounded, per-user, session-memory caches; remove old derived caches |
| Sign-out left populated modals, application content, and state | Private data remained visible or accessible through stale UI | Restore the private shell and clear session caches, modal values, reminders, and transient state; ignore late auth/content/home results |
| Auth callback awaited other Supabase operations | Risk of auth callback deadlock and racing session initialization | Defer async work outside the callback and track the current auth generation |
| Profile read errors attempted profile creation | Outages or policy errors could cause unintended writes | Fail closed on profile read failure; newly created profiles always request the standard role |
| Build accepted arbitrary keys and a floating CDN SDK | A privileged key could be published; runtime code changed without a repository update | Validate public-key type before build/client creation; lock Supabase 2.115.0, serve its UMD file locally, retain its license, and audit runtime dependencies |
| No browser connection policy | Unrestricted external connections and framing primitives | Add a CSP with exact production Supabase origin, block objects/base/form submission, and suppress referrers |
| Diagnostics retained arbitrary payloads | Health/finance details could survive in logs and console output | Logger stores session-only event codes, discards payloads/errors, and removes legacy persisted logs |
| Home treated failed requests as empty records | Misleading all-clear daily brief during an outage | Show incomplete-source warnings, unknown counts, saved goal directions, refresh control, and update time |
| Home made sequential daily habit requests | Up to 14 extra requests and a fixed ten-habit completion threshold | Query one date range and compare completion with the configured habit count |
| Plan builder selected both day containers and their inputs | Each intended day could be saved multiple times | Select day containers only and bound exercise set rendering to 20 |

## Remaining priorities

| Priority | Gap | Acceptance criterion |
|---|---|---|
| P1 | The reviewed database defects are repaired; authorization coverage must keep pace with future changes | Run SQL role tests and dedicated-project Auth/Data API checks whenever schema, grants, RPCs, or Auth behavior changes |
| P1 | Goals, custom habit definitions, ingredient definitions, and purchase decisions still rely on local browser storage | User-owned database records, explicit migration preview, export/delete tools, and a tested restore procedure; preserve existing local data until migration succeeds |
| P1 | Many legacy writes still ignore returned errors outside the repaired workout/admin paths | Audit meal, finance, goals, and plan writes so rejected writes never report success |
| P1 | `app.js` still has roughly 4,700 lines, staged overrides, and over 100 direct Supabase calls | Migrate one domain at a time into clear controllers and API methods; remove superseded implementations after behavioral tests |
| P1 | Inline event handlers require CSP `unsafe-inline` | Move handlers to event delegation and deploy a CSP without inline script permission. The new policy is defense in depth, not a complete XSS boundary |
| P1 | Authenticated coverage is manual and bounded | Keep the passing cross-user/Auth/workout checks in a dedicated test project; extend to access-token expiry, slow responses, all domains, and mobile navigation |
| P2 | Date handling mixes UTC, browser timezone, and profile timezone | Centralize date arithmetic; cover DST, all-day/multi-day events, month-end payments, and recurrence |
| P2 | Calendar import is a basic parser | Bound file/event size, support timezones and recurrence explicitly, preview conflicts, and deduplicate imports |
| P2 | The schedule includes hard-coded routine suggestions | Label templates and make wake, work, training, and recovery windows configurable |

Global mutable UI state and older async renderers still need a full cancellation model; the added generation checks cover the auth, home, content-loading, and private-cache paths touched here. Existing direct console calls elsewhere in the legacy module also need migration to the event-only logger.

The static site shares an origin with other project Pages sites under the same GitHub account. A dedicated application origin would reduce cross-project storage/script exposure. Move to hosting with response-header control before depending on `frame-ancestors`, HSTS, or HttpOnly session cookies; these cannot be supplied by the current static shell alone.

## GitHub and attribution

Private vulnerability reporting, dependency graph, Dependabot alerts, secret scanning, and push protection were enabled with the owner's explicit approval. CodeQL was already enabled. Branch protections remain a follow-up; enabling required reviews on a one-person repository needs a workable owner workflow.

Historical commits `cdaf989` and `2847f12` contain Claude co-author trailers. They are reachable from a local legacy branch and `refs/original`, but **not from current `main` or `origin/main`**. The remote contained only `main` and no tags at the initial inspection; the repair branch was subsequently pushed. Current main's authors are Cisco, and no Claude co-author trailer remains in its reachable commits. Current tracked source has no Claude signature; the remaining name references are tooling ignore entries.

GitHub's repository sidebar still displayed Claude during review despite that clean current history. This is evidence of stale or retained GitHub attribution, not an active co-author in the current branch. A further force-push is not justified by the inspected main history. GitHub documents a refresh delay of about 24 hours after history changes. If it persists beyond that, provide GitHub Support the repository URL, those old commit IDs, and the clean current head. Do not rename/delete the repository or discard valid commits to manipulate the widget. No assistant attribution is added to this work.

## Verification and limits

Release `e99a7fa` reached `main` after the live checks below passed. GitHub's [Tests](https://github.com/Code-With-Cisco/LifeDashboard/actions/runs/34032149370), [CodeQL](https://github.com/Code-With-Cisco/LifeDashboard/actions/runs/34032149383), and [Pages deployment](https://github.com/Code-With-Cisco/LifeDashboard/actions/runs/34032149337) all completed successfully on September 6. The author and committer are Cisco, with no signature or co-author trailer. The working tree was clean after push.

Production profile verification: the reviewed migration 001 and its disposable cross-user tests first passed inside a rollback-only transaction, then passed again in the committed transaction. Checks covered anonymous denial, owner reads/normal edits, foreign reads/edits, blocked self-promotion and ownership/security-field changes, legitimate administrator access, and blocked self-reenable by a disabled user. An in-database fingerprint comparison verified that every existing profile row was unchanged; all fixture accounts were rolled back. No personal row values or fingerprints were exported.

A subsequent read-only check confirmed three profile policies, enabled RLS and authorization trigger, only SELECT/INSERT/UPDATE privileges for authenticated callers, no anonymous profile privileges or role-RPC execution, a fixed empty function search path, and zero test accounts. An independent zero-row profile Data API request returned HTTP 401 / PostgreSQL 42501. The authorization baseline is stored privately outside the repository; it is not a full personal-data backup.

September 6 production verification: the exact generated 002–004 transaction passed all four SQL suites with `ROLLBACK`, then passed again with `COMMIT`. Internal fingerprints verified that every pre-existing public-table and Auth user row was unchanged; no values or fingerprints were exported. Post-commit checks confirmed all 25 public tables with RLS, 44 policies, zero anonymous table/column grants, six functions with fixed empty search paths and narrow execution grants, and two profile triggers plus the Auth password-change trigger. All SQL fixtures were removed. Independent zero-row API requests to all 25 tables returned HTTP 401 / PostgreSQL 42501.

Two disposable, auto-confirmed Auth accounts passed **58 API assertions** using the public client key and their own real JWTs: sign-in and own-record creation; bidirectional foreign profile/task/meal/workout/child reads; denied foreign task writes/deletes and ownership reassignment; blocked self-promotion/template publishing; workout retry, zero values, and invalid-input preservation; reset bypass denial, rejected incorrect current password, real Auth password update and restored access; disabled-user denial with an existing token; revoked refresh tokens after sign-out; and failed logins after account removal. No service-role key was used for these checks. No invitations or emails were sent. Both accounts and their synthetic records were removed afterward, and their temporary local credentials were discarded.

Chrome verification against the repaired database used the production build and a disposable account: the daily brief loaded, a synthetic workout saved through the new RPC, its history survived a reload, and sign-out cleared the private interface. The fixture's onboarding flag was initialized explicitly; this check did not exercise the full onboarding questionnaire or change the owner's profile. Full mobile, slow-network, access-token expiry, and MFA coverage remains outstanding.

The final Supabase Security Advisor rerun reported zero errors and two warnings: authenticated execution of the deliberately scoped `SECURITY DEFINER` role helper, and disabled leaked-password protection on the current plan. The helper's scope and remaining private-schema hardening are documented in [SECURITY.md](SECURITY.md). Public Pages HTML and the changed JavaScript matched the tested build after normalizing text encoding; internal SQL, the manual API harness, and this review returned HTTP 404 from Pages. GitHub's contributor widget still showed Claude on September 6 despite the clean default-branch authors and trailers; no further shared-history rewrite was performed.

The public Auth settings endpoint independently confirmed signup disabled and email confirmation required. The existing account is confirmed and enabled. No active app administrator profile currently exists; the profile-data comparison establishes that this was already the case before the repair. Administrator permissions passed using a disposable fixture, and no existing account was promoted. An earlier assumption that the owner's app profile was an administrator was incorrect.

September 6 validation: **125 tests pass across 11 suites**, the allowlisted static build succeeds with 20 public files, and `npm audit --audit-level=high` reports zero known vulnerabilities. Six database tests use an isolated PostgreSQL engine (PGlite), not a mocked query client: they reproduce the old profile exposure, check the four repair suites, and verify that the exact generated transaction preserves existing records and rolls back. Application tests cover retries, preserved inputs, current-password submission, calendar column mapping, and failed administrator writes. Manual API tooling and private fixture files are excluded from the static artifact.

The local fixture covers inspected authorization columns and relevant constraints; it is not a complete Supabase environment. Live SQL, Auth/Data API, browser checks, and the bounded restore drill complement it, but they do not cover every possible operation. See the [database deployment procedure](database/README.md) for reproducible tests, recovery limitations, and release ordering.

September 4 validation: 112 tests passed across 10 suites; the public build succeeded; dependency audit reported no known vulnerabilities. Chrome rendered the local production sign-in shell correctly. The build test also verifies rejected privileged keys do not overwrite an existing artifact.

After pushing implementation commit `12b4172`, GitHub's [Tests](https://github.com/Code-With-Cisco/LifeDashboard/actions/runs/33934960137), [Pages deployment](https://github.com/Code-With-Cisco/LifeDashboard/actions/runs/33934960227), and [CodeQL](https://github.com/Code-With-Cisco/LifeDashboard/actions/runs/33934960157) workflows all passed. The browser showed zero open CodeQL alerts and one closed alert, zero Dependabot alerts, and no secrets found. The CodeQL alert resolved through the code change; it was not manually dismissed. These scanner results do not establish database isolation.

The suite now includes application-level tests for stored markup, the CodeQL input path, cross-user recipe fallback, late auth/home responses, sign-out UI cleanup, bounded workout sets, duplicate plan days, and private diagnostics. Build tests reject privileged/unknown keys and unsafe URLs and verify the public artifact and locked SDK.

A pattern scan of blobs reachable from main found no matching private keys, provider secret tokens, or privileged Supabase JWTs. It did find historical public anon JWTs, which are expected public client values. This is a bounded pattern scan, not proof of an exhaustive secret audit.

The owner approved the profile repair, three Auth settings, and remaining three database repairs. All are applied. Existing personal rows, owner credentials, and account roles were preserved. The repaired client is released only after its database prerequisites and the live checks above passed.

## References

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [column permissions](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [Supabase auth callback guidance](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [GitHub co-author trailers](https://docs.github.com/en/pull-requests/how-tos/commit-changes/creating-a-commit-with-multiple-authors)
- [GitHub contributor graph behavior](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-projects-contributors)
