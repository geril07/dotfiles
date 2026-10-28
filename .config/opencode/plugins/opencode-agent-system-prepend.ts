import { Plugin } from "@opencode/plugin"
import type { SessionHooks } from "@opencode/plugin/dist/promise/session"

// Restores the harness prompt for agents that declare a body.
//
// An agent body is currently a *replacement* system prompt, not an addition, so
// adding a role silently drops the harness text and the per-tool usage rules.
// This hook puts the harness back in front of the body, and only for agents
// that opted into a body in the first place.
//
// Scope is deliberately narrow:
//   - bodyless agents already get the harness; left untouched
//   - hidden agents (title, summary, compaction) are machine-internal and are
//     meant to run a bespoke prompt; left untouched
//   - a body containing `no-harness` opts out explicitly
//
// Upstream: https://github.com/anomalyco/opencode/issues/34774

const HARNESS = `You are an AI agent running in OpenCode, a coding agent harness. Help the user accomplish their goals using the tools you have available.

# Harness
- Responses are rendered as GitHub-flavored Markdown.
- \`<system-reminder>\` blocks are harness instructions, not user-authored content. Read and follow them.
- Prefer parallelizing independent tool calls.
\${OPENCODE_TOOL_GUIDANCE}
- Treat unfamiliar files or changes as potential user work and investigate before deleting or overwriting them.`

const toolGuidance = (tools: string[]) => {
  const guidance: string[] = []
  if (tools.includes("shell")) {
    guidance.push(
      "- Prefer dedicated tools over shell commands; fall back to the shell when a tool cannot do what you need.",
      "- Do not chain shell commands with separators like `echo \"====\";` or `printf '---'`; the output becomes noisy in a way that makes the user's side of the conversation worse.",
    )
  }
  if (tools.includes("write")) {
    guidance.push(
      "- Use the write tool to create files or completely replace their content. Prefer using the edit tool for targeted changes.",
    )
  }
  if (tools.includes("edit")) {
    guidance.push(
      "- Use the edit tool for targeted changes to existing text files. It replaces the exact text in `oldString` with `newString`, and the values must differ. By default, `oldString` must occur exactly once. If it occurs multiple times, include more surrounding context to make it unique or set `replaceAll` to true to replace every occurrence.",
    )
  }
  return guidance.join("\n")
}

export default Plugin.define({
  id: "opencode.agent-system-prepend",
  async setup(ctx) {
    const hook = async (event: SessionHooks["context"]) => {
      const agent = (await ctx.agent.get({ agentID: event.agent })).data
      if (!agent?.system || agent.hidden) return
      if (agent.system.includes("no-harness")) return

      const first = event.system[0]
      if (!first || first.type !== "text") return
      // On a fresh draft system[0] is exactly the body, so that case must still
      // merge. Only skip when the body is already the tail of a longer text.
      // An endsWith check alone would skip every fresh draft, and a substring
      // sentinel would collide with gpt.txt, which opens with the same sentence
      // as system.txt.
      if (first.text !== agent.system && first.text.endsWith(agent.system)) return

      const harness = HARNESS.replace("${OPENCODE_TOOL_GUIDANCE}", toolGuidance(Object.keys(event.tools)))
      event.system[0] = { type: "text", text: `${harness}\n\n${agent.system}` }
    }

    await ctx.session.hook("context", hook)
    await ctx.session.hook("compaction", hook)
    await ctx.session.hook("generate", hook)
  },
})