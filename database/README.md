# Database verification and deployment

Status, September 6: **migrations 001–004 are applied and verified in production** with the owner's approval. Public signup is disabled, email confirmation enabled, and secure email change enabled. Raw production audit output and personal rows are not included here. `security-audit.sql` remains a read-only inventory tool.

Migration 001 passed its cross-user tests before and during commit. The remaining three migrations then passed all four SQL suites in a rollback-only transaction and again in the committed transaction. Internal fingerprints verified that every pre-existing public-table and Auth user record was unchanged. SQL fixtures were rolled back. Post-commit checks confirmed 25 tables with RLS, 44 policies, no anonymous table/column grants, six functions with fixed search paths and restricted execution, and the three intended triggers. Independent zero-row Data API requests to all 25 tables returned HTTP 401 / PostgreSQL 42501. The authorization/schema baselines were preserved privately outside Git; they are not a full database backup or a restore drill.

The existing account was confirmed and enabled when checked after the Auth change. No active application administrator profile exists; migration 001 preserved that pre-existing state. Administrator behavior was verified with a disposable fixture, not by promoting the owner's account. Any future administrator bootstrap must explicitly identify and approve its target account.

## Reviewed repair order

| Migration | Status | Effect | Matching test |
|---|---|---|---|
| `20260905_001_profile_authorization.sql` | Applied | Removes unrestricted profile reads; limits grants; protects role, disabled status, and profile ownership | `tests/profile_authorization.sql` |
| `20260905_002_data_isolation.sql` | Applied | Restricts private tables/catalogs and child records; blocks disabled accounts; fixes meal counter ownership; narrows audit/default grants | `tests/data_isolation.sql` |
| `20260905_003_atomic_workout_save.sql` | Applied | Adds an invoker RPC for transactional session, set, and legacy-history replacement with bounded inputs and stable-ID retries | `tests/atomic_workout_save.sql` |
| `20260905_004_password_reset_guard.sql` | Applied | Protects the reset flag; restricts data until reset; clears the flag after Auth updates the password | `tests/password_reset_guard.sql` |

No migration deletes or rewrites existing personal rows. Migration 002 changes defaults for future catalog records; it preserves existing template flags. Migration 004 installs an `auth.users` trigger based on the inspected `encrypted_password` column. The real Auth password-change flow passed using a disposable account: incorrect current passwords were rejected, the reset flag remained set after rejection, and a successful change cleared the flag and restored data access. Do not edit a real account's password or hash in SQL.

## Local verification

Run `npm ci --ignore-scripts`, then `npm test -- --runInBand`. `scripts/test-database.js` starts disposable in-memory PostgreSQL through the pinned development-only PGlite dependency. It loads the synthetic schema, reproduces the old profile exposure, applies 001 to match the pre-repair production state, and seeds an existing account and task. It executes the exact generated 002–004 transaction, checks all four suites and record preservation, and verifies that rollback removed the new RPC. The engine has no production credentials or network connection.

The fixture is deliberately partial. These are real PostgreSQL role/RLS/trigger tests, but they do not substitute for testing the actual Supabase schema and public API. The static build allowlist excludes migrations, tests, internal documentation, and PGlite.

## Production procedure

1. Confirm the target's current migration state and authorization before a new deployment. The owner approved all four repairs and the three Auth settings; those deployments are complete. Do not rerun these migrations on production merely to repeat a test.
2. Preserve a private schema baseline and restorable backup in an approved private location. Do not export personal records into the repository, build artifact, SQL snippet comments, or CI logs. Confirm the target is the intended project and recheck schema/privilege changes since inspection.
3. `node scripts/prepare-database-repair.js` prints the reviewed 002–004 transaction with all four suites, preservation guards, timeouts, and a final `ROLLBACK`. It only generates SQL; it never connects or applies it. `--from=001` includes the profile migration for a matching fresh database; `--commit` changes only the final terminator. Keep generated files outside Git. Never reapply 001 after 004, because 004 extends its role function. The checksum table is temporary and session-private, not exposed in `public`; all app tables explicitly enable RLS. Tests use savepoints and deliberate fixture collisions instead of overwriting existing records. The failure trigger and synthetic password marker are rolled back.
4. Confirm every test label passes and the transaction rolls back. A SQL error aborts the transaction; explicitly `ROLLBACK` before continuing. Investigate against the actual schema and repeat locally before retrying. Do not weaken a policy to make a failing test pass.
5. After the rollback-only run passes, run the same migration/test transaction with `COMMIT;`. Tests roll back their own fixtures, preserving only the repairs. Verify no test account remains and that anonymous private-table access is denied. Verify function owners, fixed search paths, explicit EXECUTE grants, protected-column behavior, disabled-user access, and all child ownership chains.
6. Verify Auth password change and two-user isolation through the public Auth/Data APIs with disposable accounts. Never use a service-role key for those access checks. The September 6 checks passed cross-user reads/writes/deletes/reassignment, private catalog publishing restrictions, workout retries and invalid-input preservation, reset bypass denial, real password change, disabled-user denial with an existing JWT, and sign-out refresh-token rejection. Access-token expiry, MFA, and the wider mobile/slow-network matrix remain separate work. Owner credential entry remains with the owner.
7. Only then merge/deploy the client changes and verify the actual signed-in workflow. The client calls `save_workout_session` and expects the Auth reset trigger; deploying it first would make workout saves fail and leave required-reset flows blocked. Confirm GitHub Tests, CodeQL, and Pages deployment for the resulting main commit.

Retain the previous schema privately for recovery, but prefer a reviewed forward fix to reinstalling exposed legacy policies. If an Auth trigger blocks legitimate changes, isolate its cause before a narrow correction. Gate future client releases on their database prerequisites.

## Manual API harness

`scripts/test-live-api.js` is an explicit manual tool, excluded from CI and the public artifact. It accepts a phase (`baseline`, `reset`, `disabled`, `signout`, or `removed`) and an absolute private fixture JSON path outside the repository. The file starts with `a` and `b` objects containing distinct disposable `security-api-YYYYMMDD-a@example.invalid` / `-b@example.invalid` emails and random passwords of at least 24 characters, plus a random `newPassword`. Create only these temporary Auth accounts, auto-confirmed without sending email, before `baseline`. The tool reads the ignored public `config.js`, rejects privileged keys, and stores test IDs/tokens only in that private file.

Run phases in order. Before `reset`, set only fixture A's reset flag through a reviewed privileged operation, checking its exact UUID and disposable email. Before `disabled`, similarly disable only A. After sign-out/browser verification, remove the exact fixtures and their synthetic dependent rows, then run `removed` to confirm both logins fail. Remove the private credential file afterward. Do not rerun `baseline` over existing fixture state or use personal accounts. Prefer a dedicated test project for future recurring checks.

## Auth settings and remaining work

Applied and verified: public self-signup disabled, email confirmation enabled, and secure email change enabled. The browser's invitation-only flag alone does not enforce signup policy. Existing production redirect URLs and refresh-token replay detection are correctly configured. Current-password verification is enabled and the repaired form supplies it.

Free-plan session limits and leaked-password protection cannot be enabled from the inspected controls. TOTP capability is available, but enrollment, challenge UI, and appropriate AAL2 enforcement need a coordinated implementation. Backup restoration remains untested. The anonymous and authenticated API checks described above passed; they are bounded checks, not an exhaustive certification.

New migrations must explicitly opt into table/RPC grants and revoke implicit `PUBLIC` EXECUTE on each new function. Migration 002 narrows the inspected `postgres` public-schema defaults; this does not globally remove PostgreSQL's implicit function EXECUTE default or govern every other creator role. Audit defaults whenever migration ownership or exposed schemas change.

Review existing template flags with the owner; do not silently turn potentially personal catalog rows into shared templates. Review global catalog uniqueness and same-day workout duplication before adding constraints. The atomic RPC serializes edits to one session but does not implement version-based conflict detection or deduplicate independent new-session IDs.
