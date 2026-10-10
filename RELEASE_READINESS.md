# October 10 readiness release

This checkpoint supersedes earlier readiness and migration status in the historical handoff/review notes. The owner authorized finishing the current readiness work, commits/pushes using Cisco attribution, and refreshing Graphify. The unrelated untracked Word document remains unpublished.

## Completed implementation

- Confirmed roadmap writes use the inspected `(user_id, step_number)` unique constraint and preserve drafts on failure. Lost-response retries compare canonical JSON and distinguish zero from null.
- Calendar import uses locked local `ical.js` 2.2.1. Bounded daily/weekly/monthly/yearly recurrence snapshots support exclusions, moved/cancelled occurrences and durations within the chosen window. Descriptions, locations, source timing, other event properties and alarms remain inert data. The editor retains source metadata. Unsupported rules/timezones, invitations and unsafe/oversized input fail clearly. This is a snapshot importer, not ongoing provider sync.
- Calendar migration 010 adds a bounded object-valued `source_details` field. Real Test and production rollback-only and committed transactions passed ownership/MFA checks while preserving existing public/Auth rows. Production inspection also confirmed connector migration 009. Migrations 001–010 are present; do not reapply them.
- Private broker/provider setup is ready, with names-only configuration diagnostics and a shared default-off `CONNECTORS_ENABLED` workflow variable. Credentials are not configured; live services remain disabled. Follow [CONNECTOR_SETUP.md](database/CONNECTOR_SETUP.md) before activation.
- The static allowlist packages 36 public files, including the locked parser and license. Tests, internal documents, Graphify, private backups and credentials remain excluded.

## Verification and limits

All **336 tests in 28 suites** and the build passed. Actual public-key LifeDashboard-Test checks passed 41 baseline assertions, 469 checks across 14 relational domains, and 45 personal-document/MFA checks. These exercised persistence, editing/deletion, ownership isolation, rejected operations, roadmap upserts, lost-response retry, encrypted document restore, revision conflicts, wrong authenticator codes, AAL1 denial, AAL2 access and factor removal. Six fresh-session/global sign-out/refresh checks passed. The real parser/Data API calendar workflow stored three expected recurrence snapshots with retained instructions, excluded/cancelled dates absent and duplicate reimport detected.

Chrome verified editable calendar instructions survive reload, invalid end times preserve the draft, corrected edits save and deletion is confirmed. Prior bounded account switching and 390px section-shell checks passed. Browser automation could not complete ICS selection because its extension lacks file access. Normal file selection, natural access-token expiry, broad device/form coverage and subjective daily usability remain owner acceptance checks in [TESTING.md](TESTING.md). No Auth expiry or browser security settings were weakened to speed testing.

Both disposable Test accounts were removed after the checks. Two subsequent sign-ins failed, and an independent query confirmed zero rows across all 27 public tables and Auth users. Private fixture credentials were deleted and the loopback preview stopped.

## Private recovery

The old DPAPI package was located and a fresh post-010 logical backup captured privately. A bounded isolated PostgreSQL restore matched **497 rows across 64 included tables**, plus public columns, constraints, indexes, functions, policies, triggers and grants. Empty Vault entries were omitted only from the local Windows restore; the original archive retains them. Role-membership grantors were adapted for the isolated operator. Temporary restore servers were stopped.

The portable recovery archive uses authenticated AES-256-GCM encryption with PBKDF2-HMAC-SHA256 at 600,000 iterations and includes a checksum-verified ZIP of the logical dump, schema/roles, inventory and restore reports. It was successfully decrypted and verified locally. Its random passphrase stays outside OneDrive/Git and must be saved independently in a password manager or offline recovery record.

The specifically prompted encrypted upload to private OneDrive folder **LifeDashboard Backups** is pending approval. Automatic approval review rejected the export because the full Auth/application payload had not been specifically approved for that destination. Do not claim off-device recovery is complete until the copy and online availability are verified. A complete managed-Supabase service restore, project settings, external/provider keys, role passwords and future Storage file bytes remain separate operational recovery checks.

Browser Data & backups covers selected personal documents only; it excludes Auth and the relational calendar/finance/workout data. Never publish raw backup, credential, fingerprint or production audit files.

## Next

The local source map is refreshed: 1,018 nodes, 1,634 edges and 128 communities. Read its [current checkpoint](graphify-out/memory/query_20261010_release_readiness.md); retained historical document annotations require source verification. Use the owner checklist for adjustments after release verification. Later roadmap features remain deferred. Live provider activation depends on private credentials and its acceptance gates; independent backup upload depends on its specific approval. Those operational items do not prevent testing the existing sections.
