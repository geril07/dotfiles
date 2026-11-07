import { Plugin } from "@opencode/plugin/tui"
import { CompactAt } from "./rpc.js"
import { formatTokens, parseSetting, type Setting, type Status } from "./core.js"

// TUI half of compact-at. The server half owns the setting and the compaction; this half adds the
// /compact-at slash command and its overlays, and uses RPC because plugin storage is not exposed
// over HTTP. The command is local to the TUI on purpose: its output is a toast or dialog, not a
// transcript message.

function describe(status: Status): string {
  const lines: string[] = []
  if (status.setting.mode === "off") {
    lines.push("compact-at: off (OpenCode's own compaction setting still applies)")
  } else if (status.setting.mode === "auto") {
    lines.push("compact-at: auto (window-derived, Claude Code rule)")
  } else {
    lines.push(`compact-at: ${formatTokens(status.setting.tokens)} tokens in this session`)
  }

  if (status.model) {
    lines.push(
      `model: ${status.model}${status.contextWindow ? `, window ${formatTokens(status.contextWindow)}` : ""}`,
    )
  } else if (status.contextWindow) {
    lines.push(`window: ${formatTokens(status.contextWindow)}`)
  }

  if (status.tokens === undefined) {
    lines.push("now: unknown (measured again after the next reply)")
  } else {
    const share = status.contextWindow
      ? ` (${Math.round((status.tokens / status.contextWindow) * 100)}%)`
      : ""
    lines.push(`now: ${formatTokens(status.tokens)}${share}`)
  }

  if (status.threshold !== undefined) {
    if (status.contextWindow && status.threshold >= status.contextWindow) {
      lines.push(
        `threshold: ${formatTokens(status.threshold)} - above the model window, so it cannot fire before the provider limit`,
      )
    } else {
      lines.push(`fires at: ${formatTokens(status.threshold)}`)
    }
  }

  if (status.pending) lines.push("compaction: pending")
  if (status.failures > 0) {
    lines.push(`compaction failures in a row: ${status.failures}/${status.maxFailures}`)
  }
  return lines.join("\n")
}

function summary(status: Status): string {
  if (status.setting.mode === "off") {
    return "Off. OpenCode's own compaction setting still applies."
  }
  if (status.setting.mode === "auto") {
    return status.threshold
      ? `Auto: compacts at ${formatTokens(status.threshold)} tokens.`
      : "Auto: waiting for a model with a known window."
  }
  return `Compacts at ${formatTokens(status.setting.tokens)} tokens.`
}

export default Plugin.define({
  id: "geril.compact-at.tui",
  setup(context) {
    const rpc = () => context.client.rpc(CompactAt)
    // The client's default location is the launch directory; a viewed session can live elsewhere.
    const where = (sessionID: string) => {
      const directory = context.data.session.get(sessionID)?.location.directory
      return directory ? { location: { directory } } : undefined
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "compact-at",
          title: "Auto-compaction threshold",
          group: "Session",
          palette: true,
          slash: { name: "compact-at", arguments: true },
          run: async (input) => {
            const route = context.ui.router.current()
            if (route.type !== "session") {
              context.ui.toast.show({
                title: "compact-at",
                message: "Open a session first.",
                variant: "warning",
              })
              return
            }
            const sessionID = route.sessionID

            let next: Setting | undefined
            try {
              next = parseSetting(input ?? "")
            } catch (error) {
              context.ui.toast.show({
                title: "compact-at",
                message: error instanceof Error ? error.message : String(error),
                variant: "error",
              })
              return
            }

            try {
              if (!next) {
                const status = (await rpc().status({ sessionID }, where(sessionID))) as Status
                await context.ui.dialog.alert({ title: "compact-at", message: describe(status) })
                return
              }
              const status = (await rpc().set({ sessionID, setting: next }, where(sessionID))) as Status
              context.ui.toast.show({
                title: "compact-at",
                message: summary(status),
                variant: "success",
              })
              // Only the server knows whether the session is idle; it compacts now or waits for idle.
              void rpc()
                .compactNow({ sessionID }, where(sessionID))
                .catch(() => {})
            } catch (error) {
              context.ui.toast.show({
                title: "compact-at",
                message: error instanceof Error ? error.message : String(error),
                variant: "error",
              })
            }
          },
        },
      ],
    }))

    const stopCompacted = rpc().events.on("compacted", (event) => {
      const data = event.data as { sessionID: string; tokens: number }
      context.ui.toast.show({
        title: "compact-at",
        message: `Compacted at ${formatTokens(data.tokens)} tokens.`,
        variant: "success",
      })
    })
    const stopFailed = rpc().events.on("failed", (event) => {
      const data = event.data as {
        sessionID: string
        message: string
        failures: number
        givingUp: boolean
      }
      context.ui.toast.show({
        title: "compact-at",
        message: data.givingUp
          ? `Giving up after ${data.failures} failures (${data.message}). Run /compact-at again to retry.`
          : `Compaction failed (${data.message}).`,
        variant: "error",
      })
    })

    return () => {
      stopCompacted()
      stopFailed()
    }
  },
})
