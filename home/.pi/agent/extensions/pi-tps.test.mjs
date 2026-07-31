import assert from "node:assert/strict";
import test from "node:test";

import {
  appendStreamSample,
  createTracker,
  finishResponse,
  formatRate,
  formatTtft,
  liveTps,
  recordResponseEvent,
  sessionAverageTps,
  sessionAverageTtft,
  statusText,
} from "./pi-tps.ts";

test("formats the metrics and tracks a stale live window", () => {
  const tracker = createTracker();

  assert.equal(statusText(tracker, 10_000), "TPS - | AVG - | TTFT -");
  assert.equal(formatRate(100), "100");
  assert.equal(formatRate(12.34), "12.3");
  assert.equal(formatRate(9.876, true), "9.88 TPS");
  assert.equal(formatTtft(1.25), "1.3s");

  tracker.currentResponse = { requestStartAt: 1_000 };
  recordResponseEvent(tracker, 2_000);
  appendStreamSample(tracker, { at: 2_000, tokens: 10 });
  appendStreamSample(tracker, { at: 3_000, tokens: 10 });
  assert.equal(liveTps(tracker, 3_000), "20.0 TPS");
  assert.equal(liveTps(tracker, 4_501), undefined);

  finishResponse(tracker, 20, 4_000);
  assert.equal(sessionAverageTps(tracker), "10.0");
  assert.equal(sessionAverageTtft(tracker), "1.0s");
  assert.equal(statusText(tracker, 4_000), "TPS - | AVG 10.0 | TTFT 1.0s");
});

test("updates and clears the Pi footer status through the extension lifecycle", async () => {
  const handlers = new Map();
  const statuses = [];
  const pi = {
    on(name, handler) {
      handlers.set(name, handler);
    },
  };
  const ctx = {
    ui: {
      theme: { fg(_color, text) { return text; } },
      setStatus(_key, text) {
        statuses.push(text);
      },
    },
  };

  const extension = (await import("./pi-tps.ts")).default;
  extension(pi);

  await handlers.get("session_start")({}, ctx);
  assert.equal(statuses.at(-1), "TPS - | AVG - | TTFT -");

  await handlers.get("message_start")({
    message: {
      role: "assistant",
      timestamp: Date.now() - 100,
      stopReason: "pending",
      usage: { output: 0 },
    },
  }, ctx);
  await handlers.get("message_update")({
    message: { role: "assistant", timestamp: Date.now(), stopReason: "pending" },
    assistantMessageEvent: {
      type: "text_delta",
      delta: "hello world",
      contentIndex: 0,
      partial: {},
    },
  }, ctx);
  assert.match(statuses.at(-1), /^TPS .+ TPS \| AVG - \| TTFT -$/);

  await handlers.get("message_end")({ message: { role: "assistant", usage: { output: 12 } } }, ctx);
  assert.match(statuses.at(-1), /^TPS - \| AVG .+ \| TTFT .+s$/);

  await handlers.get("session_shutdown")({}, ctx);
  assert.equal(statuses.at(-1), undefined);
});
