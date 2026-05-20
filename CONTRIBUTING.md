# Contributing to LifeDashboard

## Dev Setup

No build step required. Open `index.html` directly in a browser (or serve with any static file server if Supabase CORS policies require an origin).

You'll need Supabase credentials. The project reads them from the inline script at the top of `index.html` — no `.env` file or build config involved.

## Running Tests

```bash
npm install       # first time only
npm test          # run all tests
npm run test:coverage  # run with coverage report
```

Tests live in `test/` and cover the three service files in `services/`. They run in Node.js via Jest with a jsdom environment and have zero network dependencies.

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
| New UI feature wired to events | `index.html` inline script — follow the staged loading pattern |
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
