# LifeDashboard review — September 4, 2026

## Assessment

LifeDashboard is a useful personal tracking prototype with a deterministic daily brief. It is not yet a verified private-data platform or an autonomous personal assistant. The most valuable next investment is proving database isolation and making saved data reproducible, followed by a small read-only calendar/task integration.

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
| P0 | Actual RLS, profile authorization columns, RPC privileges, and signup settings are unverified | Reviewed schema/policy baseline plus anonymous and two-user isolation checks, including private child rows and shared templates |
| P1 | Goals, custom habit definitions, ingredient definitions, and purchase decisions still rely on local browser storage | User-owned database records, explicit migration preview, export/delete tools, and a tested restore procedure; preserve existing local data until migration succeeds |
| P1 | Many legacy writes ignore returned errors; workout session replacement is multiple operations | Failed writes never report success, partial failures are recoverable, and session/set replacement is transactional on the server |
| P1 | `app.js` still has roughly 4,700 lines, staged overrides, and over 100 direct Supabase calls | Migrate one domain at a time into clear controllers and API methods; remove superseded implementations after behavioral tests |
| P1 | Inline event handlers require CSP `unsafe-inline` | Move handlers to event delegation and deploy a CSP without inline script permission. The new policy is defense in depth, not a complete XSS boundary |
| P1 | Authenticated browser/database integration coverage is missing | Dedicated test project and disposable accounts; verify reload persistence, cross-user isolation, expiry, failed writes, slow responses, logout, and mobile navigation |
| P2 | Date handling mixes UTC, browser timezone, and profile timezone | Centralize date arithmetic; cover DST, all-day/multi-day events, month-end payments, and recurrence |
| P2 | Calendar import is a basic parser | Bound file/event size, support timezones and recurrence explicitly, preview conflicts, and deduplicate imports |
| P2 | The schedule includes hard-coded routine suggestions | Label templates and make wake, work, training, and recovery windows configurable |

Global mutable UI state and older async renderers still need a full cancellation model; the added generation checks cover the auth, home, content-loading, and private-cache paths touched here. Existing direct console calls elsewhere in the legacy module also need migration to the event-only logger.

The static site shares an origin with other project Pages sites under the same GitHub account. A dedicated application origin would reduce cross-project storage/script exposure. Move to hosting with response-header control before depending on `frame-ancestors`, HSTS, or HttpOnly session cookies; these cannot be supplied by the current static shell alone.

## GitHub and attribution

Private vulnerability reporting, dependency graph, Dependabot alerts, secret scanning, and push protection were enabled with the owner's explicit approval. CodeQL was already enabled. Branch protections remain a follow-up; enabling required reviews on a one-person repository needs a workable owner workflow.

Historical commits `cdaf989` and `2847f12` contain Claude co-author trailers. They are reachable from a local legacy branch and `refs/original`, but **not from current `main` or `origin/main`**. The remote advertises only `main` and no tags. Current main's authors are Cisco, and no Claude co-author trailer remains in its reachable commits. Current tracked source has no Claude signature; the remaining name references are tooling ignore entries.

GitHub's repository sidebar still displayed Claude during review despite that clean current history. This is evidence of stale or retained GitHub attribution, not an active co-author in the current branch. A further force-push is not justified by the inspected main history. GitHub documents a refresh delay of about 24 hours after history changes. If it persists beyond that, provide GitHub Support the repository URL, those old commit IDs, and the clean current head. Do not rename/delete the repository or discard valid commits to manipulate the widget. No assistant attribution is added to this work.

## Verification and limits

Validation: 112 tests pass across 10 suites; the public build succeeds; dependency audit reports no known vulnerabilities. Chrome renders the local production sign-in shell correctly. The build test also verifies rejected privileged keys do not overwrite an existing artifact.

After pushing implementation commit `12b4172`, GitHub's [Tests](https://github.com/Code-With-Cisco/LifeDashboard/actions/runs/33934960137), [Pages deployment](https://github.com/Code-With-Cisco/LifeDashboard/actions/runs/33934960227), and [CodeQL](https://github.com/Code-With-Cisco/LifeDashboard/actions/runs/33934960157) workflows all passed. The browser showed zero open CodeQL alerts and one closed alert, zero Dependabot alerts, and no secrets found. The CodeQL alert resolved through the code change; it was not manually dismissed. These scanner results do not establish database isolation.

The suite now includes application-level tests for stored markup, the CodeQL input path, cross-user recipe fallback, late auth/home responses, sign-out UI cleanup, bounded workout sets, duplicate plan days, and private diagnostics. Build tests reject privileged/unknown keys and unsafe URLs and verify the public artifact and locked SDK.

A pattern scan of blobs reachable from main found no matching private keys, provider secret tokens, or privileged Supabase JWTs. It did find historical public anon JWTs, which are expected public client values. This is a bounded pattern scan, not proof of an exhaustive secret audit.

Live Supabase policies and authenticated production workflows could not be verified because the owner was unable to sign in. [Supabase status](https://status.supabase.com/) showed degraded API Gateway performance and an unresolved JWT rejection incident, while Auth and Dashboard were listed operational. No database policies, credentials, or personal production records were changed during this review.

## References

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [column permissions](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [Supabase auth callback guidance](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [GitHub co-author trailers](https://docs.github.com/en/pull-requests/how-tos/commit-changes/creating-a-commit-with-multiple-authors)
- [GitHub contributor graph behavior](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-projects-contributors)
