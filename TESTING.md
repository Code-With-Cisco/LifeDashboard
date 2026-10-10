# Owner testing checklist

The October 10 readiness implementation is ready for hands-on testing. Start at [Life Dashboard](https://code-with-cisco.github.io/LifeDashboard/). Use small, clearly labelled test records and keep original calendar files and backup passphrases private. Later roadmap features and live provider activation are outside this release.

For an issue, record the section, steps, expected result, actual result, browser/device, and whether reloading changes it. Screenshots should omit private records, passwords and authenticator codes.

## Daily sections

Open all twelve sections: Home, Dashboard, Habits, Workout, Nutrition, Schedule, Recipes, Reading, Financial, Goals, Is It Worth It?, and To Do List. Check empty states and existing records. Create a small record, reload, edit it, reload again, and delete only that test record where the section supports deletion. Check zero amounts/reps and short notes as well as ordinary values.

Check task completion, goal links, habit completion/history, workout sets, meal logging/custom ingredients, recipe saves, reading progress, bills/debts/subscriptions, roadmap step status, and purchase decisions. Confirm Home and Dashboard reflect the underlying changes. A failed save should preserve the draft and display an error; a retry should produce one record. A failed read should show unavailable data rather than pretend there are no records.

## Calendar and training instructions

Create an event with start/end times, description and location. Reload and reopen it. An end before the start must preserve the draft and show an error. Check all-day events and events around month/year boundaries.

Use the normal file picker to select a small ICS file. Review the date window, preview, instructions and private-detail acknowledgement before saving. Try daily/weekly/monthly/yearly recurrence, an excluded date and a moved or cancelled occurrence. Importing the same file again should identify duplicates; changed occurrences should require conflict review. Recurrence becomes individual snapshots within the chosen window. It does not keep synchronizing with the original calendar.

Descriptions, locations, source timing, other event properties and reminder definitions are retained as inert data. Imported reminders do not send notifications, and attachment/link references are not fetched. Unsupported recurrence, custom timezones, invitation/cancellation files, ambiguous DST times and oversized input should be rejected clearly. Keep the original ICS for events outside the chosen window and unsupported data.

The automated parser and actual Data API snapshot checks passed. Chrome's automation extension blocked file upload without additional file-access permission; the normal picker interaction remains a hands-on check.

## Sessions, MFA and mobile

Sign out and sign back in; private screens and drafts must clear. If you use a second account, its data must be separate. Leave the app open long enough for a real access token to expire, then reload and try a save. Refresh should retain a valid session; an invalid session must ask for sign-in without submitting another account's draft. Natural expiry remains a hands-on acceptance check; no Auth expiry settings were weakened to speed testing.

Under Profile → Account security, test your own authenticator only after securing a second authenticator or setup key separately. Confirm a new password-only sign-in requires the code. Never share codes or setup keys in an issue. Live disposable-account enrollment, wrong-code rejection, AAL1 denial, verified AAL2 access and factor removal have passed.

On your phone, check navigation, populated cards, forms, calendar preview, scrolling and keyboard behavior. Prior 390px section-shell checks passed; this does not certify every populated form or device.

## Backups and connections

Data & backups exports a limited set of personal documents, not the entire database. Verify an encrypted export with a separately kept passphrase; preview restoration before selecting replacements. Goals, habit definitions, ingredients, purchase decisions and focus windows are covered; Auth, finance tables, calendar, workouts and other relational records require the private project recovery package.

A fresh private project archive passed a bounded local PostgreSQL restore and portable encryption verification. Its OneDrive upload still requires the specifically prompted approval, and its passphrase must be saved outside OneDrive. A complete managed-Supabase restore, project settings, provider keys and future Storage file bytes are separate operational checks.

Connections remain disabled until the private broker and provider apps are configured and their live acceptance checks pass. Follow [CONNECTOR_SETUP.md](database/CONNECTOR_SETUP.md). Do not put credentials in the browser or Git. Google Calendar/GitHub connection, selected Obsidian imports and narration are setup-ready; they are not claimed as live services.
