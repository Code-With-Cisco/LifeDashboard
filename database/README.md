# Database verification

No production schema or policy snapshot was available during the September 4 review. The owner could not sign in to Supabase. The checked-in SQL is an inventory tool, not a migration or a claim that the database is secure.

Run `security-audit.sql` in the Supabase SQL editor after access is restored. Keep its output private until reviewed. Export a schema-only baseline, review it for secrets and personal seed data, and then commit reproducible migrations.

Before adding sensitive records or external connectors, verify:

1. Anonymous callers cannot read or mutate private tables. Intentionally shared catalogs are explicitly identified.
2. Two disposable authenticated test users cannot select, update, delete, or reassign one another's rows. Test through the public API with their user tokens, never a service key.
3. Private child records, especially `workout_exercise_logs`, authorize through the owning parent session. Foreign keys alone do not provide authorization.
4. Normal profile edits cannot change `role`, `is_disabled`, or administrator-controlled security flags. A policy allowing users to update their own profile does not protect individual columns. Use column grants, a trusted trigger, or a narrow authorized function.
5. Recipe, meal, book, and workout template write permissions are restricted. Readable shared templates must not become writable by every account.
6. Every exposed RPC verifies its caller, bounds inputs, fixes `search_path` where applicable, and grants execution narrowly. Review `increment_meal_usage` and any privileged functions found in the inventory.
7. Self-signup is disabled in Supabase itself when invitation-only access is intended. The browser flag is presentation, not enforcement. Check redirects, email confirmation, password protection, session policy, MFA, and backup restoration.

Run cross-user tests on a separate test project first. Version the expected checks and results with the reviewed schema; the current unit tests do not verify these properties.
