# Shared Claude Code configuration

A local plugin and an opt-in profile sync. Nothing changes until you run
`sync-claude --apply`. Needs Python 3.13+, Git, and Claude Code 2.1.310 or later
(skills-directory plugins). Linux/POSIX only.

## Layout

- `plugin/`: the `my` plugin: skills, five agents, MCP servers, and the extra-context hook.
- `plugin/skills`: a symlink to `home/.agents/skills`; skills run as `/my:<name>`.
- `CLAUDE.md`: Claude-specific instructions; imports `~/.config/opencode/AGENTS.md`.
- `settings.json`: the fragment merged into each profile's settings.
- `../bin/sync-claude`: the only command that changes profiles.

- `statusline-command.sh`: the status line; settings call it from the profile directory.

Each profile gets `skills/my → claude/plugin`, `CLAUDE.md → claude/CLAUDE.md`, and
`statusline-command.sh → claude/statusline-command.sh`.
Credentials, sessions, history, `skills/synced/`, and other settings stay per profile.
The whole `~/.claude` directory is never linked into dotfiles.

## Agents

Descriptions and prompt bodies match `home/.pi/agent/sidekicks/` verbatim
(`tests/test_agents.py` enforces this). No tool restrictions, no custom general agent.

| Agent        | Model  | Effort  |
| ------------ | ------ | ------- |
| explorer     | haiku  | high    |
| researcher   | sonnet | medium  |
| e2e-verifier | sonnet | medium  |
| worker       | sonnet | high    |
| reviewer     | opus   | medium  |

## Apply

Close affected Claude sessions first: Claude and Orca also rewrite settings.

```sh
./bin/sync-claude --check                 # personal + every ~/.claude-profiles/* (default)
./bin/sync-claude --apply
./bin/sync-claude --apply --profile work  # one profile
./bin/sync-claude --apply --clear-memory  # also delete auto-memory dirs, never sessions
```

Exit codes: 0 in sync, 1 drift, 2 error. All profiles are validated before any write.
Existing files at link locations are conflicts; move them yourself. A `settings.json`
symlink is replaced with a private merged copy; its target is not modified.

Orca hooks are copied from `~/.claude/settings.json` to named profiles on every
sync, because Orca installs them only in the primary profile. Rerun sync after
Orca updates them.

The work profile also uses the Confluence MCP server:

```sh
CLAUDE_CONFIG_DIR=~/.claude-profiles/work claude mcp add-json -s user ave-atlassian \
  '{"command":"uvx","args":["mcp-atlassian"],"env":{"CONFLUENCE_URL":"${AVE_CONFLUENCE_URL}","CONFLUENCE_PERSONAL_TOKEN":"${AVE_CONFLUENCE_API_KEY}"}}'
```

## Extra context

`SessionStart` and `SubagentStart` add instruction files selected by the git root
(or launch directory) from `extra-context.json`, the same file Pi and OpenCode read
(`$OPENCODE_CONFIG_DIR`, else `~/.config/opencode`; `EXTRA_CONTEXT_CONFIG` overrides).
Its `mcp` entries are ignored here. Invalid config is reported to Claude's context.

## Verification

```sh
python3 -m unittest discover -s claude/tests
python3 claude/tests/probe_claude.py  # real CLI, temp HOME, fake key, loopback API
```

Not covered yet: model-driven subagent delegation, `CLAUDE.md` in subagents,
the Orca UI, T3 entry points, plugin MCP loading. `claude plugin validate` warns
about the skills symlink and catalog metadata; local loading works regardless.
