---
description: Implement with a worker, then run code and complexity reviews
argument-hint: "[task or review focus]"
---

Run this workflow for the current task:

1. Launch `worker` subagent with the complete implementation request.

2. After the worker finishes, launch `code-reviewer` and `complexity-analyzer` in parallel.

3. **Synthesize**
   - Separate implementation status, correctness findings, and complexity findings.
   - Include file and line references, severity or priority, evidence, and concrete fixes where applicable.
   - Distinguish blockers and fixes worth doing now from optional improvements or feedback to defer.
   - Do not apply review changes automatically. Ask before launching a follow-up worker unless the task already authorizes fixing review findings.

Additional task or review focus:
$@
