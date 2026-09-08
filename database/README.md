# Database verification and deployment

Status, September 8: **migrations 001–006 are applied in production** with the owner's approval. Public signup is disabled, email confirmation enabled, and secure email change enabled. Raw production audit output and personal rows are not included here. `security-audit.sql` remains a read-only inventory tool.

Migration 001 passed its cross-user tests before and during commit. The remaining three migrations then passed all four SQL suites in a rollback-only transaction and again in the committed transaction. Internal fingerprints verified that every pre-existing public-table and Auth user record was unchanged. SQL fixtures were rolled back. Post-commit checks confirmed 25 tables with RLS, 44 policies, no anonymous table/column grants, six functions with fixed search paths and restricted execution, and the three intended triggers. Independent zero-row Data API requests to all 25 tables returned HTTP 401 / PostgreSQL 42501. The authorization/schema baselines were preserved privately outside Git; they are not a full database backup or a restore drill.

The existing account was confirmed and enabled when checked after the Auth change. No active application administrator profile exists; migration 001 preserved that pre-existing state. Administrator behavior was verified with a disposable fixture, not by promoting the owner's account. Any future administrator bootstrap must explicitly identify and approve its target account.

## Reviewed repair order

| Migration | Status | Effect | Matching test |
|---|---|---|---|
| `20260905_001_profile_authorization.sql` | Applied | Removes unrestricted profile reads; limits grants; protects role, disabled status, and profile ownership | `tests/profile_authorization.sql` |
| `20260905_002_data_isolation.sql` | Applied | Restricts private tables/catalogs and child records; blocks disabled accounts; fixes meal counter ownership; narrows audit/default grants | `tests/data_isolation.sql` |
| `20260905_003_atomic_workout_save.sql` | Applied | Adds an invoker RPC for transactional session, set, and legacy-history replacement with bounded inputs and stable-ID retries | `tests/atomic_workout_save.sql` |
| `20260905_004_password_reset_guard.sql` | Applied | Protects the reset flag; restricts data until reset; clears the flag after Auth updates the password | `tests/password_reset_guard.sql` |
| `20260906_005_personal_documents.sql` | Applied | Adds owner-only personal records and atomic revision-checked saves | `tests/personal_documents.sql` (with 006) |
| `20260908_006_document_conflict_response.sql` | Applied | Returns HTTP 409 promptly for stale document revisions | `tests/personal_documents.sql` |

No migration deletes or rewrites existing personal rows. Migration 002 changes defaults for future catalog records; it preserves existing template flags. Migration 004 installs an `auth.users` trigger based on the inspected `encrypted_password` column. The real Auth password-change flow passed using a disposable account: incorrect current passwords were rejected, the reset flag remained set after rejection, and a successful change cleared the flag and restored data access. Do not edit a real account's password or hash in SQL.

## Local verification

### Personal-record storage (005–006)

Migrations 005 and 006 are deployed. The inspected live 005 function matched the reviewed source before 006. Both migrations passed rollback-only checks against the restored production schema and the live database before commit. The committed transactions repeated the ownership, restricted-account, conflict, atomic-batch, and record-preservation checks. Migration 006 preserved the function owner, invoker security, fixed search path, grants, and RLS policy.

The migration adds owner-only documents for four fixed record types and month-scoped purchase decisions. It revokes anonymous access and protected-column writes. An invoker RPC checks expected revisions and makes a selected migration/restore batch atomic; stale writes fail without replacing newer data. Direct authorized payload updates also increment the revision through a trigger. Nested document validation is performed by the client service; database constraints bound key, JSON type, and size. The table is not a general secret/token store.

`node scripts/prepare-personal-data.js` generates the 005–006 transaction, owner/disabled/reset/conflict tests, existing-row fingerprints, and a final rollback. For a database with only 005 applied, use `--from=006`. It never connects or runs SQL. After a private restorable backup is verified, test that transaction against the real schema before using `--commit`. Reapplication fails closed. Do not rerun it on the already-repaired production database.

`scripts/test-personal-data.js` exercises fresh 005–006 and existing 005 → 006 rollback/commit transactions in PostgreSQL through PGlite. It verifies existing synthetic profiles and documents survive unchanged, fixtures are removed, and a repeated repair fails closed. Live SQL and public Auth/Data API verification remain separate release gates.

Live API checks exposed a stale-save timeout when the old function raised PostgreSQL `40001`. Migration 006 uses `PT409`, mapped to HTTP 409 by [PostgREST custom errors](https://docs.postgrest.org/en/stable/references/errors.html#raise-errors-with-http-status-codes). Older retry behavior is documented in [PostgREST #4222](https://github.com/PostgREST/postgrest/pull/4222). The client recognizes both codes. Concurrent public API saves now produce exactly one successful revision and one HTTP 409. Conflicting batches roll back an earlier successful document update as well.

### Private recovery verification

A logical PostgreSQL backup was captured before 005, including all 59 source tables, Auth data, and role/schema metadata. An isolated PostgreSQL 17 restore verified all 475 rows across the 58 included tables, plus application ownership, grants, policies, functions, and triggers. The omitted Vault table was empty; its Supabase extension is unavailable in the Windows test distribution. The original archive retains it. Local role-membership grantors were adapted to the isolated restore operator. Migration tests use the restored `postgres` session identity to match production's authorization behavior.

The recovery package is encrypted with Windows DPAPI CurrentUser and its decrypted checksum was verified again on September 8. All backup files, fingerprints, credentials, and raw audit output stay outside Git and the static artifact. Recovery currently depends on this Windows account and its DPAPI keys; an independent encrypted off-device copy and a full managed-Supabase recovery drill remain pending. Storage had no buckets or objects; project settings, external encryption keys, role passwords, and future Storage file bytes need separate recovery arrangements.

The browser's encrypted backup covers goals, habit definitions, custom ingredients, and purchase decisions only. It excludes existing finance tables, calendar, recipes, workout history, Auth records, and Storage files. It is not disaster recovery for the whole project. Original browser records remain on the originating device after previewed migration; replacements are unchecked by default. Restore is account/project-bound and rejects unsupported versions, oversized files, malformed records, or failed decryption.

The version 1 envelope uses browser Web Crypto AES-256-GCM with a random 16-byte salt, 12-byte IV, and PBKDF2-HMAC-SHA256 at 600,000 iterations. The fixed work factor follows the current [OWASP PBKDF2 recommendation](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2) as a password-guessing cost baseline; it is not a claim of FIPS certification. The passphrase never goes to Supabase. A future format/work-factor change needs an explicit reader migration so existing exported files remain usable. The minimum length is not a measure of passphrase entropy; use a unique passphrase and keep it separately.

### Existing security repair tests

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

### Personal-record API harness

`scripts/test-live-personal-data.js` is manual-only and excluded from CI and `dist`. It accepts `baseline`, `blocked`, `reenabled`, or `removed` and an absolute private fixture JSON path outside the repository. The fixture includes the configured `projectUrl` plus `a` and `b` with distinct UUIDs, `personal-api-YYYYMMDD-a@example.invalid` / `-b@example.invalid` addresses, and random passwords of at least 24 characters. Precreate only these disposable Auth accounts without sending email. The harness uses the public API key and real user sessions.

Run phases in order. Before `blocked`, set only fixture A's reset flag and B's disabled flag, guarded by exact IDs and disposable emails. Before `reenabled`, clear those fixture flags. Remove exact fixture users and dependent synthetic rows before `removed`. Never rerun `baseline` over partially completed fixtures. A hidden disabled profile may return HTTP 200 with zero updated rows; the harness also verifies its RPC remains denied after attempted self-enable. The batch-conflict case updates an earlier sorted key before conflicting on a later key to prove rollback.

September 8: all 66 public Auth/Data API assertions passed. A separate Chrome check served the production build from loopback with a disposable account against the live API: stale-preview feedback and draft preservation, replacement opt-in, reviewed migration, persistence after reload, and sign-out cleanup passed. All test accounts were removed; every pre-existing public-table and Auth user fingerprint matched the pre-test baseline. These checks do not establish a separate persistent test project or full production-origin browser coverage.

## Auth settings and remaining work

Applied and verified: public self-signup disabled, email confirmation enabled, and secure email change enabled. The browser's invitation-only flag alone does not enforce signup policy. Existing production redirect URLs and refresh-token replay detection are correctly configured. Current-password verification is enabled and the repaired form supplies it.

Free-plan session limits and leaked-password protection cannot be enabled from the inspected controls. TOTP capability is available, but enrollment, challenge UI, and appropriate AAL2 enforcement need a coordinated implementation. Local logical-backup restoration passed within the scope above; off-device and full managed-service recovery remain pending. The anonymous and authenticated API checks described above passed; they are bounded checks, not an exhaustive certification.

New migrations must explicitly opt into table/RPC grants and revoke implicit `PUBLIC` EXECUTE on each new function. Migration 002 narrows the inspected `postgres` public-schema defaults; this does not globally remove PostgreSQL's implicit function EXECUTE default or govern every other creator role. Audit defaults whenever migration ownership or exposed schemas change.

Review existing template flags with the owner; do not silently turn potentially personal catalog rows into shared templates. Review global catalog uniqueness and same-day workout duplication before adding constraints. The atomic RPC serializes edits to one session but does not implement version-based conflict detection or deduplicate independent new-session IDs.
