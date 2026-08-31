import assert from "node:assert/strict";
import test from "node:test";

import {
  appendStreamSample,
  createTracker,
  estimateStreamTokens,
  finishResponse,
  formatRate,
  formatTtft,
  liveTps,
  recordResponseEvent,
  sessionAverageTps,
  sessionAverageTtft,
  statusText,
} from "./index.ts";

test("formats the metrics and tracks a stale live window", () => {
  const tracker = createTracker();

  assert.equal(statusText(tracker, 10_000), "TPS - | AVG - | TTFT -");
  assert.equal(formatRate(100), "100");
  assert.equal(formatRate(12.34), "12.3");
  assert.equal(formatRate(9.876, true), "9.88 TPS");
  assert.equal(formatTtft(1.25), "1.3s");

  assert.equal(estimateStreamTokens("a"), 1);
  assert.equal(estimateStreamTokens("a".repeat(10)), 2);

  tracker.currentResponse = { requestStartAt: 1_000, outputBytes: 100 };
  recordResponseEvent(tracker, 2_000);
  appendStreamSample(tracker, { at: 2_000, bytes: 50 });
  appendStreamSample(tracker, { at: 3_000, bytes: 50 });
  assert.equal(liveTps(tracker, 3_000), "20.0 TPS");
  assert.equal(liveTps(tracker, 4_501), undefined);

  const tinyDeltas = createTracker();
  tinyDeltas.streaming = true;
  appendStreamSample(tinyDeltas, { at: 2_000, bytes: 1 });
  appendStreamSample(tinyDeltas, { at: 3_000, bytes: 1 });
  assert.equal(liveTps(tinyDeltas, 3_000), "1.00 TPS");

  finishResponse(tracker, 20, 4_000);
  assert.equal(sessionAverageTps(tracker), "10.0");
  assert.equal(sessionAverageTtft(tracker), "1.0s");
  assert.equal(statusText(tracker, 4_000), "TPS - | AVG 10.0 | TTFT 1.0s");
});

test("falls back to cumulative streamed bytes and tracks TTFT independently", () => {
  const tracker = createTracker();
  tracker.currentResponse = { requestStartAt: 1_000, outputBytes: 100 };

  recordResponseEvent(tracker, 2_000);
  finishResponse(tracker, 0, 4_000);

  assert.equal(sessionAverageTps(tracker), "10.0");
  assert.equal(sessionAverageTtft(tracker), "1.0s");

  const noOutput = createTracker();
  noOutput.currentResponse = { requestStartAt: 1_000, outputBytes: 0 };
  recordResponseEvent(noOutput, 2_000);
  finishResponse(noOutput, 0, 4_000);
  assert.equal(sessionAverageTps(noOutput), undefined);
  assert.equal(sessionAverageTtft(noOutput), "1.0s");
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

  const extension = (await import("./index.ts")).default;
  extension(pi);

  await handlers.get("session_start")({}, ctx);
  assert.equal(statuses.at(-1), "TPS - | AVG - | TTFT -");

  await handlers.get("before_provider_request")({});
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
      type: "toolcall_delta",
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
