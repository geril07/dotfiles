---
name: review-loop
description: Coordinate a worker-review-fix loop. Use when the user invokes this skill, explicitly requests a multi-agent review-and-fix loop, or when active orchestration calls for review of an implementation.
---

# Review loop

Coordinate an independent review and the disposition of its findings. Respect the user's authorization for delegation, changes, and verification: a request for review alone does not authorize fixes. Request only authorized checks and report required verification that remains unperformed. Follow `delegation` when working with agents; if delegation is unavailable, report the limitation.

## Review

1. If a worker is implementing the task, have it complete the work and run the appropriate checks. If the result already exists, review it without requiring a new implementation first. If a worker is blocked or interrupted, establish what was done before deciding how to continue.
2. Ask an independent reviewer to follow the `review` skill. Give it the original goal, applicable requirements and decisions, the exact result and review scope, and relevant verification evidence. Review a stable result; identify the reviewed state, including uncommitted changes, rather than relying on a branch name or commit alone.
3. Treat the findings as input to a decision, not automatic instructions to fix everything.

## Triage

For each finding, consider the scenario, consequence, evidence, relationship to the task, and cost or risk of the change. Use the priorities defined by `review`; a priority alone does not decide disposition.

- **Fix now:** a violated requirement or a substantiated significant defect in the requested work, including a material risk caused or made reachable by the change. A low-impact issue in scope can also be worth fixing when the remedy is clear and does not alter agreed behavior.
- **Investigate:** an uncertain claim with a potentially material consequence. Ask the reviewer to clarify or safely reproduce it under `review`, or ask the worker for a targeted check; distinguish an unresolved risk from a confirmed defect.
- **Defer or reject:** a low-impact issue whose fix is disproportionate or risky, an unrelated pre-existing issue, an optional improvement outside the task, or an incorrect finding. Give the reason; do not silently discard a material risk.
- **Ask the user:** a fix requires a product decision or expands the agreed scope. A serious out-of-scope issue that makes the result unsafe or unusable must be surfaced, not hidden behind completion.

Respect the user's decisions and project requirements. Create an issue or backlog entry only when requested or otherwise authorized.

## Correct and finish

Send accepted findings to the worker with the relevant requirements and ask it to fix them or explain a disagreement. The worker runs the checks needed for its changes and reports the results.

Ask the reviewer to examine the fixes and their affected risks; broaden the review if the fix changed behavior or scope substantially. Repeat triage as needed. Stop and report unresolved blockers if iterations stop making progress. After three substantive review-fix rounds with unresolved blockers, pause and ask the user how to proceed; this is a checkpoint, not approval or automatic failure. Do not claim completion with accepted in-scope defects or required verification still outstanding.

Associate findings and verification evidence with the actual state reviewed or checked, including uncommitted changes. If relevant state has since changed, reassess affected findings and have the worker repeat only the authorized checks needed for the current result.

Have the worker run targeted checks during iteration. When the project or risk requires a full gate, have the worker run it on the final result; do not repeat it on an unchanged result. Report material findings and their disposition, the worker's verification, and any remaining limitations.
