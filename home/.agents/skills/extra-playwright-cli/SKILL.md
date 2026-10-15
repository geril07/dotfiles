---
name: extra-playwright-cli
description: Extra playwright-cli gotchas. Always load this skill alongside playwright-cli.
---

## GPU headless QA

For canvas/WebGL games on this AMD Linux host, create a new, uniquely named headless session:

```bash
env -u DISPLAY -u WAYLAND_DISPLAY playwright-cli -s=<name> open <url> --config="$HOME/.config/playwright/agent-gpu.json"
```

Before testing, verify hardware WebGL:

```bash
playwright-cli -s=<name> eval '() => { const gl = document.createElement("canvas").getContext("webgl"); if (!gl) throw new Error("WebGL unavailable"); const ext = gl.getExtension("WEBGL_debug_renderer_info"); if (!ext) throw new Error("Renderer unavailable"); return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL); }'
```

Require AMD/RADV, not SwiftShader, llvmpipe or lavapipe; stop and diagnose if verification fails. Record the renderer and browser version with any FPS results. The config selects GPU Vulkan rendering and a 1920×1080 viewport without desktop windows; pass it explicitly rather than changing global defaults.

Use `--headed` only when the user explicitly requests a visible browser; it overrides headless configuration. For background QA, never use `show` or attach to the user's browser. Close only sessions you created with `playwright-cli -s=<name> close`; never use `close-all` or `kill-all`.

## Existing authenticated Chrome

For a site listed in `playwright-profiles`, use that persistent profile instead of the extension.

To reuse the user's Chrome login, use `attach --extension=chrome` with the [official Playwright Extension](https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm). If it is absent, ask the user to install it in the logged-in profile.

Tell the user to approve Chrome's connection prompt before attaching, then confirm the target tab with `tab-list`:

```bash
playwright-cli -s=existing-chrome attach --extension=chrome
playwright-cli -s=existing-chrome tab-list
```

`open` creates a separate browser, not access to the user's existing tabs. If the session disappears, repeat `attach`. For an unsupported-protocol error, check CLI/extension compatibility and update the CLI through its installation manager. Finish with `detach`, not `close`, to leave the user's browser open.

## Video recording size

`video-start` defaults to the current viewport size (~800x450). Always pass an explicit frame size:

```bash
playwright-cli video-start demo.webm --size=<width>x<height>
```
