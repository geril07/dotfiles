---
name: i-want-plan
description: Explicit user invocation required. Load this skill only when the current user explicitly asks to use or run this skill.
---

Create a disposable implementation spec. Default location: `./plan-<slug>.md`

Investigate the relevant codebase before writing the plan. Record conclusions from that investigation rather than the investigation process.

## Plan structure

**Goal**, **Context**, **Requirements**, **Approach**, and **Verification** are required.

Include an optional section only when it contains information that could materially affect implementation or verification.

```markdown
# <Outcome-oriented title>

## Goal

<!-- What outcome does this change produce, and why? State the problem/current behavior only when needed to understand the outcome. -->

## Context

<!-- Verified facts about the current code that the implementer needs: relevant files, components, data flow, existing contracts. Current state only; the target state belongs in Approach. -->

## Requirements

<!-- Numbered so Verification can reference them. -->

- R1: <observable end-state behavior>
- C1: <property that must hold after the change: preserved behavior, compatibility, or implementation limit>
- Out of scope: <meaningful exclusion a reader could reasonably expect to be in scope>

## Decisions

<!-- Optional. Non-obvious choices already made, with brief reasoning when it prevents accidental revisiting. Include unverified assumptions here with the impact if they are wrong. -->

## Approach

<!-- Describe the implementation strategy: relevant components/files, important contracts, data flow, technical decisions, and sequencing constraints. Keep local coding mechanics for implementation. -->

## Phases

<!-- Optional. Only when the user requests phased execution. State the per-phase rule once (e.g. "Commit after each phase"). Each phase ends in a working, verifiable state. -->

1. <scope> — checkpoint: <command or observable result>

## Risks

<!-- Optional. Concrete failure scenarios and edge cases (boundary conditions, failure paths, concurrency, idempotency, unusual state transitions) that materially influence the implementation. Include mitigation where useful. -->

## Verification

<!-- Mechanically demonstrate that the complete change works. Prefer exact commands and observable results. Reference the requirement IDs each item covers. -->

- `<exact command>` → <expected result> (R1)
- <observable behavior> (C1)

## Open questions

<!-- Optional. Unresolved questions whose answers could change the implementation or block progress. State why each answer matters. Remove resolved questions and capture consequential answers in Decisions. -->
```

## Writing rules

- State each fact once, in the section where it is most useful.
- Include project-specific and change-specific information.
- Prefer facts verified from the repository over assumptions.
- Use exact file paths, symbols, interfaces, and commands when they make the plan more actionable.
- Describe implementation at the level of strategy, contracts, affected components, and meaningful sequencing.
- Cover every R and C item with at least one Verification item.
- Make verification specific enough that another agent can determine whether the change is complete.
- Keep optional sections absent when they add no material information.
- Keep the plan readable in one pass.

## Boundaries

- Create no additional spec, design, task, checklist, research, or decision documents.
- Do not modify implementation files while producing the plan.
- Add Phases only when the user requests phased execution.
- The plan is ready for handoff only when Open questions is absent. Tell the user which questions remain.
- Do not invent risks, assumptions, questions, edge cases, or exclusions merely to populate sections.
- Do not copy generic engineering advice already implied by the repository or normal development practice.
