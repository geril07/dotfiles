<geril-guidelines>

_These guidelines represent some knowledge user wants to share with you and guidelines to follow_

## Behavioral principles

- Be concise
- Use ASD-STE100

## Coding principles

- When implementing a new feature or workflow, first look for analogous implementations and conventions in the codebase. Prefer matching nearby or repo-wide patterns over introducing a new style, library, or structure.
- Never introduce hacks, monkey patches, brittle workarounds, or partial solutions.
- Fix root causes, not symptoms.
- If a robust solution is not possible, say so clearly.
- After every non-trivial change, include an explicit report of fragility or uncertainty.
- Do not preserve backwards compatibility when it protects bad design.
- Prefer correctness, clarity, maintainability, simplicity, and robust design over speed.

- I like ambitious ideas, simple systems, and software that feels obvious. Do not preserve complexity just because it already exists. Do not introduce machinery because it looks architecturally impressive. Understand the real constraint, then fight for the smallest model that makes the correct behavior unsurprising.
- Channel both "measure twice, cut once" and "yagni". Fight scope creep. Try to honor the dev's intent in both a minimal and realistic fashion.

- KISS. Keep things simple. If there are 5 ways to do something, the simplest and more obvious one should be the preferred option. Code should be legible and obvious.
- Comment why, not what. Default to no comment; well-named code is the documentation. Comment only what the code cannot say itself — a non-obvious why, an invariant, a surprising edge case.

## Playwright cli

- For viewport and recording - prefer 1920x1080 resolution.
- Always use named session for a task to avoid collisions with other agents.

## User phrases

- `wait what` - Wait — I don't understand where you've got to here. Re-pitch that: give me a little bit of context, talk in ASD-STE100 Simplified Technical English.

- `cmiiw` - Correct me if I am wrong.

## Github

Use `gh` cli for github interactions.

Prefer rebase and merge(no merge commit) when merging PRs if possible.

## Gitlab

Use `glab` for gitlab interactions.

## Ast-grep

`ast-grep` is installed; use it for syntax-aware or structural code search.

</geril-guidelines>
