import { expect, mock, test } from "bun:test"

mock.module("@opencode/plugin/tui", () => ({ Plugin: { define: (plugin: unknown) => plugin } }))
const { default: plugin } = await import("./tui")

function client(sessionID: string) {
  let route: { type: "session"; sessionID: string } | { type: "home" } = { type: "session", sessionID }
  const handlers = new Map<string, (event: any) => void>()
  const model = { providerID: "openai", id: "model" }
  const previous = {
    id: "previous", type: "assistant", model, time: { created: 1000 },
    tokens: { input: 1000, cache: { read: 50_000, write: 0 } },
  }
  const current = {
    id: "current", type: "assistant", model, time: { created: 2000 },
    tokens: { input: 52_000, cache: { read: 0, write: 0 } },
  }
  const show = mock((_options: unknown) => {})
  const get = mock(() => current)
  const cleanup = plugin.setup({
    data: {
      on(type: string, handler: (event: any) => void) {
        handlers.set(type, handler)
        return () => handlers.delete(type)
      },
      session: { message: { get, list: () => [previous, current] } },
    },
    ui: { router: { current: () => route }, toast: { show } },
  } as any)
  return {
    show, get, cleanup,
    navigate(next: typeof route) { route = next },
    emit(type: string, sessionID: string) {
      handlers.get(type)?.({ data: {
        sessionID, assistantMessageID: current.id, model, started: current.time.created,
        tokens: current.tokens,
      } })
    },
  }
}

test("a broadcast cache miss warns only the client displaying its session", () => {
  const clients = [client("session-a"), client("session-b")]
  for (const instance of clients) {
    instance.emit("session.step.started", "session-a")
    instance.emit("session.step.ended", "session-a")
  }
  expect(clients[0].show).toHaveBeenCalledTimes(1)
  expect(clients[0].show.mock.calls[0][0]).toMatchObject({ title: "Prompt cache", variant: "warning" })
  expect(clients[1].show).not.toHaveBeenCalled()
  expect(clients[1].get).not.toHaveBeenCalled()
  clients.forEach((instance) => instance.cleanup?.())
})

test("leaving a session before a step ends suppresses its warning", () => {
  for (const route of [{ type: "home" }, { type: "session", sessionID: "session-b" }] as const) {
    const instance = client("session-a")
    instance.emit("session.step.started", "session-a")
    instance.navigate(route)
    instance.emit("session.step.ended", "session-a")
    expect(instance.show).not.toHaveBeenCalled()
    instance.cleanup?.()
  }
})

test("a client that opens the session mid-step can warn from cached message data", () => {
  const instance = client("session-b")
  instance.emit("session.step.started", "session-a")
  instance.navigate({ type: "session", sessionID: "session-a" })
  instance.emit("session.step.ended", "session-a")
  expect(instance.show).toHaveBeenCalledTimes(1)
  instance.cleanup?.()
})

test("cleanup unsubscribes from session events", () => {
  const instance = client("session-a")
  instance.cleanup?.()
  instance.emit("session.step.started", "session-a")
  instance.emit("session.step.ended", "session-a")
  expect(instance.show).not.toHaveBeenCalled()
})
