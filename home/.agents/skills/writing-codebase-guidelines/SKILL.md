---
name: writing-codebase-guidelines
description: Write durable, project-specific guidance for future agents.
disable-model-invocation: true
---

# Writing Codebase Guidelines

Capture durable, project-specific guidance for future work. Guidelines can cover code, workflows, documentation, and other project conventions.

## Store Contract

Use this flat structure in the current repository:

```text
docs/codebase-guidelines/
├── INDEX.md
└── <semantic-guideline-slug>.md
```

Use stable semantic filenames without dates.

`INDEX.md` is the router and has this shape:

```markdown
# Codebase guidelines

| Guideline | Purpose | Read when |
|---|---|---|
| `./validate-at-boundaries.md` | Keep external-data handling at system boundaries. | Adding adapters, parsing external payloads, or moving validation logic. |
```

Each guideline has exactly one row. Sort rows by file path. Keep every cell on one line and escape any literal table pipe.

## Writing Guidelines

Choose a structure that fits the subject: a short rule, a procedure, related conventions, or an explanation of a project constraint.

- State the guidance directly and make clear when it applies.
- Include the reasons, constraints, and exceptions needed to apply it correctly. Ground factual claims and rationale in the available evidence.
- Add examples, code, commands, diagrams, or references when they clarify the guidance. Examples may be simplified or constructed if they accurately express the guidance; make clear when they are illustrative.

Write current guidance that a future reader can use without the original conversation. Let the content determine the headings and level of detail.

## Capture Workflow

1. Establish what the user wants future agents to know or do, using the request, conversation, and any supplied material.
2. Read `docs/codebase-guidelines/INDEX.md` when it exists and follow its purpose and read-when entries to related guidelines. Inspect relevant project material, including the implementation and diff when useful.
3. Capture the underlying lesson at the scope supported by the evidence. Distinguish the user's intended practice from existing behavior. Ask when unresolved uncertainty would change the guidance or its scope.
4. Update an existing guideline when it covers the same subject; write a new one when the guidance has a distinct purpose or scope. Keep related guidance together, preserve still-current content, and replace stale guidance instead of appending history.
5. Update the corresponding index entries with a brief purpose and concrete `Read when` conditions. Check that index paths resolve and entries follow the Store Contract, then follow Instruction Integration.

## Instruction Integration

Future agents consume the store through repository instructions, not through this skill. The required block is static:

```markdown
## Codebase guidelines

Before sketching or implementing code changes, read `docs/codebase-guidelines/INDEX.md`, then read every guideline whose `Read when` conditions match the task.
```

After writing the guidelines, inspect root `AGENTS.md` and `CLAUDE.md`:

- If the exact block is present, make no instruction-file change.
- If equivalent non-canonical wording exists, show it and ask permission to replace it with the exact block.
- If neither file exists, ask permission to create `AGENTS.md` containing the exact block.
- If one substantive file exists, ask permission to edit it and ask where to place the block.
- If one file only includes or redirects to the other, treat the other as the substantive target.
- If both files contain independent substantive instructions, ask which file to edit, then ask where to place the block.

Show the proposed instruction-file change before applying it. If the user declines, leave the completed guideline and index changes intact and report that automatic consumption remains unconfigured. Never adapt the canonical block's wording.
