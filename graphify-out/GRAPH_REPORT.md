# Graph Report - LifeDashboard  (2026-09-03)

## Corpus Check
- 29 files · ~27,180 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 371 nodes · 670 edges · 42 communities (34 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6994b05c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Core App State
- Architecture and Security
- User Actions and Mutations
- Test Dependencies
- Dates and Navigation
- Authentication and Profiles
- Editors and Modals
- Habit Tracking
- Life Management UI
- Safe Static Build
- Rendering Safety
- Deployment Configuration
- Work Time Tracking
- Goals and Recipes Navigation
- Meal Discovery
- Onboarding Questionnaire
- Security Utilities
- Daily Briefing
- Recipe Rating
- Book Data Loading
- Meal Catalog
- Reading Progress
- Main Bootstrap
- Recipe Tests
- CI Test Workflow
- Daily Briefing Knowledge
- Security Review Knowledge
- Macro Tracking

## God Nodes (most connected - your core abstractions)
1. `toast()` - 53 edges
2. `openModal()` - 20 edges
3. `escapeHtml()` - 19 edges
4. `closeModal()` - 17 edges
5. `todayStr()` - 15 edges
6. `confirmDialog()` - 14 edges
7. `goto()` - 14 edges
8. `safeIdentifier()` - 13 edges
9. `renderBooks()` - 11 edges
10. `Life Dashboard User Interface` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Application Module Map` --semantically_similar_to--> `Module Load Order`  [INFERRED] [semantically similar]
  README.md → ARCHITECTURE.md
- `Network-Independent Service Unit Testing` --semantically_similar_to--> `Service Unit Testing Policy`  [INFERRED] [semantically similar]
  README.md → CONTRIBUTING.md
- `Supabase Data with Local Offline Cache` --semantically_similar_to--> `Offline and Database Failure Fallback`  [INFERRED] [semantically similar]
  README.md → ARCHITECTURE.md
- `Service Layer Rules` --semantically_similar_to--> `Pure Service Layer`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → ARCHITECTURE.md
- `Phase 3 Modularity Results` --conceptually_related_to--> `Module Load Order`  [INFERRED]
  METRICS.md → ARCHITECTURE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Modular Application Dependency Chain** — architecture_logs_module, architecture_state_module, architecture_utils_module, architecture_api_module, architecture_render_module, architecture_main_module [EXTRACTED 1.00]
- **Personal Life Management Domains** — index_health_tracking, index_schedule_management, index_recipe_management, index_reading_management, index_financial_management, index_goals_and_tasks [EXTRACTED 1.00]

## Communities (42 total, 8 thin omitted)

### Community 0 - "Core App State"
Cohesion: 0.04
Nodes (32): ALL_H_IDS, BODY_PROFILE_STEP, bookState, calDate, CONTENT, D7, D7L, FALLBACK_MEALS (+24 more)

### Community 1 - "Architecture and Security"
Cohesion: 0.05
Nodes (46): API Module, User Action to Persistent State Data Flow, LifeDashboard Architecture, Logs Module, Main Orchestration Module, Module Load Order, Offline and Database Failure Fallback, Render Module (+38 more)

### Community 2 - "User Actions and Mutations"
Cohesion: 0.07
Nodes (48): addBook(), addMealEntry(), adminCreateUser(), adminResetPass(), closeModal(), confirmDialog(), dashMarkDone(), deleteTodo() (+40 more)

### Community 3 - "Test Dependencies"
Cohesion: 0.08
Nodes (23): jest, jest-environment-jsdom, author, bugs, url, description, devDependencies, jest (+15 more)

### Community 4 - "Dates and Navigation"
Cohesion: 0.11
Nodes (24): buildNav(), calNav(), deleteEvent(), deleteMeal(), enterApp(), fmtD(), fmtDs(), goto() (+16 more)

### Community 5 - "Authentication and Profiles"
Cohesion: 0.18
Nodes (11): checkCode(), createProfile(), doFPR(), doLogin(), doSignup(), loadProfile(), logout(), show() (+3 more)

### Community 6 - "Editors and Modals"
Cohesion: 0.10
Nodes (21): confirmAddGoal(), editDebt(), editGoal(), editHabit(), editSub(), editTodo(), getUserGoalData(), openAddCustomBook() (+13 more)

### Community 7 - "Habit Tracking"
Cohesion: 0.21
Nodes (13): chDay(), confirmAddHabit(), getHabitLabel(), getUserHabitSecs(), openAddHabit(), openAddHabitForSection(), removeHabit(), renderCatProg() (+5 more)

### Community 8 - "Life Management UI"
Cohesion: 0.19
Nodes (13): Invite-Only Authentication Flow, ICS Calendar Import, Debt Bill Subscription and Cash Flow Management, Goals and To-Do Management, Weight Habit Workout and Nutrition Tracking, Daily Home Brief, Life Dashboard User Interface, Onboarding Questionnaire (+5 more)

### Community 9 - "Safe Static Build"
Cohesion: 0.25
Nodes (7): files, fs, output, parsed, path, publicConfig, root

### Community 10 - "Rendering Safety"
Cohesion: 0.11
Nodes (27): addPlanDay(), addToShelf(), buildBookCardHtml(), buildMealItemHtml(), _debouncedLibSearch, escapeAttr(), escapeHtml(), importTemplate() (+19 more)

### Community 11 - "Deployment Configuration"
Cohesion: 0.50
Nodes (4): GitHub Pages Deployment, Runtime Config Generation, Supabase and Signup Secrets, Deploy to GitHub Pages Workflow

### Community 12 - "Work Time Tracking"
Cohesion: 0.36
Nodes (8): calcWit(), deleteWitItem(), fmtWorkTime(), getWitRate(), renderWit(), saveWitRate(), witDecide(), yearMonth()

### Community 13 - "Goals and Recipes Navigation"
Cohesion: 0.47
Nodes (6): getCustomSpice(), removeSpiceRecipe(), renderSpice(), saveCustomSpice(), saveSpiceRecipe(), toggleSpiceEdit()

### Community 14 - "Meal Discovery"
Cohesion: 0.33
Nodes (6): _debouncedMealSearch, openMealModal(), setMealTab(), setMmTag(), toggleMacroFilter(), updateMealList()

### Community 15 - "Onboarding Questionnaire"
Cohesion: 0.29
Nodes (7): assignPlans(), completeQuestionnaire(), loadAllContent(), qBack(), qNext(), renderQStep(), startQuestionnaire()

### Community 17 - "Daily Briefing"
Cohesion: 0.83
Nodes (3): build(), taskReason(), taskScore()

### Community 36 - "CI Test Workflow"
Cohesion: 0.67
Nodes (3): Reproducible npm ci Installation, Unit Test Gate, Node 20 Test Workflow

### Community 39 - "Q: How should the daily Jarvis-style brief evolve?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: How should the daily Jarvis-style brief evolve?, Source Nodes

### Community 40 - "Q: Where are the main security boundaries and risks?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Where are the main security boundaries and risks?, Source Nodes

## Knowledge Gaps
- **87 isolated node(s):** `CONTENT`, `habitDate`, `calDate`, `habitCache`, `M12` (+82 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LifeDashboard Project Overview` connect `Architecture and Security` to `Life Management UI`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Life Dashboard User Interface` connect `Life Management UI` to `Architecture and Security`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `toast()` connect `toast` to `Core App State`, `todayStr`, `doFPR`, `openModal`, `renderHabits`, `escapeHtml`, `Work Time Tracking`, `removeSpiceRecipe`, `completeQuestionnaire`, `Reading Progress`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `CONTENT`, `habitDate`, `calDate` to the rest of the system?**
  _87 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core App State` be split into smaller, more focused modules?**
  _Cohesion score 0.03773584905660377 - nodes in this community are weakly interconnected._
- **Should `Architecture and Security` be split into smaller, more focused modules?**
  _Cohesion score 0.04964539007092199 - nodes in this community are weakly interconnected._
- **Should `toast` be split into smaller, more focused modules?**
  _Cohesion score 0.07092198581560284 - nodes in this community are weakly interconnected._
