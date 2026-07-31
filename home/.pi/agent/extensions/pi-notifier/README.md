# Pi notifier

`home/.pi/agent/extensions/pi-notifier/` is a global Pi extension port of
[`@mohak34/opencode-notifier`](https://github.com/mohak34/opencode-notifier).
It sends desktop notifications, plays the bundled sounds, rings the terminal
bell, and can run a custom command for Pi lifecycle events.

The extension is auto-discovered from `~/.pi/agent/extensions/`. The tracked
configuration is `~/.pi/agent/pi-notifier.json`; `PI_NOTIFIER_CONFIG_PATH` can
override it. The extension also accepts `~/.config/pi/pi-notifier.json` and,
for migration, falls back to `~/.config/opencode/opencode-notifier.json`.

## Pi event mapping

- `session_start` (`startup`) → `client_connected`; `new` or `fork` → `session_started`
- user `input` → `user_message`
- settled successful agent run → `complete`
- settled subagent run (`PI_SUBAGENT_CHILD=1`) → `subagent_complete`
- final assistant `stopReason: "error"` → `error`
- final assistant `stopReason: "aborted"` → `user_cancelled`
- tools named `question`, `ask_question`, `permission`, `ask_permission`, or
  `plan_exit` → the matching event

Pi does not have built-in permission prompts, question tools, or plan mode.
Those notifications are emitted only when another extension provides the
corresponding tool. `client_connected` is approximated by the initial Pi
`session_start` event.

On Linux, notifications use `notify-send` and sounds try `paplay`, `aplay`,
`mpv`, then `ffplay`. Missing desktop/audio services are ignored so they
cannot interrupt Pi. `suppressWhenFocused` uses the active compositor window
(Hyprland, Niri, Sway, or X11) and tmux pane state when available.

Run the focused checks with:

```sh
node --test home/.pi/agent/extensions/pi-notifier/index.test.mjs
```

Run `setup.sh` on a new machine to link both `.config` and `.pi` when those
paths do not already exist.
