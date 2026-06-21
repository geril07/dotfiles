---
name: brainstorming
description: Guides structured brainstorming to turn ideas into approved designs before implementation. Use when the user wants to plan creative work, new features, behavior changes, components, or ambiguous implementation requests.
---

# Brainstorming

## Quick start

When the user wants to add a new feature, first inspect the relevant files and existing patterns. Then ask one focused clarifying question at a time, compare 2-3 viable approaches with tradeoffs, recommend the best one, and get explicit approval before writing any code.

## When To Use

- Creating features, components, flows, or user-facing behavior
- Modifying behavior where intent, constraints, or tradeoffs are unclear
- Turning a vague idea into a concrete design
- Deciding between multiple possible implementation approaches
- Planning work that touches several files, modules, or user interactions

## When Not To Use

- Pure bug fixes where the expected behavior is already clear
- Mechanical refactors with no product or design decision
- Code review requests
- Direct informational questions
- Requests where the user explicitly asks to skip planning

## Core Rules

1. Explore the project context first when the answer depends on existing code, docs, or conventions.
2. Ask one clarifying question at a time.
3. Provide your recommended answer with each question.
4. Prefer multiple choice questions when possible.
5. Do not implement until the user approves the design.
6. Keep the process as small as the task allows.
7. If a question can be answered by inspecting the codebase, inspect the codebase instead of asking the user.

## Workflows

1. Explore context: inspect relevant files, docs, and existing patterns when applicable.
2. Summarize what is already known in a few sentences.
3. Assess scope: if the request spans multiple independent systems, recommend decomposing it before continuing.
4. Ask clarifying questions one at a time until the key decisions are resolved.
5. Propose 2-3 approaches with tradeoffs.
6. Recommend one approach and explain why.
7. Present the design at the right level of detail for the task.
8. Ask the user to approve or revise the design.
9. After approval, ask whether to proceed with implementation.

## Design Approval Gate

Present the design before implementation. Scale the detail to the task.

For small changes, the design may be a short paragraph covering intent, affected area, and verification.

For larger changes, cover:

- Goal
- Non-goals
- User or system behavior
- Affected areas or architecture
- Data flow or state flow, if relevant
- Error handling, if relevant
- Testing or verification
- Open risks

Ask for explicit approval before implementation.

## Outputs

Default output is an approved design in chat.

Write a spec file only when the user explicitly requests it. Do not commit anything unless the user explicitly asks.

## Advanced features

See [REFERENCE.md](REFERENCE.md) for detailed question strategies, approach comparison templates, and red flags.
