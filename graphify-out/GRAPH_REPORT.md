# Graph Report - LifeDashboard  (2026-10-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1018 nodes · 1634 edges · 128 communities (105 shown, 23 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 86 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Refreshed from the October 10 working tree on base commit `2c118587`; the release includes changes after that base.
- Code extraction is current; retained document annotations and labels may be historical. Read [current readiness](memory/query_20261010_release_readiness.md) and verify source. Commit equality alone does not prove freshness.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test-connectors.mjs
- Module Load Order
- app.js
- package.json
- escapeHtml
- closeModal
- toast
- openModal
- Life Dashboard User Interface
- build-static.js
- goto
- Deployment Configuration
- test-database.js
- create
- personal-data.js
- security-schema.sql
- enterApp
- create
- test-calendar.js
- ref_assert
- ref_path
- test-mfa.js
- test-personal-data.js
- test-planning.js
- CalendarImportService.js
- BuildSecurity.test.js
- AppSecurity.test.js
- getUserHabitSecs
- prepare-connectors.js
- ConnectorService.js
- PlanningService.js
- ref_node_path
- PersonalDataService.test.js
- recovery-archive.js
- test-live-security-readiness.js
- ref_node_fs
- CI Test Workflow
- test-live-planning.js
- refreshDailyBrief
- Daily Briefing Knowledge
- Security Review Knowledge
- renderWit
- Database verification and deployment
- 20260905_004_password_reset_guard.sql
- LifeDashboard Project Overview
- test-live-readiness.js
- test-live-connectors.js
- Workstation handoff — September 28, 2026
- Life Dashboard Improvement Metrics
- LifeDashboard review — September 10, 2026
- test-live-api.js
- test-live-calendar.js
- Q: Where is the intro questionnaire connected to sign-in?
- LifeDashboard production QA report
- PersonalDataController.test.js
- removeSpiceRecipe
- ConnectionsUI.test.js
- Q: Check the current status of the Dashboard project, review and analyze the codebase, figure out where it lacks, what changes should be made, review security vulnerabilities as this will be dealing with a lot of my personal info.
- create
- Security
- Offline and Database Failure Fallback
- test-live-personal-data.js
- AGENTS.md
- MfaService.test.js
- PersonalDataService.js
- saveCustomProtein
- updateMealList
- create
- 20260905_001_profile_authorization.sql
- 20260906_005_personal_documents.sql
- WorkoutService.js
- Shell.test.js
- api.js
- 20260909_007_authenticator_mfa.sql
- create
- BriefingService.js
- create
- mfa-schema.sql
- 20260927_009_connector_state.sql
- atomic_workout_save.sql
- BackupService.js
- ProfileService.js
- showErr
- briefDeliveryStatus
- calcRecipeRating
- dashMarkDone
- fetchAndSortBooks
- getAllMealsFlat
- main.js
- ProfileService.test.js
- RecipeService.test.js
- public.calendar_events
- public.todo_items
- public.calendar_events
- public.habit_logs
- public.user_documents
- public.weight_logs
- ref_node_assert
- public.todo_items

## God Nodes (most connected - your core abstractions)
1. `toast()` - 57 edges
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
- `Daily-use readiness checkpoint` --references--> `clearPrivateSession()`  [INFERRED]
  graphify-out/memory/query_20260928_daily_use_readiness.md → app.js
- `Daily-use readiness checkpoint` --references--> `getNutritionTargets()`  [INFERRED]
  graphify-out/memory/query_20260928_daily_use_readiness.md → app.js
- `Daily-use readiness checkpoint` --references--> `renderDash()`  [INFERRED]
  graphify-out/memory/query_20260928_daily_use_readiness.md → app.js
- `Daily-use readiness checkpoint` --references--> `retryRecipes()`  [INFERRED]
  graphify-out/memory/query_20260928_daily_use_readiness.md → app.js
- `Application Module Map` --semantically_similar_to--> `Module Load Order`  [INFERRED] [semantically similar]
  README.md → ARCHITECTURE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Modular Application Dependency Chain** — architecture_logs_module, architecture_state_module, architecture_utils_module, architecture_api_module, architecture_render_module, architecture_main_module [EXTRACTED 1.00]
- **Personal Life Management Domains** — index_health_tracking, index_schedule_management, index_recipe_management, index_reading_management, index_financial_management, index_goals_and_tasks [EXTRACTED 1.00]

## Communities (128 total, 23 thin omitted)

### Community 0 - "test-connectors.mjs"
Cohesion: 0.06
Nodes (50): issues, app, brief, clock, g, gh, http, narrate (+42 more)

### Community 1 - "Module Load Order"
Cohesion: 0.18
Nodes (13): API Module, User Action to Persistent State Data Flow, Logs Module, Main Orchestration Module, Module Load Order, Render Module, Validated Local Storage State Management, State Module (+5 more)

### Community 2 - "app.js"
Cohesion: 0.04
Nodes (32): ALL_H_IDS, bookState, calDate, CONTENT, D7, D7L, evSourceDetails, FALLBACK_MEALS (+24 more)

### Community 3 - "package.json"
Cohesion: 0.06
Nodes (34): @electric-sql/pglite, ical.js, jest, jest-environment-jsdom, author, bugs, url, dependencies (+26 more)

### Community 4 - "escapeHtml"
Cohesion: 0.12
Nodes (33): addPlanDay(), buildBookCardHtml(), buildMealItemHtml(), buildNav(), CalendarImport, calendarRange(), calendarTitle(), calNav() (+25 more)

### Community 5 - "closeModal"
Cohesion: 0.19
Nodes (23): closeModal(), confirmDialog(), deleteEvent(), detectAndSaveTimezone(), parseExerciseLine(), readSection(), removeBill(), removeDebt() (+15 more)

### Community 6 - "toast"
Cohesion: 0.09
Nodes (31): addBook(), addMealEntry(), addToShelf(), adminCreateUser(), adminResetPass(), _debouncedLibSearch, deleteMeal(), importTemplate() (+23 more)

### Community 7 - "openModal"
Cohesion: 0.10
Nodes (23): confirmAddGoal(), editDebt(), editGoal(), editSub(), getUserGoalData(), openAddCustomBook(), openAddGoal(), openAddGoalForSection() (+15 more)

### Community 8 - "Life Dashboard User Interface"
Cohesion: 0.19
Nodes (13): Invite-Only Authentication Flow, ICS Calendar Import, Debt Bill Subscription and Cash Flow Management, Goals and To-Do Management, Weight Habit Workout and Nutrition Tracking, Daily Home Brief, Life Dashboard User Interface, Onboarding Questionnaire (+5 more)

### Community 9 - "build-static.js"
Cohesion: 0.13
Nodes (15): ref_fs, connectSources, files, fs, html, indexPath, output, path (+7 more)

### Community 10 - "goto"
Cohesion: 0.13
Nodes (18): fetchRemainingMacros(), getNutritionTargets(), goto(), loadDashStats(), logWeight(), openEventModal(), openLogModal(), openUserEvent() (+10 more)

### Community 11 - "Deployment Configuration"
Cohesion: 0.50
Nodes (4): GitHub Pages Deployment, Runtime Config Generation, Supabase and Signup Secrets, Deploy to GitHub Pages Workflow

### Community 12 - "test-database.js"
Cohesion: 0.15
Nodes (15): buildRepairTransaction(), fs, migrations, path, read(), root, tests, assert (+7 more)

### Community 13 - "create"
Cohesion: 0.13
Nodes (21): create(), addWindow(), change(), edit(), error(), fillGoals(), goals(), open() (+13 more)

### Community 14 - "personal-data.js"
Cohesion: 0.16
Nodes (20): Architecture, Connector contract, Finance connection methods, Guardrails, Integration roadmap, Recommended phases, apply(), exportBackup() (+12 more)

### Community 15 - "security-schema.sql"
Cohesion: 0.23
Nodes (14): auth, auth.users, public.admin_actions, public.books, public.exercises, public.get_my_role(), public.meals, public.profiles (+6 more)

### Community 16 - "enterApp"
Cohesion: 0.18
Nodes (15): applyAuthSession(), checkCode(), clearPrivateSession(), createProfile(), doFPR(), enterApp(), fmtD(), fmtDs() (+7 more)

### Community 17 - "create"
Cohesion: 0.23
Nodes (10): create(), act(), ask(), call(), memory(), open(), refresh(), render() (+2 more)

### Community 18 - "test-calendar.js"
Cohesion: 0.16
Nodes (11): buildCalendarTransaction(), fs, path, read(), root, assert, {buildCalendarTransaction}, fs (+3 more)

### Community 20 - "ref_path"
Cohesion: 0.18
Nodes (8): ref_child_process, ref_path, {execFileSync}, {execFileSync}, {execFileSync}, path, {execFileSync}, path

### Community 21 - "test-mfa.js"
Cohesion: 0.16
Nodes (11): buildMfaTransaction(), fs, path, read(), root, assert, {buildMfaTransaction}, fs (+3 more)

### Community 22 - "test-personal-data.js"
Cohesion: 0.16
Nodes (11): buildPersonalDataTransaction(), fs, path, read(), root, assert, {buildPersonalDataTransaction}, fs (+3 more)

### Community 23 - "test-planning.js"
Cohesion: 0.16
Nodes (11): buildPlanningTransaction(), fs, path, read(), root, assert, {buildPlanningTransaction}, fs (+3 more)

### Community 24 - "CalendarImportService.js"
Cohesion: 0.26
Nodes (11): canonical(), classify(), datetime(), fingerprint(), parse(), parseExplicit(), parts(), event() (+3 more)

### Community 25 - "BuildSecurity.test.js"
Cohesion: 0.18
Nodes (8): redact(), redactText(), validatePublicConfig(), {execFileSync}, fs, path, root, {validatePublicConfig}

### Community 26 - "AppSecurity.test.js"
Cohesion: 0.18
Nodes (8): fs, importFixture(), importText(), {JSDOM}, path, root, run(), vm

### Community 27 - "getUserHabitSecs"
Cohesion: 0.24
Nodes (12): chDay(), confirmAddHabit(), editHabit(), getHabitLabel(), getUserHabitSecs(), removeHabit(), renderCatProg(), renderHabits() (+4 more)

### Community 28 - "prepare-connectors.js"
Cohesion: 0.20
Nodes (9): fs, path, read(), root, transaction(), assert, fs, {PGlite} (+1 more)

### Community 29 - "ConnectorService.js"
Cohesion: 0.23
Nodes (8): dateParts(), facts(), merge(), sourceLink(), parse(), validate(), C, O

### Community 30 - "PlanningService.js"
Cohesion: 0.27
Nodes (9): availability(), clockChanges(), dateValid(), localClock(), merge(), task(), windows(), input (+1 more)

### Community 31 - "ref_node_path"
Cohesion: 0.18
Nodes (8): ref_node_path, fs, path, suites, fs, {loadNycConfig}, os, path

### Community 32 - "PersonalDataService.test.js"
Cohesion: 0.17
Nodes (9): ref_node_child_process, {execFileSync}, {execFileSync}, Backup, {execFileSync}, goals, path, S (+1 more)

### Community 33 - "recovery-archive.js"
Cohesion: 0.25
Nodes (9): Backup, crypto, fs, main(), open(), path, privatePath(), seal() (+1 more)

### Community 34 - "test-live-security-readiness.js"
Cohesion: 0.24
Nodes (10): assert, Backup, {createClient}, crypto, fs, main(), Mfa, otp() (+2 more)

### Community 35 - "ref_node_fs"
Cohesion: 0.22
Nodes (7): ref_node_fs, assert, fs, path, vm, config, fs

### Community 36 - "CI Test Workflow"
Cohesion: 0.67
Nodes (3): Reproducible npm ci Installation, Unit Test Gate, Node 20 Test Workflow

### Community 37 - "test-live-planning.js"
Cohesion: 0.27
Nodes (9): assert, {create:security}, {createClient}, crypto, fs, main(), otp(), path (+1 more)

### Community 38 - "refreshDailyBrief"
Cohesion: 0.25
Nodes (9): briefingDeliveryKey(), briefingPreferencesKey(), getBriefPreferences(), localDateKey(), openBriefPreferences(), refreshDailyBrief(), saveBriefPreferences(), scheduleMorningBrief() (+1 more)

### Community 39 - "Daily Briefing Knowledge"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: How should the daily Jarvis-style brief evolve?, Source Nodes

### Community 40 - "Security Review Knowledge"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Where are the main security boundaries and risks?, Source Nodes

### Community 41 - "renderWit"
Cohesion: 0.33
Nodes (9): calcWit(), deleteWitItem(), fmtWorkTime(), getWitRate(), renderWit(), savePersonalDocument(), saveWitRate(), witDecide() (+1 more)

### Community 42 - "Database verification and deployment"
Cohesion: 0.17
Nodes (12): Auth settings and remaining work, Authenticator MFA (007), Database verification and deployment, Existing security repair tests, Local verification, Manual API harness, Personal-record API harness, Personal-record storage (005–006) (+4 more)

### Community 43 - "20260905_004_password_reset_guard.sql"
Cohesion: 0.22
Nodes (6): clear_completed_password_reset, guard_password_reset_requirement, public.get_my_role(), public.profiles, public.clear_completed_password_reset, public.guard_password_reset_requirement

### Community 44 - "LifeDashboard Project Overview"
Cohesion: 0.26
Nodes (8): LifeDashboard Architecture, Phase and Fix Commit Convention, LifeDashboard Contributing Guide, No-Build Development Setup, Local Supabase Secret Handling, Service Unit Testing Policy, LifeDashboard Project Overview, Network-Independent Service Unit Testing

### Community 45 - "test-live-readiness.js"
Cohesion: 0.25
Nodes (8): ref_node_crypto, assert, {createClient}, crypto, fs, main(), path, vm

### Community 46 - "test-live-connectors.js"
Cohesion: 0.24
Nodes (9): ref_crypto, assert, {createClient}, crypto, fs, main(), otp(), path (+1 more)

### Community 47 - "Workstation handoff — September 28, 2026"
Cohesion: 0.22
Nodes (9): Carrying this checkpoint home, Graphify status, Private local preview, Read this first, Remaining acceptance work, Resume commands, Verification checkpoint, Work completed locally (+1 more)

### Community 48 - "Life Dashboard Improvement Metrics"
Cohesion: 0.18
Nodes (11): Pure Service Layer, Single-Page Supabase Architecture, Static Books and Schedule Reference Data, Service Layer Rules, Life Dashboard Improvement Metrics, Missing End-to-End Workflow Coverage, Phase 3 Modularity Results, Phase 4 Architecture Results (+3 more)

### Community 49 - "LifeDashboard review — September 10, 2026"
Cohesion: 0.22
Nodes (9): Assessment, Findings addressed in this change, GitHub and attribution, LifeDashboard review — September 10, 2026, Live database findings and repair status, References, Remaining priorities, September 28 local readiness checkpoint (+1 more)

### Community 50 - "test-live-api.js"
Cohesion: 0.25
Nodes (7): ref_vm, assert, crypto, fs, main(), path, vm

### Community 51 - "test-live-calendar.js"
Cohesion: 0.25
Nodes (8): assert, Calendar, {createClient}, crypto, fs, main(), path, vm

### Community 52 - "Q: Where is the intro questionnaire connected to sign-in?"
Cohesion: 0.33
Nodes (5): Answer, Outcome, Planning follow-up, Q: Where is the intro questionnaire connected to sign-in?, Source Nodes

### Community 53 - "LifeDashboard production QA report"
Cohesion: 0.33
Nodes (5): Coverage, Findings and resolution, LifeDashboard production QA report, Next QA layer, Verification

### Community 54 - "PersonalDataController.test.js"
Cohesion: 0.22
Nodes (6): fs, goals, {JSDOM}, path, root, vm

### Community 55 - "removeSpiceRecipe"
Cohesion: 0.32
Nodes (8): getCustomSpice(), loadRecipesFromDB(), removeSpiceRecipe(), renderSpice(), retryRecipes(), saveCustomSpice(), saveSpiceRecipe(), toggleSpiceEdit()

### Community 56 - "ConnectionsUI.test.js"
Cohesion: 0.29
Nodes (5): ref_jsdom, fs, {JSDOM}, path, result

### Community 57 - "Q: Check the current status of the Dashboard project, review and analyze the codebase, figure out where it lacks, what changes should be made, review security vulnerabilities as this will be dealing with a lot of my personal info."
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Check the current status of the Dashboard project, review and analyze the codebase, figure out where it lacks, what changes should be made, review security vulnerabilities as this will be dealing with a lot of my personal info., Source Nodes

### Community 58 - "create"
Cohesion: 0.43
Nodes (7): create(), current(), identity(), open(), read(), reset(), save()

### Community 59 - "Security"
Cohesion: 0.40
Nodes (5): Reporting a vulnerability, Repository and GitHub checks, Required Supabase checks, Security, Security model

### Community 60 - "Offline and Database Failure Fallback"
Cohesion: 0.50
Nodes (4): Offline and Database Failure Fallback, Staged Loading Pattern, Staged Loading Extension Guidance, Supabase Data with Local Offline Cache

### Community 61 - "test-live-personal-data.js"
Cohesion: 0.29
Nodes (6): ref_node_vm, assert, fs, main(), path, vm

### Community 63 - "MfaService.test.js"
Cohesion: 0.29
Nodes (6): services_mfaservice_code, create(), {create,code}, {execFileSync}, path, session

### Community 64 - "PersonalDataService.js"
Cohesion: 0.46
Nodes (7): backup(), checkTree(), findLegacy(), legacyKey(), preview(), readBackup(), validate()

### Community 65 - "saveCustomProtein"
Cohesion: 0.40
Nodes (6): calcCustomMacros(), getCustomProteins(), getCustomSides(), getMacroProtein(), getMacroSide(), saveCustomProtein()

### Community 66 - "updateMealList"
Cohesion: 0.33
Nodes (6): _debouncedMealSearch, openMealModal(), setMealTab(), setMmTag(), toggleMacroFilter(), updateMealList()

### Community 68 - "20260905_001_profile_authorization.sql"
Cohesion: 0.33
Nodes (4): guard_profile_authorization, public.get_my_role(), public.profiles, public.guard_profile_authorization

### Community 69 - "20260906_005_personal_documents.sql"
Cohesion: 0.33
Nodes (3): public.user_documents, public.profiles, public

### Community 70 - "WorkoutService.js"
Cohesion: 0.47
Nodes (4): normalizeCustomDays(), sessionPayload(), setCount(), weekdayNumber()

### Community 71 - "Shell.test.js"
Cohesion: 0.33
Nodes (5): css, fs, html, path, root

### Community 72 - "api.js"
Cohesion: 0.60
Nodes (3): insert(), ownerColumn(), write()

### Community 73 - "20260909_007_authenticator_mfa.sql"
Cohesion: 0.40
Nodes (4): auth.mfa_factors, public.get_my_role(), public.mfa_session_allowed(), public.profiles

### Community 74 - "create"
Cohesion: 0.60
Nodes (4): create(), refresh(), remove(), work()

### Community 75 - "BriefingService.js"
Cohesion: 0.70
Nodes (4): build(), normalizePreferences(), taskReason(), taskScore()

### Community 80 - "BackupService.js"
Cohesion: 0.83
Nodes (3): decrypt(), encrypt(), key()

### Community 81 - "ProfileService.js"
Cohesion: 0.83
Nodes (3): isValidTimeZone(), numericValue(), prepare()

### Community 82 - "showErr"
Cohesion: 0.67
Nodes (3): doLogin(), doSignup(), showErr()

## Knowledge Gaps
- **326 isolated node(s):** `Daily experience`, `Delivery order`, `First connected version`, `Narration and action rules`, `Obsidian's role` (+321 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `Daily-use readiness checkpoint` (3× useful, score=2.345144738)
- `Remaining acceptance work` (3× useful, score=2.345144738) _(code changed — re-verify)_
- `Writes` (2× useful, score=1.528672305) _(code changed — re-verify)_
- `BriefingService.js` (2× useful, score=0.866820775)
- `Security` (2× useful, score=0.866820741)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LifeDashboard Project Overview` connect `LifeDashboard Project Overview` to `Life Dashboard User Interface`, `Module Load Order`, `Offline and Database Failure Fallback`, `LifeDashboard production QA report`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `A practical personal Jarvis` connect `create` to `LifeDashboard Project Overview`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Database verification and deployment` connect `Database verification and deployment` to `LifeDashboard Project Overview`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `Daily experience`, `Delivery order`, `First connected version` to the rest of the system?**
  _326 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `test-connectors.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.057539682539682536 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0392156862745098 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
