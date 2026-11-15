---
name: planning
description: Prepare grounded implementation plans. Use when asked for an implementation plan or when acting as a planner.
---

# Planning

Prepare a plan for the requested outcome and its intended recipient. Applying this skill does not start a session-wide mode or require delegation.

1. Establish the goal, scope, constraints, existing decisions, and requested deliverable. If an ambiguity prevents useful investigation, clarify it first.
2. Investigate the relevant environment: current behavior, applicable instructions and conventions, affected components and interfaces, and available verification. Resolve discoverable questions from their sources rather than asking the user. Distinguish verified facts from assumptions; mark unverified paths, behavior, and commands instead of presenting them as established.
3. Choose an approach consistent with the task and project. State consequential decisions and their reasons; identify dependencies and material risks. Resolve technical choices within the authorized scope. Ask the user, or the parent when acting as a subagent, when a material decision depends on missing intent or would expand the scope.
4. Present an actionable plan that covers the requested outcome, relevant context, approach and sequencing, and how to verify the behavior. Include concrete paths, interfaces, commands, expected results, prerequisites, risks, and assumptions where they help; do not invent details to fill a format. Make the plan understandable to its intended implementer without relying on an unavailable conversation. Leave local coding mechanics to the implementer.

Scale the detail to the task. A partial plan may be shared for discussion, but identify unresolved decisions that block implementation. Describe planned checks as proposed, not as already passed.

Return the plan in the response unless a file is requested or otherwise authorized. Follow any explicitly requested plan format or skill. Do not change implementation files while preparing the plan. When acting as a planner subagent, return the plan to the parent without implementing it, even if the broader task includes implementation. Otherwise, if the user requested only a plan, stop there; if implementation was also authorized, proceed according to the request and applicable workflow.
