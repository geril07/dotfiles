---
name: extra-playwright-cli
description: Extra playwright-cli gotchas. Always load this skill alongside playwright-cli.
---

## Headed mode

By default playright cli opens in headless mode, if your intent is to open a headed browser, include `--headed` to the command.

Use headed when:

- User requests.
- Testing applications / games that use canvas with GPU rendering.
- If you need it for some reason(idk why so there is no constraint not to use it).

## Video recording size

`video-start` defaults to the current viewport size (~800x450). Always pass an explicit frame size:

```bash
playwright-cli video-start demo.webm --size=<width>x<height>
```
