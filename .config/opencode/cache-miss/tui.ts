import { Plugin } from "@opencode/plugin/tui"
import { detect } from "./detect.js"

export default Plugin.define({
  id: "geril.cache-miss",
  setup(context) {
    const starts = new Map<string, { model: { providerID: string; id: string }; started: number }>()
    const stopStarted = context.data.on("session.step.started", (event) => {
      starts.set(event.data.assistantMessageID, event.data)
    })
    const stopEnded = context.data.on("session.step.ended", (event) => {
      const data = event.data
      const start = starts.get(data.assistantMessageID)
      starts.delete(data.assistantMessageID)
      const message = context.data.session.message.get(data.sessionID, data.assistantMessageID)
      const model = start?.model ?? (message?.type === "assistant" ? message.model : undefined)
      const created = start?.started ?? message?.time.created
      if (!model || created === undefined) return
      const notice = detect(context.data.session.message.list(data.sessionID), {
        id: data.assistantMessageID, model, tokens: data.tokens, time: { created },
      })
      if (notice) context.ui.toast.show({
        title: "Prompt cache",
        message: notice,
        variant: "warning",
        duration: 10_000,
        sessionID: data.sessionID,
      })
    })
    const stopFailed = context.data.on("session.step.failed", (event) => {
      starts.delete(event.data.assistantMessageID)
    })
    return () => {
      stopStarted()
      stopEnded()
      stopFailed()
    }
  },
})
