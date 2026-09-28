# Graph Report - LifeDashboard  (2026-09-28)

Checkpoint scope: code refreshed from the uncommitted office working tree on `0b27f191`. Prior semantic/document annotations remain historical; SQL extraction was skipped because the optional parser is absent. Read [HANDOFF.md](../HANDOFF.md) and [the September 28 source-verified memory](memory/query_20260928_daily_use_readiness.md) before using this map. Commit equality alone does not establish working-tree freshness.

## Corpus Check
- 93 files · ~59,801 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .css 1)

## Summary
- 721 nodes · 1246 edges · 69 communities (51 shown, 18 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 111 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0b27f191`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- Module Load Order
- toast
- package.json
- renderHabits
- Daily-use readiness checkpoint
- openModal
- test-database.js
- Life Dashboard User Interface
- build-static.js
- escapeHtml
- Deployment Configuration
- renderWit
- create
- personal-data.js
- test-live-planning.js
- BuildSecurity.test.js
- BriefingService.js
- test-planning.js
- test-personal-data.js
- ref_path
- test-mfa.js
- Main Bootstrap
- Recipe Tests
- AppSecurity.test.js
- PersonalDataService.test.js
- CI Test Workflow
- Daily Briefing Knowledge
- Security Review Knowledge
- scheduleMorningBrief
- Database verification and deployment
- PlanningService.js
- LifeDashboard Project Overview
- CalendarImportService.js
- test-live-api.js
- Workstation handoff — September 28, 2026
- Life Dashboard Improvement Metrics
- LifeDashboard review — September 10, 2026
- create
- create
- Q: Where is the intro questionnaire connected to sign-in?
- LifeDashboard production QA report
- WorkoutService.js
- saveCustomProtein
- PersonalDataController.test.js
- Q: Check the current status of the Dashboard project, review and analyze the codebase, figure out where it lacks, what changes should be made, review security vulnerabilities as this will be dealing with a lot of my personal info.
- create
- Security
- Offline and Database Failure Fallback
- ProfileService.js
- AGENTS.md
- ProfileService.test.js
- renderBooks
- removeSpiceRecipe
- Shell.test.js
- confirmAddGoal

## God Nodes (most connected - your core abstractions)
1. `toast()` - 56 edges
2. `escapeHtml()` - 24 edges
3. `openModal()` - 20 edges
4. `safeIdentifier()` - 18 edges
5. `closeModal()` - 18 edges
6. `goto()` - 17 edges
7. `todayStr()` - 15 edges
8. `writeRecord()` - 14 edges
9. `confirmDialog()` - 14 edges
10. `create()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Daily-use readiness checkpoint` --references--> `writeRecord()`  [INFERRED]
  graphify-out/memory/query_20260928_daily_use_readiness.md → app.js
- `Daily-use readiness checkpoint` --references--> `readSection()`  [INFERRED]
  graphify-out/memory/query_20260928_daily_use_readiness.md → app.js
- `Daily-use readiness checkpoint` --references--> `renderDash()`  [INFERRED]
  graphify-out/memory/query_20260928_daily_use_readiness.md → app.js
- `Daily-use readiness checkpoint` --references--> `retryRecipes()`  [INFERRED]
  graphify-out/memory/query_20260928_daily_use_readiness.md → app.js
- `Server boundary` --references--> `goals()`  [INFERRED]
  ROADMAP.md → planning.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Modular Application Dependency Chain** — architecture_logs_module, architecture_state_module, architecture_utils_module, architecture_api_module, architecture_render_module, architecture_main_module [EXTRACTED 1.00]
- **Personal Life Management Domains** — index_health_tracking, index_schedule_management, index_recipe_management, index_reading_management, index_financial_management, index_goals_and_tasks [EXTRACTED 1.00]

## Communities (69 total, 18 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.03
Nodes (46): ALL_H_IDS, bookState, calcRecipeRating(), calDate, checkCode(), CONTENT, D7, D7L (+38 more)

### Community 1 - "Module Load Order"
Cohesion: 0.18
Nodes (13): API Module, User Action to Persistent State Data Flow, Logs Module, Main Orchestration Module, Module Load Order, Render Module, Validated Local Storage State Management, State Module (+5 more)

### Community 2 - "toast"
Cohesion: 0.12
Nodes (35): addBook(), addMealEntry(), adminCreateUser(), adminResetPass(), closeModal(), confirmDialog(), deleteEvent(), loadDashStats() (+27 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (27): author, bugs, url, dependencies, @supabase/supabase-js, description, devDependencies, @electric-sql/pglite (+19 more)

### Community 4 - "renderHabits"
Cohesion: 0.19
Nodes (14): chDay(), confirmAddHabit(), editHabit(), getHabitLabel(), getUserHabitSecs(), openAddHabit(), openAddHabitForSection(), removeHabit() (+6 more)

### Community 5 - "Daily-use readiness checkpoint"
Cohesion: 0.14
Nodes (17): applyAuthSession(), clearPrivateSession(), createProfile(), detectAndSaveTimezone(), doFPR(), doLogin(), doSignup(), fetchRemainingMacros() (+9 more)

### Community 6 - "openModal"
Cohesion: 0.12
Nodes (17): editDebt(), editGoal(), editSub(), openAddCustomBook(), openAddGoal(), openAddGoalForSection(), openBillModal(), openCustomProteinModal() (+9 more)

### Community 7 - "test-database.js"
Cohesion: 0.15
Nodes (15): buildRepairTransaction(), fs, migrations, path, read(), root, tests, assert (+7 more)

### Community 8 - "Life Dashboard User Interface"
Cohesion: 0.19
Nodes (13): Invite-Only Authentication Flow, ICS Calendar Import, Debt Bill Subscription and Cash Flow Management, Goals and To-Do Management, Weight Habit Workout and Nutrition Tracking, Daily Home Brief, Life Dashboard User Interface, Onboarding Questionnaire (+5 more)

### Community 9 - "build-static.js"
Cohesion: 0.13
Nodes (15): ref_fs, connectSources, files, fs, html, indexPath, output, path (+7 more)

### Community 10 - "escapeHtml"
Cohesion: 0.07
Nodes (57): addPlanDay(), addToShelf(), briefDeliveryStatus(), briefTimeLabel(), buildBookCardHtml(), buildMealItemHtml(), buildNav(), CalendarImport (+49 more)

### Community 11 - "Deployment Configuration"
Cohesion: 0.50
Nodes (4): GitHub Pages Deployment, Runtime Config Generation, Supabase and Signup Secrets, Deploy to GitHub Pages Workflow

### Community 12 - "renderWit"
Cohesion: 0.33
Nodes (9): calcWit(), deleteWitItem(), fmtWorkTime(), getWitRate(), renderWit(), savePersonalDocument(), saveWitRate(), witDecide() (+1 more)

### Community 13 - "create"
Cohesion: 0.13
Nodes (21): create(), addWindow(), change(), edit(), error(), fillGoals(), goals(), open() (+13 more)

### Community 14 - "personal-data.js"
Cohesion: 0.16
Nodes (20): Architecture, Connector contract, Finance connection methods, Guardrails, Integration roadmap, Recommended phases, apply(), exportBackup() (+12 more)

### Community 15 - "test-live-planning.js"
Cohesion: 0.24
Nodes (10): @supabase/supabase-js, assert, {create:security}, {createClient}, crypto, fs, main(), otp() (+2 more)

### Community 16 - "BuildSecurity.test.js"
Cohesion: 0.14
Nodes (11): decrypt(), encrypt(), key(), redact(), redactText(), validatePublicConfig(), {execFileSync}, fs (+3 more)

### Community 17 - "BriefingService.js"
Cohesion: 0.70
Nodes (4): build(), normalizePreferences(), taskReason(), taskScore()

### Community 18 - "test-planning.js"
Cohesion: 0.15
Nodes (12): @electric-sql/pglite, buildPlanningTransaction(), fs, path, read(), root, assert, {buildPlanningTransaction} (+4 more)

### Community 19 - "test-personal-data.js"
Cohesion: 0.15
Nodes (12): ref_assert, buildPersonalDataTransaction(), fs, path, read(), root, assert, {buildPersonalDataTransaction} (+4 more)

### Community 20 - "ref_path"
Cohesion: 0.15
Nodes (12): ref_child_process, ref_path, services_mfaservice_code, create(), {execFileSync}, path, {create,code}, {execFileSync} (+4 more)

### Community 21 - "test-mfa.js"
Cohesion: 0.16
Nodes (11): buildMfaTransaction(), fs, path, read(), root, assert, {buildMfaTransaction}, fs (+3 more)

### Community 25 - "AppSecurity.test.js"
Cohesion: 0.15
Nodes (11): insert(), ownerColumn(), write(), fs, importFixture(), importText(), {JSDOM}, path (+3 more)

### Community 32 - "PersonalDataService.test.js"
Cohesion: 0.09
Nodes (24): ref_node_assert, ref_node_child_process, ref_node_crypto, ref_node_fs, ref_node_path, ref_node_vm, assert, fs (+16 more)

### Community 36 - "CI Test Workflow"
Cohesion: 0.67
Nodes (3): Reproducible npm ci Installation, Unit Test Gate, Node 20 Test Workflow

### Community 39 - "Daily Briefing Knowledge"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: How should the daily Jarvis-style brief evolve?, Source Nodes

### Community 40 - "Security Review Knowledge"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Where are the main security boundaries and risks?, Source Nodes

### Community 41 - "scheduleMorningBrief"
Cohesion: 0.25
Nodes (9): briefingDeliveryKey(), briefingPreferencesKey(), getBriefPreferences(), localDateKey(), openBriefPreferences(), refreshDailyBrief(), saveBriefPreferences(), scheduleMorningBrief() (+1 more)

### Community 42 - "Database verification and deployment"
Cohesion: 0.17
Nodes (12): Auth settings and remaining work, Authenticator MFA (007), Database verification and deployment, Existing security repair tests, Local verification, Manual API harness, Personal-record API harness, Personal-record storage (005–006) (+4 more)

### Community 43 - "PlanningService.js"
Cohesion: 0.27
Nodes (9): availability(), clockChanges(), dateValid(), localClock(), merge(), task(), windows(), input (+1 more)

### Community 44 - "LifeDashboard Project Overview"
Cohesion: 0.26
Nodes (8): LifeDashboard Architecture, Phase and Fix Commit Convention, LifeDashboard Contributing Guide, No-Build Development Setup, Local Supabase Secret Handling, Service Unit Testing Policy, LifeDashboard Project Overview, Network-Independent Service Unit Testing

### Community 45 - "CalendarImportService.js"
Cohesion: 0.29
Nodes (8): classify(), datetime(), fingerprint(), parse(), parts(), event(), Service, timed()

### Community 46 - "test-live-api.js"
Cohesion: 0.22
Nodes (8): ref_crypto, ref_vm, assert, crypto, fs, main(), path, vm

### Community 47 - "Workstation handoff — September 28, 2026"
Cohesion: 0.22
Nodes (9): Carrying this checkpoint home, Graphify status, Private local preview, Read this first, Remaining acceptance work, Resume commands, Verification checkpoint, Work completed locally (+1 more)

### Community 48 - "Life Dashboard Improvement Metrics"
Cohesion: 0.18
Nodes (11): Pure Service Layer, Single-Page Supabase Architecture, Static Books and Schedule Reference Data, Service Layer Rules, Life Dashboard Improvement Metrics, Missing End-to-End Workflow Coverage, Phase 3 Modularity Results, Phase 4 Architecture Results (+3 more)

### Community 49 - "LifeDashboard review — September 10, 2026"
Cohesion: 0.22
Nodes (9): Assessment, Findings addressed in this change, GitHub and attribution, LifeDashboard review — September 10, 2026, Live database findings and repair status, References, Remaining priorities, September 28 local readiness checkpoint (+1 more)

### Community 50 - "create"
Cohesion: 0.48
Nodes (6): create(), current(), identity(), read(), reset(), save()

### Community 52 - "Q: Where is the intro questionnaire connected to sign-in?"
Cohesion: 0.33
Nodes (5): Answer, Outcome, Planning follow-up, Q: Where is the intro questionnaire connected to sign-in?, Source Nodes

### Community 53 - "LifeDashboard production QA report"
Cohesion: 0.33
Nodes (5): Coverage, Findings and resolution, LifeDashboard production QA report, Next QA layer, Verification

### Community 54 - "WorkoutService.js"
Cohesion: 0.47
Nodes (4): normalizeCustomDays(), sessionPayload(), setCount(), weekdayNumber()

### Community 55 - "saveCustomProtein"
Cohesion: 0.40
Nodes (6): calcCustomMacros(), getCustomProteins(), getCustomSides(), getMacroProtein(), getMacroSide(), saveCustomProtein()

### Community 56 - "PersonalDataController.test.js"
Cohesion: 0.20
Nodes (7): ref_jsdom, fs, goals, {JSDOM}, path, root, vm

### Community 57 - "Q: Check the current status of the Dashboard project, review and analyze the codebase, figure out where it lacks, what changes should be made, review security vulnerabilities as this will be dealing with a lot of my personal info."
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Check the current status of the Dashboard project, review and analyze the codebase, figure out where it lacks, what changes should be made, review security vulnerabilities as this will be dealing with a lot of my personal info., Source Nodes

### Community 58 - "create"
Cohesion: 0.60
Nodes (4): create(), refresh(), remove(), work()

### Community 59 - "Security"
Cohesion: 0.40
Nodes (5): Reporting a vulnerability, Repository and GitHub checks, Required Supabase checks, Security, Security model

### Community 60 - "Offline and Database Failure Fallback"
Cohesion: 0.50
Nodes (4): Offline and Database Failure Fallback, Staged Loading Pattern, Staged Loading Extension Guidance, Supabase Data with Local Offline Cache

### Community 61 - "ProfileService.js"
Cohesion: 0.83
Nodes (3): isValidTimeZone(), numericValue(), prepare()

### Community 65 - "renderBooks"
Cohesion: 0.22
Nodes (9): moveBook(), removeFromShelf(), renderBooks(), saveCurrentPage(), savePageProgress(), setBookStatus(), setRating(), toggleBookEdit() (+1 more)

### Community 66 - "removeSpiceRecipe"
Cohesion: 0.32
Nodes (8): getCustomSpice(), loadRecipesFromDB(), removeSpiceRecipe(), renderSpice(), retryRecipes(), saveCustomSpice(), saveSpiceRecipe(), toggleSpiceEdit()

### Community 67 - "Shell.test.js"
Cohesion: 0.33
Nodes (5): css, fs, html, path, root

### Community 68 - "confirmAddGoal"
Cohesion: 0.50
Nodes (5): confirmAddGoal(), removeGoal(), renderGoals(), saveUserGoalData(), toggleGoalEdit()

## Knowledge Gaps
- **230 isolated node(s):** `_privateShell`, `CONTENT`, `habitDate`, `calDate`, `habitCache` (+225 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 307 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LifeDashboard Project Overview` connect `LifeDashboard Project Overview` to `Life Dashboard User Interface`, `Module Load Order`, `Offline and Database Failure Fallback`, `LifeDashboard production QA report`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `@electric-sql/pglite` connect `test-planning.js` to `test-personal-data.js`, `package.json`, `test-mfa.js`, `test-database.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `_privateShell`, `CONTENT`, `habitDate` to the rest of the system?**
  _230 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.03496503496503497 - nodes in this community are weakly interconnected._
- **Should `toast` be split into smaller, more focused modules?**
  _Cohesion score 0.12436974789915967 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Daily-use readiness checkpoint` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._
