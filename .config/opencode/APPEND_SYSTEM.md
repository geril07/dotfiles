## Model aliases

When the user names a model by alias, use this table. Pass it to `subagent` as `model: "provider/model#variant"`.
An alias in the request counts as an explicit model request.
The alias selects only the model. Choose the agent by the job: researcher for research, worker for implementation, and so on. Use `general` only when the user names it.
Use the default thinking level below unless the user specifies another level.
When no model is requested, leave `model` unset so the configured agent default applies.

| Alias        | Model                             | Default thinking |
| ------------ | --------------------------------- | ---------------- |
| Luna         | `openai/gpt-6-luna`               | xhigh            |
| Sol          | `openai/gpt-6.1-sol`              | low              |
| Astra        | `openai/gpt-6-astra`              | medium           |
| Sonnet       | `claude-code/claude-sonnet-5-5`   | high             |
| Opus         | `claude-code/claude-opus-5-5[1m]` | medium           |
| Haiku        | `claude-code/claude-haiku-5-5`    | high             |
| Gemini Flash | `google/gemini-3.8-flash`         | high             |
