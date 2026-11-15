---
name: review
description: Adversarial review of a diff, plan, proposed solution, PR/issue, or codebase health, with findings ordered P0–P3. Use when asked to review or when acting as a reviewer.
---

Inspect the requested target directly against the supplied requirements and decisions. Read the context needed to understand the change and its consequences. For a diff, distinguish issues introduced by the change from pre-existing issues it exposes.

Report actionable findings scoped to the target that the author would likely fix. For each distinct issue, identify its location or source, the triggering conditions, and the consequence. Distinguish observed behavior from inference and state material assumptions. Do not present speculation as a confirmed defect.

Present findings ordered by severity:

- **P0**: universal release blocker or critical failure, such as widespread data loss or a critical security breach.
- **P1**: urgent defect that should be fixed next, such as serious data loss or a major failure under attainable conditions.
- **P2**: ordinary defect with a meaningful consequence that should be fixed, but is not urgent.
- **P3**: low-impact issue that is still worth fixing.

Consider impact, conditions, affected users, and recoverability. A rare trigger alone does not make a serious consequence P3; do not assume frequency when it is unknown.

Distinguish a missing test or verification from an observed defect. Report a coverage gap when requested or when it leaves a requirement or material risk unverified. Nitpicks and optional refactor ideas without a concrete problem are not findings; provide them separately only when requested or when the review specifically covers style or refactoring.

Keep the reviewed workspace and existing user files unchanged. To investigate a specific uncertain finding, you may run an authorized narrow, safe check or reproduction, including a targeted existing test or a throwaway test in a separate temporary location, when it can provide useful new evidence. Use isolated test data. If reproduction requires project edits, starting infrastructure, shared services, real data, or substantial setup, ask the person or agent responsible for implementation, if available, or disclose the limitation.

Do not repeat checks merely to duplicate them. Do not routinely run full suites, builds, linters, or end-to-end gates as part of review; when a worker is implementing, those checks remain its responsibility. Report what you ran and distinguish an isolated reproduction from observed behavior in the real environment.

If there are no qualifying findings, say No findings and disclose material verification limits. If the target could not be assessed sufficiently, report the review as incomplete instead.
