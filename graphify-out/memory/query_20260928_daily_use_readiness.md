---
type: "query"
date: "2026-09-28"
question: "What changed in the cross-domain daily-use readiness pass?"
outcome: "useful"
source_nodes: ["User Actions and Mutations", "Life Management UI", "Safe Static Build", "Authentication and Profiles"]
---

# Daily-use readiness checkpoint

The owner prioritized all existing sections equally. Start with `HANDOFF.md`; it distinguishes local changes, verification, and unfinished release gates. No personal plan/export belongs in this map or public repository.

Source-verified navigation pointers:

- `data-operations.js` → `DataOperations.create()` → session-bound `run()` / `reset()`; in-memory retry IDs and stage confirmations.
- `api.js` → `API.records.write()` → owner-scoped inserts, updates, deletes, and readback for ambiguous insert retries.
- `app.js` → `writeRecord()`, `readSection()`, `getNutritionTargets()` → active weight/nutrition/finance/reading/recipe/calendar/workout-plan actions. `clearPrivateSession()` resets writes and calendar preview state.
- `services/CalendarImportService.js` → explicit-event parsing, timezone/date validation, normalized fingerprints and classification.
- `calendar-import.js` → read-only preview, details acknowledgment, stable per-owner IDs, batch import, partial-failure handling.
- `api.js` → `API.calendarImport` → paginated owner-scoped reads and confirmed inserts.
- `index.html`, `scripts/build-static.js` → runtime load order and public allowlist.
- `test/DataOperations.test.js`, `test/CalendarImportService.test.js`, `test/AppSecurity.test.js` → retry, failure, session, parser and active UI regression behavior.

The old `parseICS()` and `importICS()` in `app.js` were removed and replaced by the two calendar import modules. Older staged implementations elsewhere still exist, so locate the final active path rather than relying on old line numbers.

The structural code graph was rebuilt with official Graphify 0.9.71 using `graphify update .`, with no LLM/API backend. Older semantic/document annotations remain and SQL files were skipped because `tree_sitter_sql` is absent. This memory supplements those older annotations with source-verified changes. Consult `HANDOFF.md` for the 236-test checkpoint, browser coverage, transfer package, and unresolved live verification gates.

Additional active paths: `detectAndSaveTimezone()` now confirms its write; `renderDash()` stops on session changes; `retryRecipes()` reloads a failed catalog; empty recipes/goals show creation controls; `.financial-lists` stacks at mobile widths. Legacy hard-coded monthly milestones and older status writers remain review items.

Final code-map checkpoint: **721 nodes, 1,246 edges, 69 communities**. `graphify diagnose multigraph` reported zero dangling/missing endpoints, zero exact duplicates, and no post-build error. Nine self-loops were retained; the diagnostic is structural validation, not evidence that all behaviors or document annotations are correct.
