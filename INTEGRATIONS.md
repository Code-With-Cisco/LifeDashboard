# Integration roadmap

See [ROADMAP.md](ROADMAP.md) for concrete milestones, acceptance criteria, platform limitations, and the next implementation order.

The end state is a private personal command center: one daily brief that combines commitments, goals, health signals, and the next best actions without giving every provider access to the whole dashboard.

## Architecture

```text
Google/iCloud calendars     Obsidian/GitHub   Apple activity     Finance providers
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
2. **Calendar.** Existing events span two Google accounts and iCloud. Start with [Google Calendar read-only scopes](https://developers.google.com/workspace/calendar/api/auth), explicit calendar selection, and source/freshness labels. Preserve iCloud events; first evaluate a private native bridge or a previewed export. Do not publish private calendar feeds. Recurrence, exceptions, timezones, overlapping events, deletions, and stable IDs need tests before sync is reliable.
3. **Tasks and notes.** Obsidian is the preferred source for selected project notes and tasks. Use a local bridge or bounded, previewed export of approved folders; do not expose the whole vault. GitHub follows for selected repositories and their issues, PRs, and build status. Todoist is optional if a dedicated task/reminder app becomes useful; Notion is not required. Record stable IDs and source versions before considering write-back.
4. **Activity.** Limit the initial Apple Watch scope to steps, standing hours, and calories burned. Distinguish active energy from total energy and missing readings from zero. Keep manual workout logging authoritative. [HealthKit consent](https://developer.apple.com/documentation/healthkit/protecting-user-privacy) requires a native companion or an explicit export; this static site cannot directly read the watch. Sleep and specialist endurance tools are outside the initial scope.
5. **Personal email and finance.** Three personal Gmail accounts are planned, followed by iCloud Mail only once its actual mailbox address is confirmed. Work Outlook is excluded. Gmail message access needs its own consent and production eligibility review. For finance, evaluate a read-only aggregator or private bank-file imports; no payment, transfer, or trading access. Keep all provider credentials on the server.
6. **Jarvis narration.** Send only the already-normalized daily summary to an AI service, not the complete database. Require explicit approval before it sends messages, changes events, creates tasks, or takes financial actions.

## Connector contract

Every connector should implement `connect`, `sync`, `status`, and `revoke`; declare its requested scopes; store a cursor for incremental sync; and write records tagged with `user_id`, provider, external ID, fetched time, and source timestamp. Make sync idempotent and surface stale or failed sources in the brief.

## Finance connection methods

[SimpleFIN Bridge](https://beta-bridge.simplefin.org/) is a candidate for a personal application: its protocol is read-only, its listed price is $1.50 plus tax monthly or $15 plus tax yearly, and the owner can revoke an app's access token. Verify the selected account types in its [institution directory](https://beta-bridge.simplefin.org/search-institutions) and during enrollment; a listing does not prove a successful live connection. Its [developer guide](https://beta-bridge.simplefin.org/info/developers) describes periodic updates, request limits, and institution-dependent history. Prices and limits checked September 6, 2026.

[Plaid Link and server APIs](https://plaid.com/docs/quickstart/) are an alternative after confirming production access, institution/product coverage, OAuth requirements, and cost. [Bank OAuth](https://plaid.com/docs/link/oauth/) keeps supported bank authorization at the bank. Do not assume a development sandbox can access real accounts.

CSV/OFX/QFX exports are the fallback without persistent provider access. They still need bounded parsing, explicit account mapping, date/currency validation, duplicate detection, and a preview before records change. No finance connector or file importer is implemented by this document.

## Guardrails

- Read before write; ask before acting.
- Separate data retrieval from any action-taking capability.
- Use per-user RLS and server-side authorization for every connector table.
- Keep an audit trail of external actions without storing sensitive payloads.
- Provide a single **Disconnect and delete imported data** control per provider.
- Show freshness and source beside every recommendation.
