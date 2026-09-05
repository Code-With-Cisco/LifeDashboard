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
| Personal Gmail | Actionable personal messages, follow-ups, and deadlines | Personal account only; work Outlook is excluded. Use read-only OAuth and a server broker. Start with selected labels and a short retention window; filtering stored messages does not narrow the token's mailbox-wide permission. Never request send/modify access for a reading feature. [Scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) |
| Existing iPhone calendar | Today's events, busy periods, upcoming deadlines | First identify each personal calendar's account in iPhone Calendar and the default calendar setting. The app can aggregate Google and iCloud; its presence on iPhone does not establish where it is stored. Preserve events and calendar IDs. [Apple account settings](https://support.apple.com/guide/iphone/change-calendar-settings-iphc37be2016/ios) |
| Google Calendar, if it holds the selected calendars | Read-only synchronization while continuing to use iPhone Calendar | Start with `calendar.events.readonly`; choose calendars explicitly and avoid copying attendees or descriptions unless needed. If events are in iCloud, evaluate a private native bridge or a previewed export/import before choosing a migration. Do not publish a private calendar feed. [Scopes](https://developers.google.com/workspace/calendar/api/auth) |
| Obsidian | Preferred candidate for personal goals, project notes, and tasks | Use selected Markdown folders and explicit task metadata. A local bridge or selected export sends only approved records to the server; the public site receives no whole-vault access. Treat it as an integration to build, not an existing connection |
| Todoist | Optional alternative if task capture/reminders in Obsidian feel cumbersome | Evaluate only after trying the chosen Obsidian workflow. Choose one authoritative task source to prevent duplicates; Notion is not required. [API](https://developer.todoist.com/api/v1/) |
| GitHub | Open issues/PRs, review requests, failed builds for selected projects | A narrowly installed GitHub App or delegated API access; use development work to inform focus, without automatically posting or merging |
| Manual workout logging | Primary record of exercises, sets, reps, weights, duration, and notes | Make saves atomic and retries safe first. Later add personal progression summaries from recorded sessions and optional effort ratings. Preserve corrections and identify manually entered records |
| Apple Watch / Apple Health | Optional daytime activity and recorded workout trends | No sleep tracking is assumed because the watch is not worn overnight. Missing measurements mean unavailable, not zero. Accuracy depends on metric and use; do not treat estimates as exact calorie or recovery targets. A native companion or explicit export is needed for HealthKit permissions. [HealthKit](https://developer.apple.com/documentation/healthkit) |
| COROS / Tredict | Deferred, optional endurance training analysis | These tools help plan running/cycling sessions and analyze recorded efforts and training load. They are unnecessary for the initial manual strength-training workflow. Revisit only if structured endurance training becomes a goal. [Tredict introduction](https://www.tredict.com/glossary/introduction/) |
| Banking / investments | Cash-flow and upcoming-payment summaries | Manual entry/export first; later an explicitly chosen read-only aggregator. Keep trading, transfers, passwords, and payment authorization outside the brief |

Existing calendar import is a limited ICS parser, not a full recurring-calendar synchronization engine. It needs validation, timezone/recurrence handling, deduplication, and preview before it can replace an API connector.

## Obsidian's role

Obsidian can cover personal notes and much of task management. The optional Tasks community plugin supports due dates, recurring tasks, filters, and updating the original task from a query view. That makes Obsidian a reasonable substitute for the proposed Notion and Todoist combination for this personal workflow, with setup work. Reliable reminders, background delivery, scheduling, and provider synchronization still need an explicit design; a task checkbox is not a scheduled notification. [Tasks guide](https://publish.obsidian.md/tasks/Introduction)

Start with goals, projects, and tasks in selected vault folders. Give each goal/task a stable ID, status, due date, priority, optional effort estimate, and source link. Obsidian remains authoritative for those records; Dashboard initially reads them and presents suggested next actions. Separate scheduled calendar commitments from unscheduled tasks. Later approved write-back must check the source version and preview the exact file/task change.

Keep the vault private and independent of the public application repository. A future desktop bridge should resolve allowed paths, reject symlinks outside those folders, bound file sizes, exclude attachments and secret files, and authenticate to the private broker. It should never expose an unauthenticated local REST endpoint. Synchronization between phone and desktop is a separate choice, and the brief must show when the bridge last ran.

Start without community plugins, then review any specific plugin needed for recurring tasks. Obsidian plugins inherit broad application access, including files and network access; a small data-sharing selection inside Dashboard cannot constrain a plugin installed inside Obsidian. [Plugin security](https://obsidian.md/help/plugin-security)

## First connected version

After database repairs are verified, build the server connection boundary and one read-only personal calendar adapter. Add selected Obsidian goals/tasks next, then selected GitHub repositories. Personal Gmail comes after these narrower sources because message access is more sensitive and OAuth verification/assessment requirements need checking for the intended deployment. Finance begins with manual records or a previewed export; select a read-only provider only after confirming institution coverage and retention requirements.

The first useful spoken brief should answer: what is fixed on the calendar, which three next actions advance chosen goals, how much focus time remains, and whether a planned workout fits. Each item must distinguish a confirmed record from a suggestion and name unavailable sources. No connector, wearable purchase, vault migration, or calendar transfer is implied by this roadmap.

## Server boundary

A small server-side broker can run as Supabase Edge Functions or another private service. Store OAuth client secrets and encrypted refresh tokens there. The browser receives connection status and normalized records, never provider refresh tokens. Bind authorization to the validated session, provider, and exact approved scopes.

Use OAuth state and PKCE where supported, an allowlist of provider hosts and redirect URIs, bounded request timeouts, backoff, and idempotent synchronization. Store a cursor and `user_id`, provider, external ID, source timestamp, and last successful sync time. Handle deletions and revoked credentials, not just newly created records.

Provider events belong in a queue with deduplication and bounded retries. Verify webhook signatures and replay windows. Revocation must stop queued jobs as well as revoke/delete tokens. Keep diagnostics free of imported record text and credentials.

Suggested logical records are `connections`, `sync_runs`, `external_items`, `goals`, `task_goal_links`, `brief_snapshots`, `action_proposals`, and `action_audit`. Their SQL is intentionally deferred until the current schema and policies are known. Every private record needs direct ownership or a tested ownership chain.

## Narration and action rules

The narrator should receive an allowlisted daily summary with source identifiers, freshness, selected goals, and constraints. It should not receive the full health/finance database. Imported titles and notes are untrusted data: they cannot change permissions, request secrets, or authorize tools. Long-term memory must show its source, support correction/deletion, and require user intent for sensitive facts.

Each action proposal identifies the recipient/provider, operation, exact fields, affected record version, expiry, and a unique idempotency key. The server rechecks authorization after approval and immediately before execution. A model response is never itself proof of consent. Test conflicting edits, replayed approvals, stale records, and uncertain provider responses.

Reliable delivery while the tab is closed needs a scheduler plus a notification channel. Keep lock-screen messages generic and open the authenticated dashboard for details. Configure quiet hours, digest frequency, and notification categories before enabling proactive delivery.
