---
name: writing-codebase-guidelines
description: Write durable codebase guidelines after the user corrects an implementation.
disable-model-invocation: true
---

# Writing Codebase Guidelines

Turn a corrected implementation into current, project-specific rules that future agents read before designing or changing code.

Capture every cohesive rule supported by the correction in its own file.

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

## Guideline Contract

Use this skeleton:

````markdown
# <Imperative guideline title>

## Guidance

<State the current implementation rule directly. Include necessary constraints.>

## When to Apply

<List concrete conditions where the rule governs the implementation.>

## Why This Matters

<Explain the project-specific reason and consequence.>

## Examples

### Before

```<language>
<Exact rejected implementation>
```

### After

```<language>
<Exact corrected implementation>
```
````

`Guidance`, `When to Apply`, `Why This Matters`, and `Examples` are required. Preserve exact before-and-after code, configuration, or other implementation material from the correction. Keep the document future-facing: state the current rule first and omit timestamps, issue provenance, commit history, and investigation narrative.

## Capture Workflow

1. Read the user's correction in the current conversation.
2. Inspect the corrected implementation and relevant diff. Treat the stated intent and final implementation together as the source of truth. Ignore unrelated worktree changes.
3. Ask one focused question when the evidence conflicts, the intended scope is ambiguous, or exact before-and-after material cannot be identified. Never invent missing rationale or examples.
4. Distill every independent guideline supported by the correction. Keep related constraints together; split unrelated rules into separate files.
5. Read `docs/codebase-guidelines/INDEX.md` when it exists. Use its purpose and read-when entries to select likely related guidelines, then read those files.
6. When a proposed guideline overlaps an existing one, show the matching file and ask whether to update it or create a separate guideline. Resolve each overlap before writing it.
7. Create a semantic filename for a new guideline. When updating, preserve still-current manual content and replace stale guidance instead of appending history.
8. Write every guideline using the contract above.
9. Create or update its index row. The purpose briefly states the rule's outcome; `Read when` lists concrete task conditions. Do not duplicate the full guideline in the index.
10. Sort index rows by file path and run the validation checks.
11. Run the instruction integration check.

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

## Validation

Before reporting completion, verify:

- Every created or updated guideline contains `Guidance`, `When to Apply`, `Why This Matters`, `Examples`, `Before`, and `After`.
- Before-and-after material is exact and grounded in the correction.
- Every created or updated guideline has exactly one index row.
- Every index path resolves.
- Index rows are sorted by file path.
- Unrelated worktree files were not modified.

Fix validation failures before finishing.

## Completion

Report only the files affected and instruction integration state:

```text
Guidelines:
- docs/codebase-guidelines/<file>.md (created|updated)

Index:
- docs/codebase-guidelines/INDEX.md (created|updated)

Instruction integration:
- <AGENTS.md|CLAUDE.md> (canonical|updated|declined|missing)
```
