# LifeDashboard — Continuation Handoff Guide

Paste this document at the start of a new Claude Code session on any machine.
Delete this file when the project is finished.

---

## Project overview

LifeDashboard is a personal health/habit/nutrition tracking SPA that runs as a
static HTML file (no build step). Backend is Supabase. The repo lives at:

```
c:\Users\User\Documents\GitHub\LifeDashboard   (Windows path)
```

or wherever you cloned it on the new machine.

---

## Critical constraints — read these first

1. **Never add a `Co-Authored-By:` trailer to any git commit message.** The user
   stated this explicitly. Every commit must end cleanly with the message body only.

2. The app has **no bundler / no build step**. `index.html` loads files directly
   via `<script src="...">` and `<link rel="stylesheet">`. No webpack, Vite, etc.

3. **Node.js path on the original Windows machine** is
   `C:\Program Files\nodejs\` — prepend to PATH before running npm:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs\;$env:PATH"
   npm test
   ```
   On a different machine, adjust the path or just rely on the shell's existing PATH.

4. **`config.js` is gitignored** and holds real Supabase credentials. It does NOT
   exist in the repo — you must create it from `config.example.js`. See setup below.

---

## What was done (already committed)

### Commit: `9403041` — "Externalize config and switch to DB-first content"
**Phase 1 — Credentials + JSON fallback removal**

- Created `config.js` (gitignored) — holds real Supabase credentials
- Created `config.example.js` (committed template)
- Updated `.gitignore`
- Removed ALL JSON file fallback code from what was the inline script:
  - `fetchContent()` function (loaded from `./Data/`) — deleted entirely
  - `loadMealsFromDB()`, `loadWorkoutPlansFromDB()`, `loadRecipesFromDB()` — JSON
    fallback branches removed; DB-first only remains
  - `loadContentStage4()` — removed `jsonW/M/R/B` variables and `|| jsonX` fallbacks
- Updated `CONTRIBUTING.md` with dev setup instructions

### Commit: `0b49d1b` — "Add app.js and styles; document API"
**Phase 2 — CSS/JS extraction + Phase 3 — Documentation**

Phase 2:
- Extracted inline CSS (199 lines) → `styles.css`
- Extracted inline JS (~4,333 lines) → `app.js`
- Rebuilt `index.html` (5,427 lines → 896 lines, HTML only)
- Added all `<script src="...">` and `<link rel="stylesheet">` references

Phase 3:
- Added structured file headers (PURPOSE / PUBLIC INTERFACE / CONNECTED TO)
  and full JSDoc (`@param`, `@returns`, `@throws`) to all 10 JS files
- Cleaned orphaned JSDoc block in `app.js` that referenced the removed
  `fetchContent` function

---

## Current file structure

```
LifeDashboard/
├── index.html          896 lines   — HTML only, no inline CSS or JS
├── styles.css          198 lines   — all CSS (extracted from index.html)
├── app.js             4395 lines   — all application JS (extracted from index.html)
├── logs.js             111 lines   — Logger: structured log to localStorage
├── state.js            174 lines   — State: typed read/write over localStorage
├── utils.js            250 lines   — DOM, ArrayUtils, StringUtils, FormatUtils
├── api.js              217 lines   — All sb.from() calls (Supabase API layer)
├── render.js           141 lines   — Pure HTML template functions (no DOM writes)
├── main.js             127 lines   — Orchestration: event delegation, page updates
├── config.js            (gitignored) — Real credentials, create from example
├── config.example.js     8 lines   — Template (committed)
├── jest.config.js         5 lines   — Jest config (testEnvironment: jsdom)
├── services/
│   ├── RecipeService.js   — rate(), ratingInfo(), filter(), suggest()
│   ├── HabitService.js    — completionPct(), barColor(), calcStreak(), analyzeDay(), toCompletionMap()
│   └── NutritionService.js — getPlanTargets(), sumMacros(), remaining(), pctOfTarget()
├── test/
│   ├── RecipeService.test.js
│   ├── HabitService.test.js
│   └── NutritionService.test.js
├── ARCHITECTURE.md     — Module graph, data-flow diagram, design decisions
├── CONTRIBUTING.md     — Dev setup, testing, commit conventions
├── README.md
└── METRICS.md
```

### Script load order in `index.html` (bottom of `<body>`)

```html
<script src="logs.js"></script>
<script src="state.js"></script>
<script src="utils.js"></script>
<script src="api.js"></script>
<script src="render.js"></script>
<script src="main.js"></script>
<script src="services/RecipeService.js"></script>
<script src="services/HabitService.js"></script>
<script src="services/NutritionService.js"></script>
<script src="app.js"></script>
```

In `<head>`:
```html
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<link rel="stylesheet" href="styles.css">
```

---

## Test suite

65 tests across 3 files, all passing:

```
npm test                 # run all tests
npm run test:coverage    # with coverage report
```

Tests cover only `services/` (pure business logic). All 65 pass at 100% coverage.

---

## Setup on a new machine

1. Clone the repo (or copy the folder)
2. Run `npm install` to install Jest dependencies
3. Copy `config.example.js` → `config.js` and fill in real credentials:
   ```javascript
   const CONFIG = Object.freeze({
     supabaseUrl: 'https://nyjnojknzplfigehzamk.supabase.co',
     supabaseKey: '<anon key from Supabase dashboard>',
     signupCode:  'Memento Mori',
   });
   ```
4. Open `index.html` directly in a browser (no server needed) or serve it:
   ```bash
   npx serve .   # optional local dev server
   ```
5. Run tests to verify environment: `npm test`

---

## Phase 4 — optional, NOT YET STARTED, requires explicit user approval

**Migrate RecipeService / HabitService / NutritionService to Supabase RPC**

This phase was described in the original plan but has not been approved or started.
Do NOT begin it without the user explicitly saying "go ahead with Phase 4" or similar.

What Phase 4 would involve:
- Create SQL RPC functions in Supabase for recipe rating, habit completion, macro math
- Update `app.js` to call `supabase.rpc(...)` instead of the service JS modules
- Delete `services/` directory
- Rewrite/delete `test/` (tests would need to change or move to DB-level tests)
- User must approve schema changes in the DB before any RPC is created

**Risk:** This phase changes the database schema and removes the testable JS service
layer. Confirm scope carefully before starting.

---

## Commit convention

Format: `Phase X.Y: Short description` (or plain descriptions for non-phase work)

**NEVER include `Co-Authored-By:` in any commit message.** This is a hard requirement.

Example:
```
git commit -m "Phase 4.1: Create Supabase RPC functions for recipe rating"
```

---

## Where to pick up

All Phases 1–3 are complete and committed. The working tree is clean.
The next logical action is either:

- **Await user approval for Phase 4** (Supabase RPC migration)
- **Any bug fix or feature** the user identifies from using the app

Ask the user what they want to do before taking any action.
