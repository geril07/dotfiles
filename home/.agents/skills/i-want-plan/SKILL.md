---
name: i-want-plan
description: Explicit user invocation required. Load this skill only when the current user explicitly asks to use or run this skill.
disable-model-invocation: true
---

Create a plan using this structure:

```markdown
# Title

> One-sentence description of the intended outcome.

## Context

The problem, motivation, and intended outcome.

## Scope and non-goals

What the plan includes and what is intentionally excluded.

## Acceptance criteria

Observable conditions that must be true for the implementation to be considered complete.

## Relevant context

Files, symbols, and existing patterns that inform the implementation but may not themselves change.

## Implementation

### 1. Step name

**Purpose:** What this step accomplishes and why it exists.

**Files**

Files created or modified by this step.

**Contracts and symbols**

Interfaces, types, schemas, APIs, events, and important symbols introduced or changed. Omit when not applicable.

**Tasks**

Concrete implementation checklist.

**Verification**

Tests and checks that verify this step independently.

## End-to-end verification

Checks that confirm all implementation steps work together and produce the intended outcome.

## Risks

Material implementation risks and their mitigations. Omit when none exist.

## Open questions

Unresolved decisions that affect implementation. Omit when none exist.
```
