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
  } else {
    lines.push(`compact-at: ${formatTokens(status.setting.tokens)} tokens in this session`)
  }

  if (status.tokens === undefined) {
    lines.push("now: unknown (measured again after the next reply)")
  } else {
    lines.push(`now: ${formatTokens(status.tokens)}`)
  }

  if (status.setting.mode === "fixed") {
    lines.push(`fires at: ${formatTokens(status.setting.tokens)}`)
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
          title: "Compaction threshold",
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
