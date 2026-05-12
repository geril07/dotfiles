# Brainstorming Reference

## Question Strategy

Resolve decisions in dependency order:

1. Goal: what problem are we solving?
2. Users: who is this for?
3. Success criteria: what must be true when this is done?
4. Scope: what is included and excluded?
5. Constraints: technical, UX, performance, security, compatibility, or timeline limits.
6. Behavior: what should happen in the main path and edge cases?
7. Integration: where should this fit in the existing system?
8. Verification: how will we know it works?

Prefer questions that make progress:

- Ask about decisions that affect the design.
- Avoid asking for information already available in the codebase.
- Offer concrete choices instead of open-ended prompts when practical.
- Include a recommendation so the user can accept, reject, or adjust it quickly.

## Approach Comparison

Before presenting the final design, compare 2-3 viable approaches.

For each approach, cover:

- What it is
- Why it might be good
- Main tradeoff or risk
- When it would be the right choice

Lead with the recommended approach unless another ordering makes the tradeoff clearer.

## Red Flags

- Starting implementation before the design is approved
- Asking broad questions that do not resolve a decision
- Skipping project exploration when existing code should answer the question
- Treating a large multi-system idea as one small feature
- Leaving success criteria vague
- Presenting only one approach when real alternatives exist
- Adding documentation or process that is heavier than the task needs
