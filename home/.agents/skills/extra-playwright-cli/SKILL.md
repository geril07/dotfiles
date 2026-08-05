---
name: extra-playwright-cli
description: Extra playwright-cli gotchas. Always load this skill alongside playwright-cli.
---

## Video recording size

`video-start` defaults to the current viewport size (~800x450). Always pass an explicit frame size:

```bash
playwright-cli video-start demo.webm --size=1280x720   # or any <width>x<height>
```
