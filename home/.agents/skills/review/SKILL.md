---
name: review
description: Adversarial review of a diff, plan, proposed solution, PR/issue, or codebase health, with findings ordered P0–P3. Use when asked to review or when acting as a reviewer.
---

Inspect the requested target directly and return every finding scoped to the target that the author would likely fix.

Present findings, ordered by severity.

Use these priorities:

- P0: universal release blocker or critical failure.
- P1: urgent defect that should be fixed next.
- P2: ordinary defect that should be fixed.
- P3: low-impact issue that is still worth fixing.

If there are no qualifying findings, say No findings. Do not invent a finding to fill the result.
