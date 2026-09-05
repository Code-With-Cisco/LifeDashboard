# Database verification and deployment

Status, September 5: the live schema, grants, RLS policies, functions, triggers, and relevant Auth settings were inspected through the owner's Supabase browser session. The migrations below are **prepared, locally tested, and not applied in production**. Raw production audit output and personal rows are not included here. `security-audit.sql` remains a read-only inventory tool.

## Reviewed repair order

| Migration | Effect | Matching test |
|---|---|---|
| `20260905_001_profile_authorization.sql` | Removes unrestricted profile reads; limits grants; protects role, disabled status, and profile ownership | `tests/profile_authorization.sql` |
| `20260905_002_data_isolation.sql` | Restricts private tables/catalogs and child records; blocks disabled accounts; fixes meal counter ownership; narrows audit/default grants | `tests/data_isolation.sql` |
| `20260905_003_atomic_workout_save.sql` | Adds an invoker RPC for transactional session, set, and legacy-history replacement with bounded inputs and stable-ID retries | `tests/atomic_workout_save.sql` |
| `20260905_004_password_reset_guard.sql` | Protects the reset flag; restricts data until reset; clears the flag after Auth updates the password | `tests/password_reset_guard.sql` |

No migration deletes or rewrites existing personal rows. Migration 002 changes defaults for future catalog records; it preserves existing template flags. Migration 004 installs an `auth.users` trigger based on the inspected `encrypted_password` column. A failing Auth trigger can prevent password changes, so verify this separately through Auth before relying on the reset flow. Do not edit a real account's password or hash in SQL.

## Local verification

Run `npm ci --ignore-scripts`, then `npm test -- --runInBand`. `scripts/test-database.js` starts disposable in-memory PostgreSQL through the pinned development-only PGlite dependency. It loads `test/fixtures/security-schema.sql`, reproduces the old profile exposure on synthetic data, applies each migration, runs cross-user tests, checks that fixtures were removed, and rolls back. The engine has no production credentials or network connection.

The fixture is deliberately partial. These are real PostgreSQL role/RLS/trigger tests, but they do not substitute for testing the actual Supabase schema and public API. The static build allowlist excludes migrations, tests, internal documentation, and PGlite.

## Production procedure

1. Obtain specific approval for these production policies, grants, functions, and triggers. Automatic approval review rejected the initial rollback-only test because it temporarily mutates the live schema. General code-fix authorization did not satisfy that review. Approval is also needed for the separately proposed Auth settings.
2. Preserve a private schema baseline and restorable backup in an approved private location. Do not export personal records into the repository, build artifact, SQL snippet comments, or CI logs. Confirm the target is the intended project and recheck schema/privilege changes since inspection.
3. Construct one SQL script: `BEGIN;`, migrations 001-004 in order, the four matching test scripts, then `ROLLBACK;`. Each test creates disposable fixtures behind a savepoint and rolls them back. IDs/usernames deliberately collide rather than overwrite if those fixtures already exist. Test output contains only pass/fail labels; do not select personal rows. The workout test creates a temporary failure trigger and the reset test changes only a synthetic marker on its disposable account.
4. Confirm every test label passes and the transaction rolls back. A SQL error aborts the transaction; explicitly `ROLLBACK` before continuing. Investigate against the actual schema and repeat locally before retrying. Do not weaken a policy to make a failing test pass.
5. After the rollback-only run passes, run the same migration/test transaction with `COMMIT;`. Tests roll back their own fixtures, preserving only the repairs. Verify no test account remains and that anonymous private-table access is denied. Verify function owners, fixed search paths, explicit EXECUTE grants, protected-column behavior, disabled-user access, and all child ownership chains.
6. Verify Auth password change and two-user isolation through the public Auth/Data APIs with disposable accounts. Never use a service-role key for those access checks. Cover caller-A and caller-B reads/writes/deletes/ownership reassignment, shared-template restrictions, password-reset bypass attempts, failed workout replacement, token expiry, and sign-out. Owner credential entry remains with the owner.
7. Only then merge/deploy the client changes and verify the actual signed-in workflow. The client calls `save_workout_session` and expects the Auth reset trigger; deploying it first would make workout saves fail and leave required-reset flows blocked. Confirm GitHub Tests, CodeQL, and Pages deployment for the resulting main commit.

Retain the previous schema privately for recovery, but prefer a reviewed forward fix to reinstalling the exposed legacy policies. If the Auth trigger blocks legitimate changes, isolate its cause before a narrowly approved correction. If deployment is delayed, keep the code on the repair branch and state clearly that production remains exposed.

## Auth settings and remaining work

Proposed: disable public self-signup, enable email confirmation, and enable secure email change. The browser's invitation-only flag does not enforce signup policy. Existing production redirect URLs and refresh-token replay detection are correctly configured. Current-password verification is enabled and the prepared form now supplies it.

Free-plan session limits and leaked-password protection cannot be enabled from the inspected controls. TOTP capability is available, but enrollment, challenge UI, and appropriate AAL2 enforcement need a coordinated implementation. Backup restoration and external Auth/Data API checks have not been completed.

New migrations must explicitly opt into table/RPC grants and revoke implicit `PUBLIC` EXECUTE on each new function. Migration 002 narrows the inspected `postgres` public-schema defaults; this does not globally remove PostgreSQL's implicit function EXECUTE default or govern every other creator role. Audit defaults whenever migration ownership or exposed schemas change.

Review existing template flags with the owner; do not silently turn potentially personal catalog rows into shared templates. Review global catalog uniqueness and same-day workout duplication before adding constraints. The atomic RPC serializes edits to one session but does not implement version-based conflict detection or deduplicate independent new-session IDs.
