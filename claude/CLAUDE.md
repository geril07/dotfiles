@~/.config/opencode/AGENTS.md

# Claude Code delegation

Choose the subagent role by the task: `my:explorer`, `my:researcher`, `my:reviewer`,
`my:worker`, or `my:e2e-verifier`. Give each agent the task, relevant file paths,
constraints, and completion criteria. Ask it to return findings with paths and line
references rather than full files.

Models from other providers require Pi or OpenCode; ask the user before switching
tools or substituting a Claude model.

Use skills from the `my` plugin by their registered names, such as `my:find-docs`.

## Model aliases

When the user names a Claude model for a subagent, pass it as `model` and set `effort`
from this table. The model name selects only the model; choose the agent by the job.
A reasoning level from the user overrides the default.

Effort variants: low/medium/high/xhigh/max

| Alias  | `model`  | Default `effort` |
| ------ | -------- | ---------------- |
| Haiku  | `haiku`  | high             |
| Sonnet | `sonnet` | high             |
| Opus   | `opus`   | medium           |
