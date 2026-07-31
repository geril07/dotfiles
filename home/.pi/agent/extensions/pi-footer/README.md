# Pi custom footer

Replaces Pi's default footer with a compact three-line layout:

```text
model thinking <> cwd branch
TPS ...  ↑input  ↓output  $cost  ctx percent/window
MCP ...
```

The third row also shows other extension statuses when they are active. The
footer consumes Pi's public `footerData.getExtensionStatuses()` API, so the
existing `pi-tps`, `goal`, and `mcp` statuses remain visible.

This extension intentionally owns `ctx.ui.setFooter()`. Do not load another
footer/statusline extension at the same time.

Run the focused checks with:

```sh
node --test home/.pi/agent/extensions/pi-footer/index.test.mjs
```
