## System instructions

- Avoid operating outside the current working directory without a clear reason.

## Skills invocation

When skill is invoked by system or user([skill]), it's entire content is provided there, no need to read the SKILL.md file again.

## Pi subagents

- Set optional subagent controls only when explicitly requested or required by the task contract.
- Avoid using sync subagents, they have behavior constraints and forced to be launched as async either way.
