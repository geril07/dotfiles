---
name: i-want-plan
description: Explicit user invocation required. Load this skill only when the current user explicitly asks to use or run this skill.
---

Create a disposable implementation spec. Default location: `./plan-<slug>.md`

Investigate the codebase first. Write conclusions, not the investigation transcript.

## Principles

- Exact files, symbols, signatures, routes, types, components — not prose descriptions.
- Show diffs, not before/after pairs.
- Omit irrelevant sections. Do not fill the template for completeness.

## Diff notation

Use structural diffs when something existing changes. Not valid patch syntax — match the shape to what's changing.

```diff
  unchanged
+ added
- removed
```

Works for interfaces, component trees, file trees, data shapes, state transitions, call flows. Pick the representation that fits.

Show the complete target structure instead of a diff when most of it is new or diff markers would dominate.

## Representations

Pick the smallest view that makes the point clear. Use one, use several — unlikely you need all of them.

- Show UI structure as a component tree, including state and module boundaries that matter:

```diff
  <SessionPage> (src/routes/session.tsx)
    useSessionEvents()
    <SessionToolbar> (src/components/toolbar.tsx)
+     <RunSkillButton /> (src/components/run-skill.tsx)
    <SessionTimeline>
+     <SkillResultCard />
```

- Show changed or new interfaces as a structural diff:

```diff
  JobService (src/jobs/service.ts)
      get(id: JobId): Promise<Job>
+     retry(id: JobId): Promise<JobAttempt>

  JobStatus (src/jobs/types.ts)
-     "pending" | "running" | "failed"
+     "pending" | "running" | "failed" | "retrying"
```

- Show runtime flow as a call tree or call chain:

```diff
  submitForm
    createSession
      persistPrompt
+     expandSkillMention
      launchAgent
```

- Show file responsibility as a file tree:

```diff
  src/
  ├── commands/
+ │   └── show-me.ts
  ├── sessions/
- └── transport.ts
+ └── transport/
+     ├── client.ts
+     └── stream.ts
```

- Show state or data shape changes:

```diff
  JobAttempt (src/jobs/types.ts)
      id
      jobId
      createdAt
+     retryOf: AttemptId | null
```

- Show interaction or async sequences with Mermaid when a flat tree cannot capture concurrency or back-and-forth.

## Plan structure

All sections except Goal and Implementation are optional. Omit what does not apply.

```markdown
# <Outcome-oriented title>

## Goal

<!-- What outcome does this change produce. -->

## Non goals

<!-- Only meaningful exclusions a reader might otherwise expect in scope. -->

## Acceptance criteria

<!-- Observable end-state. What must be true when the work is done. Not an exhaustive test list — that belongs in Verify. -->

## Open questions

<!-- Questions that could change the implementation or block a slice. State the impact if answered differently. Remove when resolved — move the answer to Decisions. -->

## Decisions

<!-- Non-obvious design choices with short reasoning. Do not record obvious choices. -->

## Assumptions

<!-- Things treated as true but not verified. State the impact if wrong. -->

## Risks

<!-- Material risks with mitigation. Concrete scenarios, not generic warnings. -->

## Invariants

<!-- Hard rules the implementation must not violate. Concrete, auditable. -->

## Edge cases

<!-- Failure paths, concurrency issues, boundary conditions, idempotency. Things an implementation agent could plausibly get wrong. -->

## Technical delta

<!-- Main review surface. A reader should understand the architectural shape without reading Implementation. Use only subsections that matter. Place context beside the thing it explains. -->

### Component tree

<!-- UI structure changes. Show hierarchy, state, and module boundaries that matter. -->
<!-- UI only. Omit this section when there is no UI change. -->

### Interfaces

<!-- Changed or new contracts only: signatures, types, endpoints, schemas, props, events. Do not dump large unchanged definitions. -->

### Flow

<!-- Changed runtime path. Use the representation that fits: call chain, request flow, event flow, data flow, state transition. Focus on what changes, not the entire system. -->

### Data / state

<!-- Schema diffs, state shape changes, migrations, persistence. Include rollout constraints when relevant. -->

### Files

<!-- Structural overview of all files affected — the "blast radius" view. Implementation slices reference these without re-listing. -->

## Implementation

<!-- Vertical slices ordered by dependency. Each slice: heading + bullets with specific actions. Prefer end-to-end slices over horizontal grouping (backend / frontend / tests). -->

### 1. <Working outcome>

- <specific action>

## Verify

<!-- How to prove the entire change works. Mechanically checkable: targeted test commands, typecheck, API responses, persisted state, browser behavior, regression cases. Not a single generic "run tests." -->

- `<exact command>`
- <observable behavior>
```
