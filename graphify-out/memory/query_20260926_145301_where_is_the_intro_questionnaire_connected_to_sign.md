---
type: "query"
date: "2026-09-26T14:53:01.685458+00:00"
question: "Where is the intro questionnaire connected to sign-in?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Onboarding Questionnaire", "completeQuestionnaire()"]
---

# Q: Where is the intro questionnaire connected to sign-in?

## Answer

Expanded from graph vocabulary: onboarding questionnaire profile. The map connects Onboarding Questionnaire in index.html to completeQuestionnaire(), assignPlans(), loadAllContent(), and enterApp() in app.js. Source verification found the later body-profile override and the applyAuthSession setup gate. This task removes the questionnaire and gate; check current source because the graph predates this removal.

## Outcome

- Signal: useful

## Source Nodes

- Onboarding Questionnaire
- completeQuestionnaire()
## Planning follow-up

Expanded vocabulary: briefing, goal, task, schedule. The map points to BriefingService and the goals/calendar UI. Current source now delegates task forms to planning.js and capacity calculations to services/PlanningService.js. Migration 008 is applied after live rollback/commit checks preserved existing records; live API planning/MFA checks passed. Check source and release records rather than assuming the older graph reflects these changes.
