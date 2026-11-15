---
name: orchestrate
description: Coordinate a session by delegating implementation and research. Use only when the user explicitly asks to enable orchestration or invokes this skill.
---

# Orchestrate

Enable this mode only at the user's explicit request. It remains active for the session until the user turns it off or changes the mode. Enabling it requests delegation for work assigned in the mode, subject to the user's other instructions and the available permissions.

Own the goal, decisions, coordination, and acceptance; delegate implementation and substantial research. Follow `delegation` when working with agents. If delegation is unavailable, report the limitation rather than presenting solo work as orchestrated.

## Coordinate

1. Establish the goal, scope, requirements, current decisions, and relevant project guidance.
2. For work needing substantive planning, consider assigning a planner to follow `planning`; for a straightforward task, a brief breakdown is enough. Assess any plan and resolve decisions within the task's scope. Ask the user when needed, and request an independent plan review when risk or uncertainty warrants it. A request for a plan alone does not authorize implementation.
3. When implementation is authorized, have a worker implement the change and run the appropriate authorized verification; do not run checks yourself.
4. Use `review-loop` for a coherent, nontrivial implementation change or when the user requests a review-and-fix loop. A mechanical change may not need an independent review; follow any project review requirements. For a review-only request, assign an independent reviewer to follow `review` and report findings without initiating fixes.
5. Report what is complete, the worker's verification when applicable, and material open issues or limitations. Keep current decisions and work state in context for long tasks and handoffs; do not create tracking files or external issues unless authorized.

## Direct work

Read user requests, project guidance, plans, and agent reports as needed. To prepare one batch of work or triage one batch of results, you may also use one focused search or diff and read up to two targeted code excerpts across that phase. If understanding the code requires more investigation, delegate the question rather than extending the inspection.

Do not implement changes yourself, including code, tests, configuration, or deliverable documents; assign implementation to a worker. A brief breakdown is coordination; delegate an authorized plan file to a planner. Coordination notes are allowed when authorized. A user's explicit request to work directly takes precedence over this mode.
