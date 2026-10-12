---
name: extra-playwright-cli
description: Extra playwright-cli gotchas. Always load this skill alongside playwright-cli.
---

## Headed mode

By default playwright-cli opens in headless mode. Include `--headed` when:

- The user requests a visible browser.
- Testing applications / games that use canvas with GPU rendering.

## Existing authenticated Chrome

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
