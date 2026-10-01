# Local OpenAI Fast Mode

Adapted from [johncmunson/pi-openai-fast-mode](https://github.com/johncmunson/pi-openai-fast-mode), version 0.5.0 (MIT). Original source commit: `edd2a41e697bb6cc2df8179f45ff0e4f95720bbc`. The original license is in `LICENSE`.

Pi discovers this directory through `~/.pi/agent/extensions/`. Do not also enable the upstream npm package. No build is needed.

## Configuration

Edit `~/.pi/agent/extensions/pi-openai-fast-mode.json` (or the same path under `PI_CODING_AGENT_DIR`):

```json
{
  "enabled": false,
  "targets": [
    { "provider": "openai-codex", "model": "gpt-6-luna", "serviceTier": "priority" },
    { "provider": "openai-codex", "model": "gpt-6.1-sol", "serviceTier": "priority" }
  ]
}
```

- Only exact `provider`/`model` pairs in `targets` receive `service_tier` when enabled.
- Supported providers are `openai` and `openai-codex`. An omitted `serviceTier` means `priority`.
- You maintain the list. The extension never replaces it, discovers model support, or contacts a catalog server.
- A target requests that tier; it does not prove server support or guarantee faster processing. Fast Mode can increase cost or quota use.
- An empty `targets` array opts out of every model. A missing file means disabled with no targets and is not created at startup.
- Invalid JSON, invalid fields, and duplicate targets produce an error. The file is not repaired or overwritten. Failed startup/reload disables this extension's request changes until a successful reload.
- This fork uses only the user config. Legacy `extensions/pi-openai-fast-mode/config.json` and project `.pi/pi-openai-fast-mode/config.json` files are not read. The separate filename prevents still-running upstream sessions from overwriting the new config at shutdown.

Run `/reload` or start a new Pi session after manual changes. Each session retains its own snapshot, including its targets. Switching models uses that same list. Already running sessions do not watch the file.

## Commands and persistence

```text
/fast          Toggle
/fast toggle   Toggle
/fast on       Enable
/fast off      Disable
```

In the TUI, `/fast` saves only `enabled`. It reads the current file before writing so manual targets, custom tiers, and other fields are retained. It does not reload the current session's targets. Atomic replacement prevents new sessions from reading partial JSON; existing file symlinks are retained.

In print, JSON, and RPC modes, the command changes only the current session. These modes never save the shared toggle. `pi --fast` also enables only the current session in any mode; it does not change the file. Startup and shutdown never write it.

The TUI shows a right-aligned `fast` indicator below the editor only when enabled and the current model is in the list. It reports the requested mode, not a server-confirmed tier.

New headless sessions that load this extension read the saved toggle and targets at startup. Existing children retain their snapshot and cannot restore an old toggle when they finish. This extension does not change `pi-subagents`; its own `fast: true` request hook remains independent. `/fast off` disables only this extension's injection, not another hook or a server-side default tier.

Multiple TUI sessions can still save different toggles: the last completed save wins. Do not manually edit the file during `/fast`; an external editor does not participate in the write queue.

## Checks

```bash
cd home/.pi/agent/extensions/pi-openai-fast-mode
npm ci --ignore-scripts
npm run check
```

Tests cover config preservation, invalid files, missing files, session snapshots, reload, model matching, headless read-only behavior, temporary CLI enablement, and real Pi SDK loading without model API requests.

The test dependency on Pi 0.87.1 currently includes `brace-expansion@5.0.9`, which `npm audit` reports as a high-severity denial-of-service risk. Normal `npm audit fix`/`npm update` do not replace that packaged dependency. The extension adds no runtime dependencies; this test setup does not update the globally installed Pi.
