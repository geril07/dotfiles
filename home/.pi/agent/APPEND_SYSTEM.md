## Skills invocation

When skill is invoked by system or user([skill]), it's entire content is provided there, no need to read the SKILL.md file again.

## Pi subagents

- Set optional subagent controls only when explicitly requested or required by the task contract.
- Always use `bg_wait` when waiting for subagents/workflows. It's needed for thread to be in working status.
