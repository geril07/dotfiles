---
name: i-want-plan
description: Explicit user invocation required. Load this skill only when the current user explicitly asks to use or run this skill.
---

Create a disposable implementation spec. Default location: `./plan-<slug>.md`

Investigate the relevant codebase before writing the plan. Record conclusions from that investigation rather than the investigation process.

## Plan structure

**Goal**, **Approach**, and **Verification** are required.

Include an optional section only when it contains information that could materially affect implementation or verification.

```markdown
# <Outcome-oriented title>

## Goal

<!-- What outcome does this change produce? State the problem/current behavior only when needed to understand the outcome. -->

## Non-goals

<!-- Meaningful exclusions a reader could reasonably expect to be in scope. -->

## Acceptance criteria

<!-- Observable properties of the completed change. Focus on end-state behavior; detailed checks belong in Verification. -->

## Open questions

<!-- Unresolved questions whose answers could change the implementation or block progress. State why each answer matters. Remove resolved questions and capture consequential answers in Decisions. -->

## Decisions

<!-- Non-obvious choices already made. Include brief reasoning when it helps prevent the decision from being revisited accidentally. -->

## Assumptions

<!-- Material facts currently treated as true but not verified. Minimize these through codebase investigation. State the impact if an assumption is wrong. -->

## Invariants

<!-- Existing behavior, contracts, or properties that must remain true. Keep them concrete and auditable. -->

## Risks

<!-- Concrete failure scenarios with material impact. Include mitigation where useful. -->

## Edge cases

<!-- Boundary conditions, failure paths, concurrency, idempotency, unusual state transitions, or similar cases that materially influence the implementation. -->

## Approach

<!-- Describe the implementation strategy: relevant components/files, important contracts, data flow, technical decisions, and sequencing constraints. Keep local coding mechanics for implementation. -->

## Verification

<!-- Mechanically demonstrate that the complete change works. Prefer exact commands and observable results. Cover the changed behavior and important regressions. -->

- `<exact command>` → <expected result>
- <observable behavior>
```

## Writing rules

- State each fact once, in the section where it is most useful.
- Include project-specific and change-specific information.
- Prefer facts verified from the repository over assumptions.
- Use exact file paths, symbols, interfaces, and commands when they make the plan more actionable.
- Describe implementation at the level of strategy, contracts, affected components, and meaningful sequencing.
- Make verification specific enough that another agent can determine whether the change is complete.
- Keep optional sections absent when they add no material information.
- Keep the plan readable in one pass.

## Boundaries

- Create no additional spec, design, task, checklist, research, or decision documents.
- Do not modify implementation files while producing the plan.
- Do not invent risks, assumptions, questions, edge cases, or exclusions merely to populate sections.
- Do not copy generic engineering advice already implied by the repository or normal development practice.
