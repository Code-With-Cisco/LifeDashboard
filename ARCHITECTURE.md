# LifeDashboard — Architecture

## Overview

LifeDashboard is a single-page app (`index.html`) backed by Supabase. All user data lives in Supabase; static reference data (schedule, books year-plan metadata) comes from JSON files. There is no build step — open `index.html` in a browser.

The JS layer is split across 9 focused modules loaded before `index.html`'s inline script. The inline script contains all UI logic and the staged loading pattern.

---

## Module Load Order

```
Supabase CDN
  └── logs.js         Logger — console + localStorage log history
       └── state.js   State — localStorage wrapper with schema validation
            └── utils.js   DOM / ArrayUtils / StringUtils / FormatUtils helpers
                 └── api.js     Supabase data access (recipes, habits, nutrition)
                      └── render.js  Pure HTML template functions
                           └── main.js    Orchestration: event delegation, page updates
                                └── services/RecipeService.js   Recipe business logic
                                └── services/HabitService.js    Habit business logic
                                └── services/NutritionService.js Nutrition business logic
  └── index.html inline script  (all UI logic, auth, staged loading)
```

Each module depends only on modules above it in the chain. Services have zero external dependencies — no DOM, no Supabase, no Logger calls.

---

## Staged Loading Pattern

`index.html` uses a layered override pattern to progressively enhance base implementations:

```js
// Base implementation (works without DB)
renderHabits = function() { /* render from localStorage */ };

// STAGE 2: Override with DB-powered version
const _origRenderHabits = renderHabits;
renderHabits = async function() {
  // fetch from Supabase, fall back to _origRenderHabits on error
};
```

This lets each stage build on prior stages without modifying them. New stages go at the bottom of the inline script.

---

## Data Flow

```
User action
  → index.html handler
    → API.* (Supabase call, throws on error)
      → Service.* (pure business logic on the returned data)
        → Render.* (returns HTML string)
          → DOM.setHTML() (writes to page)
            → State.set() (persists to localStorage as cache/optimistic state)
```

---

## Module Responsibilities

| File | Responsibility | Side effects |
|------|---------------|--------------|
| `logs.js` | Structured logging to console + localStorage | Writes `_app_logs` key |
| `state.js` | localStorage wrapper: get/set/delete/validate | Writes any key, fires subscribers |
| `utils.js` | Pure helpers: DOM, Array, String, Format | DOM writes via `DOM.*` |
| `api.js` | All `sb.from()` calls — throws on error | Network requests |
| `render.js` | Returns HTML strings, no DOM writes | None |
| `main.js` | Event delegation, calls API → Render → DOM | DOM writes |
| `services/RecipeService.js` | Rate, filter, suggest recipes | None |
| `services/HabitService.js` | Completion %, streaks, day analysis | None |
| `services/NutritionService.js` | Macro targets, sums, remaining | None |

---

## State Management

`State.js` wraps all localStorage access. Key naming conventions:

| Prefix | Content |
|--------|---------|
| `cc_v4_*` | Content cache (meals, workouts, recipes from JSON) |
| `habits_*` | Habit completion and list caches |
| `goals_*` | User goal data |
| `custom_*` | User-customized content |
| `wit_*` | Work-in-time tracking data |
| `debt_start_*` | Debt tracking data |
| `_cachedRecipes` | Recipes loaded from Supabase |
| `_cachedHabits` | Habits loaded from Supabase |
| `_app_logs` | Logger history (written by Logger, not State) |

`State.setSafe()` validates against schemas before writing. Unknown keys bypass validation and write directly.

---

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `recipes` | User and template recipes with nutritional data |
| `habit_logs` | Daily habit completion records (`user_id, log_date, habit_id, completed`) |
| `nutrition_logs` | Daily nutrition entries |
| `weight_logs` | Body weight over time |
| `workout_logs` | Completed workout sessions |
| `meal_logs` | Individual meal entries |
| `profiles` | User preferences (calorie targets, protein targets, book ordering, etc.) |

All user-preference data lives in `profiles` columns. No user-preference data is stored only in localStorage.

---

## Static Data Files

| File | Purpose | DB equivalent |
|------|---------|---------------|
| `books.json` | Book list with year-plan metadata (month, why) | Partial — `profiles.book_list_order` stores ordering only |
| `schedule.json` | Reference schedule template | None — intentionally static |
