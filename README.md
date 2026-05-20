# LifeDashboard

A personal lifestyle dashboard for tracking habits, nutrition, recipes, workouts, finances, and more. Built as a single-page app backed by Supabase — no build step required.

## Quick Start

Open `index.html` in a browser. Supabase credentials are embedded in the file. All user data (habits, meals, recipes, weight, workouts) is stored in Supabase; the app falls back to localStorage cache when offline.

## Running Tests

```bash
npm install
npm test                 # run all unit tests
npm run test:coverage    # run with coverage report
```

Tests cover the three business-logic service modules (`services/`) and run entirely in Node.js — no browser or Supabase connection required.

## Module Map

| File | Purpose |
|------|---------|
| [logs.js](logs.js) | Structured logging — console + localStorage history |
| [state.js](state.js) | localStorage wrapper with schema validation and change subscribers |
| [utils.js](utils.js) | DOM helpers, array/string/format utilities |
| [api.js](api.js) | Centralized Supabase data access (recipes, habits, nutrition) |
| [render.js](render.js) | Pure HTML template functions |
| [main.js](main.js) | Event delegation and page orchestration |
| [services/RecipeService.js](services/RecipeService.js) | Recipe rating, filtering, and suggestions |
| [services/HabitService.js](services/HabitService.js) | Habit completion tracking and streak calculation |
| [services/NutritionService.js](services/NutritionService.js) | Macro target management and consumption tracking |

The `index.html` inline script contains all UI logic and uses a staged loading pattern to progressively layer DB-driven behavior on top of base implementations.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full module dependency graph, data flow, staged loading pattern, and Supabase table reference.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, where to add things, and commit conventions.
