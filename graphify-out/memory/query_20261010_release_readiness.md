---
type: "query"
date: "2026-10-10"
question: "What is the current standing after readiness implementation?"
outcome: "useful"
contributor: "Cisco"
---

# Current readiness standing

Read `RELEASE_READINESS.md` and `TESTING.md` first. They supersede historical pending-work notes. Current source was reviewed alongside the map.

The installed Graphify 0.9.52 runtime extracted 116 code files locally with `extract . --code-only --no-cluster --max-workers 2`, then `cluster-only . --no-label` refreshed all three deliverables. Final map: **1,018 nodes, 1,634 edges, 128 communities**. The extraction initially reported 1,711 relationships before clustering normalized the undirected graph. No source was sent to a hosted model and no LLM labeling was run. Retained semantic/document annotations and some community labels may predate this release; use current source and this checkpoint. SQL files were inventoried; structural extraction is not a database permission proof.

Current navigation:

- `services/CalendarImportService.js` and `calendar-import.js`: bounded recurrence expansion, exceptions, inert instructions/metadata, date-window preview and duplicate/conflict handling.
- `app.js`: active `saveRoadmap`, `openEventModal`, `saveEvent`, `clearPrivateSession`; confirmed owner writes, preserved metadata and cleared private drafts.
- `api.js`: canonical JSON retry comparison and calendar `source_details` reads.
- Migration `database/migrations/20261010_010_calendar_details.sql`, `database/tests/calendar_details.sql` and `scripts/prepare-calendar.js`: real-schema-reviewed additive details column and rollback/commit preservation gates. Both projects have migrations 001–010.
- `scripts/test-live-readiness.js`, `scripts/test-live-security-readiness.js`, `scripts/test-live-calendar.js`: explicit private-fixture Test-only acceptance harnesses, excluded from CI/dist. Current run passed 469 relational checks, 45 document/MFA checks and the synthetic recurrence storage workflow; disposable fixtures were removed.
- `scripts/recovery-archive.js` and `test/RecoveryArchive.test.js`: locally verified portable project-archive encryption. Private restore verified 497 rows across 64 included tables and public security metadata. Specifically prompted OneDrive upload approval remains pending; full managed-service recovery is not certified.
- `supabase/functions/dashboard-connectors/configuration.mjs`, `scripts/check-connector-config.mjs` and `database/CONNECTOR_SETUP.md`: setup-ready private broker, safe configuration diagnostics and default-disabled activation gates.

336 tests across 28 suites, the 36-file static build and the complete dependency audit passed. Owner testing covers normal ICS file selection, natural session expiry, broad device/form coverage and daily usability. Later roadmap features are deferred. All authorship stays with Cisco; private backup/credential/audit files and the unrelated Word document are excluded.
