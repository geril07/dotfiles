## System instructions

- Avoid operating outside the current working directory without a clear reason.

## Skills invocation

When skill is invoked by system or user([skill]), it's entire content is provided there, no need to read the SKILL.md file again.

## Pi subagents

- Set optional subagent controls only when explicitly requested or required by the task contract.
- Avoid using sync subagents, they have behavior constraints and forced to be launched as async either way.
- `subagent` is not callable from codemode scripts. Call `subagent` directly; for several children, use one `subagent` workflow call.

### Model aliases

When the user names a model by alias, use this table. Pass it as `model: "<model>:<thinking>"`.
An alias in the request counts as an explicit model request.
The alias selects only the model. Choose the agent by the job: researcher for research, worker for implementation, and so on. Use `general` only when the user names it.
Use the default thinking level. A thinking level from the user overrides the default.

Thinking level variants: low/medium/high/xhigh/max

| Alias        | Model                             | Default thinking |
| ------------ | --------------------------------- | ---------------- |
| Luna         | `openai-codex/gpt-6-luna`         | xhigh            |
| Sol          | `openai-codex/gpt-6.1-sol`        | low              |
| Astra        | `openai-codex/gpt-6-astra`        | medium           |
| Sonnet       | `claude-bridge/claude-sonnet-5-5` | high             |
| Opus         | `claude-bridge/claude-opus-5-5`   | medium           |
| Haiku        | `claude-bridge/claude-haiku-5-5`  | high             |
| Gemini Flash | `antigravity/gemini-3.8-flash`    | high             |
