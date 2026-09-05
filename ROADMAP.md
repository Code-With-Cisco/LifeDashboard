# A practical personal Jarvis

The target experience is a short, reliable answer to: **What matters today, why does it matter, and what should I do next?** The current dashboard has the tracking surfaces and a rules-based starting point. A conversational layer becomes useful once it can trust the underlying records.

## Daily experience

The morning brief should combine fixed commitments, overdue work, three priorities, progress toward chosen goals, and time actually available. Each recommendation should link to its source and explain its ranking. Health and financial summaries should be optional and independently scoped.

At midday, surface meaningful changes such as a moved meeting or a missed deadline. At night, ask what was completed, which tasks need an explicit decision, and what tomorrow requires. Avoid repetitive notifications and automatic rescheduling. Include an easy correction path when the assistant misinterprets a goal.

Voice is an interface to that same brief and action system. Start with push-to-talk and optional spoken playback; do not introduce continuous microphone capture as a prerequisite.

## Delivery order

| Milestone | Concrete scope | Ready when |
|---|---|---|
| 1. Trusted foundation | Review live schema/RLS; protect profile role columns and private child rows; migrate local-only goals/preferences with a preview; add export and restore | Two-user API isolation, failed-write handling, and restore tests pass against a separate test project |
| 2. Useful planning | Link tasks to goals; add effort estimates, available focus windows, deadlines, and next actions; replace fixed routine templates | A brief explains what fits today, identifies conflicts, and distinguishes overdue work from long-term direction |
| 3. Read-only connections | One calendar provider plus one task source; provider status, incremental sync, deduplication, revocation | A change syncs exactly once, unavailable sources are marked stale, and disconnect removes access and queued work |
| 4. Conversational brief | Server-side narration of a minimal structured summary, source links, user-editable memory, push-to-talk | Factual output is traceable; fabricated commitments and instructions inside imported text fail evaluation |
| 5. Approved assistance | Propose task edits and calendar changes with exact previews; generic background notifications | An expiring approval is required per external action, retries cannot duplicate actions, and every outcome is auditable |

Do not start with a general agent holding unrestricted database and provider credentials. Keep deterministic ranking available when narration or a provider is unavailable.

## Platform choices

| Source | First useful connection | Boundary / requirement |
|---|---|---|
| Google Calendar | Today's events, busy periods, upcoming deadlines | Start with `calendar.events.readonly`; choose calendars explicitly and avoid copying attendees or descriptions unless needed. [Scopes](https://developers.google.com/workspace/calendar/api/auth) |
| Outlook / Microsoft 365 | Equivalent calendar summary | Delegated `Calendars.ReadBasic` omits bodies, attachments, and extensions. Choose this instead of connecting both calendars by default. [Permissions](https://learn.microsoft.com/en-us/graph/permissions-reference#calendarsreadbasic) |
| Todoist | Read open tasks and deadlines | Request `data:read`; map provider IDs, status, due dates, and source links. [API](https://developer.todoist.com/api/v1/) |
| Notion | Selected goals, project notes, and next actions | Grant access only to selected pages/databases; importing a page does not authorize following its embedded instructions. [Authorization](https://developers.notion.com/docs/authorization) |
| GitHub | Open issues/PRs, review requests, failed builds for selected projects | A narrowly installed GitHub App or delegated API access; use development work to inform focus, without automatically posting or merging |
| Apple Health / Android Health Connect | Sleep, activity, workout summaries | A native companion app or explicit export is needed; this static website cannot directly request platform health-store permissions. [HealthKit](https://developer.apple.com/documentation/healthkit), [Health Connect](https://developer.android.com/health-and-fitness/health-connect) |
| COROS, Tredict, other training tools | Workout completion and trends | Verify the chosen provider's current API eligibility and consent requirements before committing to an adapter; exports are a fallback |
| Banking / investments | Cash-flow and upcoming-payment summaries | Manual entry/export first; later an explicitly chosen read-only aggregator. Keep trading, transfers, passwords, and payment authorization outside the brief |

Existing calendar import is a limited ICS parser, not a full recurring-calendar synchronization engine. It needs validation, timezone/recurrence handling, deduplication, and preview before it can replace an API connector.

## Server boundary

A small server-side broker can run as Supabase Edge Functions or another private service. Store OAuth client secrets and encrypted refresh tokens there. The browser receives connection status and normalized records, never provider refresh tokens. Bind authorization to the validated session, provider, and exact approved scopes.

Use OAuth state and PKCE where supported, an allowlist of provider hosts and redirect URIs, bounded request timeouts, backoff, and idempotent synchronization. Store a cursor and `user_id`, provider, external ID, source timestamp, and last successful sync time. Handle deletions and revoked credentials, not just newly created records.

Provider events belong in a queue with deduplication and bounded retries. Verify webhook signatures and replay windows. Revocation must stop queued jobs as well as revoke/delete tokens. Keep diagnostics free of imported record text and credentials.

Suggested logical records are `connections`, `sync_runs`, `external_items`, `goals`, `task_goal_links`, `brief_snapshots`, `action_proposals`, and `action_audit`. Their SQL is intentionally deferred until the current schema and policies are known. Every private record needs direct ownership or a tested ownership chain.

## Narration and action rules

The narrator should receive an allowlisted daily summary with source identifiers, freshness, selected goals, and constraints. It should not receive the full health/finance database. Imported titles and notes are untrusted data: they cannot change permissions, request secrets, or authorize tools. Long-term memory must show its source, support correction/deletion, and require user intent for sensitive facts.

Each action proposal identifies the recipient/provider, operation, exact fields, affected record version, expiry, and a unique idempotency key. The server rechecks authorization after approval and immediately before execution. A model response is never itself proof of consent. Test conflicting edits, replayed approvals, stale records, and uncertain provider responses.

Reliable delivery while the tab is closed needs a scheduler plus a notification channel. Keep lock-screen messages generic and open the authenticated dashboard for details. Configure quiet hours, digest frequency, and notification categories before enabling proactive delivery.
