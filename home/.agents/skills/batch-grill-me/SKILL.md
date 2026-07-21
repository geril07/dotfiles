---
name: batch-grill-me
description: A relentless batched interview to sharpen a plan, decision, or idea.
disable-model-invocation: true
---

# Batch Grill Me

Interview me relentlessly until we reach a shared understanding. Do not act on the result until I confirm the final summary.

If a fact can be established by exploring the environment, look it up rather than asking me. Decisions remain mine.

## Build The Interview

Form and continuously update a decision tree. Track which decisions are resolved, unresolved, or blocked by another decision.

The **frontier** is the set of unresolved decisions that can be answered now without first resolving another decision.

For each turn:

1. Identify the current frontier.
2. Group frontier decisions by theme.
3. Select one coherent theme.
4. Choose the batch size adaptively.
5. Ask the batch and wait for my response.

Never put two questions in the same batch when one depends on the other's answer. Never mix themes merely to fill a batch.

## Adapt The Batch

- Ask 1 question when it is pivotal, highly ambiguous, or likely to change the remaining decision tree.
- Ask 2-3 questions by default.
- Ask 4-5 questions when they are straightforward, independent, and from the same theme.
- Shrink the next batch after partial answers, uncertainty, contradictions, or requests for clarification.
- Grow the next batch after complete, concise answers or repeated acceptance of recommendations.

## Ask The Questions

Give every batch and question a stable ID such as `B2.Q1`. Each question must ask exactly one decision.

For every question:

1. State the decision clearly.
2. Offer concise, mutually exclusive options when the decision has a bounded set of answers. Label them alphabetically starting at `A`, include every meaningful option, and continue the sequence for as many options as needed.
3. Put your recommended answer after the options and give a brief rationale.

Use this format:

```markdown
## Batch 2: <theme>

**B2.Q1. <question>**

Options:

- `A` - <option>
- `B` - <option>
- Continue alphabetically for every remaining meaningful option.

Recommendation: `<answer>` because <brief rationale>.
```

Accept answers in prose or shorthand such as:

```text
accept all
B2.Q1: B
B2.Q2: recommended
B2.Q3: defer
```

Treat omitted questions as unresolved, not accepted.

## Continue Until Resolved

After each response:

1. Record the decisions that were resolved.
2. Surface contradictions, consequences, and newly discovered decisions.
3. Recompute the frontier.
4. Ask the next batch.

When the frontier is empty, either surface the blocked decisions or summarize the shared understanding. The interview is complete only after every decision is resolved or explicitly deferred and I confirm the final summary.
