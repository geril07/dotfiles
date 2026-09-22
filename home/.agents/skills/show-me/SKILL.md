---
name: show-me
description: Help the user understand the current topic visually with concise diagrams, code-shape sketches, and focused HTML artifacts.
disable-model-invocation: true
---

## Diff notation

Use structural diffs when something existing changes. Not valid patch syntax — match the shape to what's changing.

```diff
  unchanged
+ added
- removed
```

Works for interfaces, component trees, file trees, data shapes, state transitions, call flows. Pick the representation that fits.

Show the complete target structure instead of a diff when most of it is new or diff markers would dominate.

## Representations

Pick the smallest view that makes the point clear. Use one, use several — unlikely you need all of them.

- Show UI structure as a component tree, including state and module boundaries that matter:

```diff
  <SessionPage> (src/routes/session.tsx)
    useSessionEvents()
    <SessionToolbar> (src/components/toolbar.tsx)
+     <RunSkillButton /> (src/components/run-skill.tsx)
    <SessionTimeline>
+     <SkillResultCard />
```

- Show changed or new interfaces as a structural diff, grouped by file in topological order (dependencies first):

```diff
  src/jobs/types.ts

    JobStatus
-     "pending" | "running" | "failed"
+     "pending" | "running" | "failed" | "retrying"

    JobAttempt
      id: AttemptId
      jobId: JobId

  src/jobs/service.ts

    JobService
      get(id: JobId): Promise<Job>
+     retry(id: JobId): Promise<JobAttempt>
```

- Show runtime flow as a call tree or call chain:

```diff
  submitForm
    createSession
      persistPrompt
+     expandSkillMention
      launchAgent
```

- Show file responsibility as a file tree:

```diff
  src/
  ├── commands/
+ │   └── show-me.ts
  ├── sessions/
- └── transport.ts
+ └── transport/
+     ├── client.ts
+     └── stream.ts
```

- Show state or data shape changes:

```diff
  JobAttempt (src/jobs/types.ts)
      id
      jobId
      createdAt
+     retryOf: AttemptId | null
```

- Show interaction or async sequences with Mermaid when a flat tree cannot capture concurrency or back-and-forth.
