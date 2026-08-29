---
name: i-want-plan
description: Explicit user invocation required. Load this skill only when the current user explicitly asks to use or run this skill.
---

Create a plan(default location is `./plan-<slug>.md`)

Plan structure:

```markdown
# <Title>

## Goal

## Non-goals

## Relevant context

Descriptions, file and code references

## Decisions

What was discussed with a user

## Assumptions

Decisions made for user or without user

## Open questions

Worth discussing

## Invariants

## Acceptance criteria

## Risks and mitigations

## Implementation checklist

Vertical slices based

### <Slice 1>

#### Call-stack diff

#### Component tree diff (optional)

#### Steps
```
