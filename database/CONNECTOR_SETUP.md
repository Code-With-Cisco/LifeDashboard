# Private connector setup

Connections are implemented and disabled by default. No provider app or private
broker credential is configured by this release. Setup is separate from ordinary
Dashboard testing; the existing sections work without it.

1. Confirm migration 009 exists in the intended backend and its broker-only grants
   match `database/tests/connector_state.sql`. Never expose connector storage to
   anonymous or authenticated clients. Run real two-user/MFA acceptance there.
2. Configure the Supabase `dashboard-connectors` Edge Function. Platform-managed
   Supabase URL, private service key and public key stay server-side. Set
   `DASHBOARD_ORIGIN` to `https://code-with-cisco.github.io`, a random 32-byte
   base64url `CONNECTOR_ENCRYPTION_KEY`, and a separate random
   `CONNECTOR_SYNC_KEY` of at least 32 characters. Keep the encryption key in
   independent private recovery storage; rotating it requires re-encryption.
3. For Google, create the owner-approved OAuth app and configure
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.
   For GitHub, configure an App with expiring user tokens and the selected
   repository permissions, then set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
   numeric `GITHUB_APP_ID`, and `GITHUB_REDIRECT_URI`. Each callback must exactly
   match `https://code-with-cisco.github.io/LifeDashboard/` in provider settings.
   Partial provider configuration fails closed. Unconfigured providers stay absent.
4. `node scripts/check-connector-config.mjs` validates the shape of privately
   supplied environment variables and prints names/errors only. It makes no
   network request, validates no credentials, and publishes no secret. Never put
   secrets in `config.js`, a public environment example, CLI arguments or Git.
5. Deploy the function with the checked server configuration. Its handler checks
   the real Auth user and database account/MFA guard for every user request;
   `verify_jwt=false` does not make user requests unauthenticated.
6. In the separate test backend, complete provider authorization, explicitly
   select calendars/repositories, and verify sync, revoked tokens, disconnect,
   account switching, stale-source warnings and callback replay denial. Run
   `scripts/test-live-connectors.js` with private disposable fixtures. No passing
   local mock substitutes for this acceptance.
7. After live acceptance, set repository variable `CONNECTORS_ENABLED=true` and
   the matching private `CONNECTOR_SYNC_KEY` GitHub Actions secret. The variable
   controls both the public feature flag and scheduled workflow. Rebuild/deploy
   to expose Connections. Set it false and redeploy to disable the public UI;
   existing provider grants require explicit disconnect/revocation separately.

Narration is optional: configure `OPENAI_API_KEY` privately and an approved
`OPENAI_MODEL` to use the existing server narrator. Without that key it uses the
bounded rules-based brief. Preview facts before sending them. Spoken playback
uses the browser; model output does not authorize actions. Selected Obsidian
Markdown imports use the explicit preview workflow; no whole-vault access or
write-back is granted.
