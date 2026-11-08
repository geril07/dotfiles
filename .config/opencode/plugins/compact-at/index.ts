import { Plugin } from "@opencode/plugin"
import { CompactAt } from "./rpc.js"
import {
  MAX_FAILURES,
  contextTokens,
  parseSetting,
  readSetting,
  thresholdOf,
  type Setting,
  type Status,
  type Usage,
} from "./core.js"

// Port of pi's compact-at extension: a per-session absolute auto-compaction threshold.
//
// OpenCode's own automatic compaction already handles "approaching the model's window"; it is
// config-level and relative to that window. This plugin keeps an absolute number per session
// instead, so a session can compact earlier than the built-in rule. The value lives in plugin
// storage (session instructions entries would be injected into the model prompt).
//
// pi compacts only while idle because its compact() aborts the running turn. OpenCode's compact()
// queues the request for the next safe point instead, so mid-turn compaction is possible; this port
// still checks only when the session goes idle, matching pi's "never kill autonomous work" rule.
//
// The server command is the only surface for clients without plugin UI (T3 Code, for example):
// they can set or clear the threshold, but cannot display the status. The TUI half owns the status
// dialog and the toasts. Both surfaces share the same helpers here.

const key = (sessionID: string) => `sessions/${sessionID}`

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export default Plugin.define({
  id: "geril.compact-at",
  async setup(ctx) {
    const controller = new AbortController()
    const settings = new Map<string, Setting>()
    const lastTokens = new Map<string, number>()
    /** Compactions we requested; used to tell our failure/notice from a manual one. */
    const requestedAt = new Map<string, number>()
    /** Any compaction in flight for a session, ours or not. Blocks duplicate requests. */
    const pending = new Set<string>()
    const checking = new Set<string>()
    /** Sessions with an execution in progress; observed from execution events. */
    const running = new Set<string>()
    const failures = new Map<string, number>()
    const stopped = new Set<string>()
    /** Token count of a compaction OpenCode refused as unnecessary; retry only after growth. */
    const refused = new Map<string, number>()
    /** After a compaction the kept tail still carries pre-compaction numbers; wait for a new step. */
    const stale = new Set<string>()

    const rpc = await ctx.rpc.register(CompactAt, {
      status: async (input) => {
        const { sessionID } = input as { sessionID: string }
        return await status(sessionID)
      },
      set: async (input, context) => {
        const { sessionID, setting } = input as { sessionID: string; setting: unknown }
        const next = readSetting(setting)
        if (!next) {
          return context.error("invalid", "compact-at needs a valid setting", {
            message: "expected off or a token count",
          })
        }
        await write(sessionID, next)
        return await status(sessionID)
      },
      compactNow: async (input) => {
        const { sessionID } = input as { sessionID: string }
        if (await isIdle(sessionID)) await maybeCompact(sessionID)
        return await status(sessionID)
      },
    })

    const emit = async (name: "changed" | "compacted" | "failed", data: object) => {
      try {
        await rpc.events.emit(name as never, data as never)
      } catch {
        // A disconnected TUI must not break compaction.
      }
    }

    const forget = (sessionID: string) => {
      settings.delete(sessionID)
      lastTokens.delete(sessionID)
      requestedAt.delete(sessionID)
      pending.delete(sessionID)
      checking.delete(sessionID)
      running.delete(sessionID)
      failures.delete(sessionID)
      stopped.delete(sessionID)
      refused.delete(sessionID)
      stale.delete(sessionID)
    }

    const write = async (sessionID: string, setting: Setting) => {
      await ctx.storage.set(key(sessionID), setting)
      settings.set(sessionID, setting)
      failures.delete(sessionID)
      stopped.delete(sessionID)
      refused.delete(sessionID)
      // An explicit command must be able to unstick a request whose completion event never arrived.
      pending.delete(sessionID)
      await emit("changed", { sessionID })
    }

    /** A fork reads its own branch in pi, which is a copy at fork time. Do the same on first use. */
    const resolve = async (sessionID: string, depth = 0): Promise<Setting> => {
      const cached = settings.get(sessionID)
      if (cached) return cached
      try {
        const stored = readSetting(await ctx.storage.get(key(sessionID)))
        if (stored) {
          settings.set(sessionID, stored)
          return stored
        }
        if (depth < 20) {
          const session = await ctx.session.get({ sessionID })
          const parentID = session.fork?.sessionID
          if (parentID) {
            const inherited = await resolve(parentID, depth + 1)
            if (inherited.mode !== "off") {
              await ctx.storage.set(key(sessionID), inherited)
              settings.set(sessionID, inherited)
              return inherited
            }
          }
        }
      } catch (error) {
        console.warn(`compact-at: could not read the setting for ${sessionID}: ${message(error)}`)
      }
      const off: Setting = { mode: "off" }
      settings.set(sessionID, off)
      return off
    }

    const measure = async (sessionID: string) => {
      if (stale.has(sessionID)) return undefined
      try {
        const messages = await ctx.session.context({ sessionID })
        for (let index = messages.length - 1; index >= 0; index -= 1) {
          const item = messages[index]
          if (item?.type === "assistant" && item.tokens) {
            return contextTokens(item.tokens as Usage)
          }
        }
        return 0
      } catch (error) {
        console.warn(`compact-at: could not read the context for ${sessionID}: ${message(error)}`)
        return undefined
      }
    }

    const currentTokens = async (sessionID: string) => {
      const cached = lastTokens.get(sessionID)
      if (cached !== undefined) return cached
      const measured = await measure(sessionID)
      if (measured !== undefined) lastTokens.set(sessionID, measured)
      return measured
    }

    /**
     * There is no direct "is idle" API; `Session.Info.time` carries the last idle and busy marks.
     * `running` covers the normal path, the time fields cover a plugin that loaded mid-run.
     */
    const isIdle = async (sessionID: string) => {
      if (running.has(sessionID)) return false
      try {
        const session = await ctx.session.get({ sessionID })
        const time = session.time as { idle?: number; busy?: number; updated: number }
        if (time.idle === undefined) return false
        if (time.busy !== undefined) return time.busy <= time.idle
        return time.idle >= time.updated
      } catch {
        return false
      }
    }

    const status = async (sessionID: string): Promise<Status> => {
      const setting = await resolve(sessionID)
      const now = await currentTokens(sessionID)
      return {
        setting,
        ...(now !== undefined ? { tokens: now } : {}),
        failures: failures.get(sessionID) ?? 0,
        maxFailures: MAX_FAILURES,
        pending: pending.has(sessionID),
      }
    }

    const fail = async (sessionID: string, error: string, count: number) => {
      if (count >= MAX_FAILURES) stopped.add(sessionID)
      await emit("failed", {
        sessionID,
        message: error,
        failures: count,
        givingUp: count >= MAX_FAILURES,
      })
    }

    const maybeCompact = async (sessionID: string, trustedIdle = false) => {
      if (
        pending.has(sessionID) ||
        checking.has(sessionID) ||
        stopped.has(sessionID) ||
        running.has(sessionID)
      ) {
        return
      }
      checking.add(sessionID)
      try {
        const setting = await resolve(sessionID)
        const threshold = thresholdOf(setting)
        if (threshold === undefined) return
        const now = await currentTokens(sessionID)
        if (now === undefined || now < threshold) return
        const prior = refused.get(sessionID)
        if (prior !== undefined && now <= prior) return
        // Awaits above may have raced with another event for the same session.
        if (pending.has(sessionID) || stopped.has(sessionID)) return
        if (!trustedIdle && !(await isIdle(sessionID))) return
        pending.add(sessionID)
        requestedAt.set(sessionID, now)
        try {
          await ctx.session.compact({ sessionID })
        } catch (error) {
          pending.delete(sessionID)
          requestedAt.delete(sessionID)
          const count = (failures.get(sessionID) ?? 0) + 1
          failures.set(sessionID, count)
          await fail(sessionID, message(error), count)
        }
      } finally {
        checking.delete(sessionID)
      }
    }

    const handle = async (event: { type: string; data: Record<string, unknown> }) => {
      const sessionID = typeof event.data.sessionID === "string" ? event.data.sessionID : undefined
      if (!sessionID) return
      switch (event.type) {
        case "session.step.ended": {
          lastTokens.set(sessionID, contextTokens(event.data.tokens as Usage))
          stale.delete(sessionID)
          return
        }
        case "session.execution.started": {
          running.add(sessionID)
          return
        }
        case "session.execution.succeeded":
        case "session.execution.failed":
        case "session.execution.interrupted": {
          running.delete(sessionID)
          // Durable end-of-execution event. `session.idle` can arrive before Session.Info.time
          // marks the session idle, so this is the reliable "the agent stopped" signal.
          await maybeCompact(sessionID, true)
          return
        }
        case "session.idle": {
          running.delete(sessionID)
          await maybeCompact(sessionID)
          return
        }
        case "session.compaction.started": {
          pending.add(sessionID)
          return
        }
        case "session.compaction.ended": {
          const at = requestedAt.get(sessionID)
          pending.delete(sessionID)
          requestedAt.delete(sessionID)
          failures.delete(sessionID)
          refused.delete(sessionID)
          lastTokens.delete(sessionID)
          stale.add(sessionID)
          if (at !== undefined) await emit("compacted", { sessionID, tokens: at })
          return
        }
        case "session.compaction.failed": {
          const ours = requestedAt.has(sessionID)
          pending.delete(sessionID)
          requestedAt.delete(sessionID)
          if (!ours) return
          const error = event.data.error as { message?: string } | undefined
          const text = error?.message ?? "unknown error"
          if (/nothing to compact|already compacted|empty/i.test(text)) {
            // Not a failure: the estimate is over the threshold but the branch has nothing to cut yet.
            refused.set(sessionID, lastTokens.get(sessionID) ?? 0)
            return
          }
          const count = (failures.get(sessionID) ?? 0) + 1
          failures.set(sessionID, count)
          await fail(sessionID, text, count)
          return
        }
        case "session.deleted": {
          forget(sessionID)
          void ctx.storage.remove(key(sessionID)).catch(() => {})
          return
        }
      }
    }

    // Clients without plugin UI (T3 Code) can only reach the plugin here. No argument means the
    // status the TUI dialog shows; the server has no way to print it, so it only checks now.
    await ctx.command.transform((editor) => {
      editor.add({
        name: "compact-at",
        description: "Set this session's compaction threshold in thousands of tokens, or off",
        execute: async ({ sessionID, prompt }) => {
          const next = parseSetting(prompt.text ?? "")
          if (!next) {
            await maybeCompact(sessionID)
            return
          }
          await write(sessionID, next)
          await maybeCompact(sessionID)
        },
      })
    })

    void (async () => {
      try {
        const stream = ctx.event.subscribe({
          types: [
            "session.step.ended",
            "session.execution.started",
            "session.execution.succeeded",
            "session.execution.failed",
            "session.execution.interrupted",
            "session.idle",
            "session.compaction.started",
            "session.compaction.ended",
            "session.compaction.failed",
            "session.deleted",
          ],
          signal: controller.signal,
        })
        for await (const event of stream) {
          try {
            await handle(event as never)
          } catch (error) {
            console.warn(`compact-at: event ${event.type} failed: ${message(error)}`)
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn(`compact-at: event stream stopped: ${message(error)}`)
        }
      }
    })()

    return () => {
      controller.abort()
    }
  },
})
