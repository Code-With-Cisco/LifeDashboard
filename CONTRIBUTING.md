# Contributing to LifeDashboard

## Dev Setup

Use a local HTTP server for development. The production workflow runs an explicit static build before publishing.

### Step 1: Get your Supabase credentials

1. Go to [Supabase Dashboard](https://supabase.com) and open your project
2. Click **Settings → API**
3. Copy **Project URL** and **anon key**

### Step 2: Create `config.js`

```bash
cp config.example.js config.js
```

Open `config.js` and fill in your real values:

```js
window.CONFIG = Object.freeze({
  supabaseUrl:  'https://your-project.supabase.co',
  supabaseKey:  'your-anon-key-here',
  allowSelfSignup: false,
});
```

`config.js` is listed in `.gitignore` — never commit it.

### Step 3: Run the app

```bash
# Option A — Python (no install)
python -m http.server 8000
# Then open http://localhost:8000

# Option B — Node
npx http-server
```

Or just open `index.html` directly in Chrome/Firefox.

### Troubleshooting

| Error | Fix |
|-------|-----|
| "Cannot read properties of undefined (reading 'from')" | `config.js` is missing or has wrong `supabaseUrl` |
| 401 / 403 from Supabase | Wrong `supabaseKey` — use the **anon** key, not the service_role key |
| Blank page | Open DevTools → Console and look for the first red error |

## Running Tests

```bash
npm install       # first time only
npm test          # run all tests
npm run test:coverage  # run with coverage report
```

Tests live in `test/` and cover the pure service files in `services/`. They run in Node.js via Jest with a jsdom environment and have zero network dependencies.

## Commit Conventions

Match the existing commit message style:

```
Phase X.Y: Short imperative description
```

Examples:
- `Phase 5.1: Add Jest test infrastructure`
- `Phase 6.2: Create CONTRIBUTING.md`

For non-phase work (bug fixes, hotfixes):
```
fix: short description of what was wrong and what changed
```

## Where to Add Things

| What | Where |
|------|-------|
| New Supabase query | `api.js` — add a method to the appropriate namespace |
| New business logic (no DOM, no DB) | `services/` — create or extend a service file |
| New HTML template | `render.js` — add a pure function that returns a string |
| New DOM utility | `utils.js` — add to the appropriate util object |
| New UI feature wired to events | `app.js` — follow the staged loading pattern |
| New event delegation action | `main.js` — add a `case` to `setupEventDelegation` |

## Staged Loading Pattern

When adding a new DB-backed behavior that replaces an existing function:

```js
// At the bottom of the inline script, inside a new STAGE block:
const _origMyFunc = myFunc;
myFunc = async function(...args) {
  try {
    // DB-powered implementation
    const data = await API.someMethod();
    // ...
  } catch(e) {
    Logger.error('module', 'myFunc', e);
    return _origMyFunc(...args); // fall back to original
  }
};
```

This preserves offline/fallback behavior automatically.

## Service Layer Rules

Files in `services/` must:
- Contain only pure business logic (no `sb.from()`, no `document.*`, no `Logger.*`)
- Export via `window.ServiceName = {...}`
- Have corresponding tests in `test/`

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full module map and data flow.

## Security rules

- Never commit a Supabase `service_role` key, provider token, shared signup secret, or personal export.
- Escape stored and provider-sourced text before inserting it into HTML; prefer `textContent` when practical.
- Do not implement user administration, OAuth token exchange, or AI-provider calls in browser code.
- Database changes must include reviewed RLS policies and cross-user isolation tests.
- Run `npm audit --audit-level=high` and review [SECURITY.md](SECURITY.md) before deployment.
