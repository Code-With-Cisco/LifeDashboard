# Integration roadmap

The end state is a private personal command center: one daily brief that combines commitments, goals, health signals, and the next best actions without giving every provider access to the whole dashboard.

## Architecture

```text
Google/Microsoft calendars   Task providers   Health providers   Finance providers
            |                    |                  |                   |
            +--------------------+------------------+-------------------+
                                      |
                         Server-side connector broker
                    OAuth, token vault, normalization, sync jobs
                                      |
                       Supabase user-scoped integration tables
                                      |
                       Deterministic BriefingService baseline
                                      |
                    Optional AI narration over a minimal summary
```

Never connect provider OAuth or long-lived refresh tokens directly from this static client. The broker should request the smallest read-only scopes first, encrypt refresh tokens, record consent, support revocation, and normalize only the fields the brief needs.

## Recommended phases

1. **Daily command brief (implemented).** Rank open tasks, today's calendar, habit progress, and the planned workout locally. Users can choose a balanced, deadline-first, or priority-first rule; set the focus count and sources; and opt into a generic morning browser reminder. The reminder works only while the dashboard is open, so reliable background delivery remains broker work.
2. **Calendar.** Start with [Google Calendar's read-only event scope](https://developers.google.com/workspace/calendar/api/auth) and Microsoft Graph's delegated `Calendars.ReadBasic` or `Calendars.Read` permission. Keep ICS import as the no-account fallback. Normalize to title, time, source, and private/busy visibility.
3. **Tasks and notes.** Connect [Todoist with its `data:read` OAuth scope](https://developer.todoist.com/api/v1/) or a granular read-only [Notion integration](https://www.notion.com/help/create-integrations-with-the-notion-api); add TickTick, Trello, or Asana through the same adapter contract. Sync title, status, due date, priority, source URL, and last-modified time.
4. **Health and training.** Prefer [Apple HealthKit's per-data-type consent](https://developer.apple.com/documentation/healthkit/protecting-user-privacy), [Android Health Connect's user-managed permissions](https://developer.android.com/health-and-fitness/health-connect/ui/permissions), or COROS/Tredict exports and consented APIs. Summaries should use aggregates such as sleep duration, readiness, workout completion, and trend—not raw medical records unless explicitly needed.
5. **Finance.** Keep manual tracking until a server-side, read-only aggregation provider is chosen. Never expose brokerage credentials or trading permissions to the dashboard client.
6. **Jarvis narration.** Send only the already-normalized daily summary to an AI service, not the complete database. Require explicit approval before it sends messages, changes events, creates tasks, or takes financial actions.

## Connector contract

Every connector should implement `connect`, `sync`, `status`, and `revoke`; declare its requested scopes; store a cursor for incremental sync; and write records tagged with `user_id`, provider, external ID, fetched time, and source timestamp. Make sync idempotent and surface stale or failed sources in the brief.

## Guardrails

- Read before write; ask before acting.
- Separate data retrieval from any action-taking capability.
- Use per-user RLS and server-side authorization for every connector table.
- Keep an audit trail of external actions without storing sensitive payloads.
- Provide a single **Disconnect and delete imported data** control per provider.
- Show freshness and source beside every recommendation.
