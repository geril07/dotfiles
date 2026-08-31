/**
 * Pi TPS
 *
 * Shows live tokens per second, session-average TPS, and average time to first
 * token in Pi's footer. Live output is estimated from streamed token-bearing
 * deltas; completed output prefers the provider's finalized token usage.
 */

import type { AssistantMessageEvent } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export const STREAM_WINDOW_MS = 5_000;
export const LIVE_STALE_MS = 1_500;
export const SINGLE_SAMPLE_MS = 1_000;
export const STATUS_REFRESH_MS = 1_000;

export type StreamSample = {
  at: number;
  bytes: number;
};

export type MessageTiming = {
  requestStartAt: number;
  firstResponseAt?: number;
  outputBytes: number;
};

export type SessionAverage = {
  totalTokens: number;
  totalDurationMs: number;
  totalTtftMs: number;
  ttftMessageCount: number;
  tpsMessageCount: number;
};

export type TpsTracker = {
  samples: StreamSample[];
  currentResponse?: MessageTiming;
  pendingRequestStartAt?: number;
  sessionAverage?: SessionAverage;
  streaming: boolean;
};

export function createTracker(): TpsTracker {
  return {
    samples: [],
    streaming: false,
  };
}

export function estimateStreamTokens(delta: string): number {
  const bytes = Buffer.byteLength(delta, "utf8");
  return estimateBytesTokens(bytes);
}

function estimateBytesTokens(bytes: number): number {
  return Number.isFinite(bytes) && bytes > 0 ? Math.ceil(bytes / 5) : 0;
}

function hasPositiveValue(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function formatRate(value: number, withUnit = false): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return undefined;

  const suffix = withUnit ? " TPS" : "";
  if (value >= 100) return `${Math.round(value)}${suffix}`;
  if (value >= 10) return `${value.toFixed(1)}${suffix}`;
  return `${value.toFixed(2)}${suffix}`;
}

export function formatTtft(value: number): string | undefined {
  if (!Number.isFinite(value) || value < 0) return undefined;
  return `${value.toFixed(1)}s`;
}

export function activeDurationMs(samples: StreamSample[], tailAt?: number): number {
  if (samples.length === 0) return 0;

  if (samples.length === 1) {
    const tailDuration = tailAt === undefined ? SINGLE_SAMPLE_MS : Math.max(0, tailAt - samples[0].at);
    return Math.min(Math.max(tailDuration, 250), SINGLE_SAMPLE_MS);
  }

  let duration = 0;
  for (let index = 1; index < samples.length; index++) {
    duration += Math.max(0, samples[index].at - samples[index - 1].at);
  }

  if (tailAt !== undefined) {
    duration += Math.max(0, tailAt - samples[samples.length - 1].at);
  }

  return Math.max(duration, SINGLE_SAMPLE_MS);
}

export function pruneSamples(tracker: TpsTracker, now = performance.now()): void {
  const cutoff = now - STREAM_WINDOW_MS;
  tracker.samples = tracker.samples.filter((sample) => sample.at >= cutoff);
}

export function liveTps(tracker: TpsTracker, now = performance.now()): string | undefined {
  if (!tracker.streaming) return undefined;

  const relevant = tracker.samples.filter((sample) => now - sample.at <= STREAM_WINDOW_MS);
  const lastSample = relevant[relevant.length - 1];
  if (!lastSample || now - lastSample.at > LIVE_STALE_MS) return undefined;

  const totalBytes = relevant.reduce((sum, sample) => sum + sample.bytes, 0);
  const totalTokens = estimateBytesTokens(totalBytes);
  const durationSeconds = activeDurationMs(relevant, now) / 1000;
  if (totalTokens <= 0 || durationSeconds <= 0) return undefined;

  return formatRate(totalTokens / durationSeconds, true);
}

export function sessionAverageTps(tracker: TpsTracker): string | undefined {
  const totals = tracker.sessionAverage;
  if (!totals || totals.tpsMessageCount <= 0 || totals.totalTokens <= 0 || totals.totalDurationMs <= 0) return undefined;
  return formatRate(totals.totalTokens / (totals.totalDurationMs / 1000));
}

export function sessionAverageTtft(tracker: TpsTracker): string | undefined {
  const totals = tracker.sessionAverage;
  if (!totals || totals.ttftMessageCount <= 0 || totals.totalTtftMs < 0) return undefined;
  return formatTtft(totals.totalTtftMs / totals.ttftMessageCount / 1000);
}

export function statusText(tracker: TpsTracker, now = performance.now()): string {
  const live = liveTps(tracker, now) ?? "-";
  const average = sessionAverageTps(tracker) ?? "-";
  const ttft = sessionAverageTtft(tracker) ?? "-";
  return `TPS ${live} | AVG ${average} | TTFT ${ttft}`;
}

export function appendStreamSample(tracker: TpsTracker, sample: StreamSample): void {
  tracker.samples = [
    ...tracker.samples.filter((item) => sample.at - item.at <= STREAM_WINDOW_MS),
    sample,
  ];
}

export function recordResponseEvent(tracker: TpsTracker, at: number): void {
  const timing = tracker.currentResponse;
  if (!timing) return;

  timing.firstResponseAt ??= at;
  tracker.streaming = true;
}

export function finishResponse(tracker: TpsTracker, outputTokens: number | undefined, completedAt = performance.now()): void {
  const timing = tracker.currentResponse;
  tracker.currentResponse = undefined;
  tracker.streaming = false;
  tracker.samples = [];

  if (!timing?.firstResponseAt) return;

  const resolvedTokens = hasPositiveValue(outputTokens)
    ? outputTokens
    : estimateBytesTokens(timing.outputBytes);
  const durationMs = Math.max(completedAt - timing.firstResponseAt, 1);
  const ttftMs = Math.max(timing.firstResponseAt - timing.requestStartAt, 0);
  const totals = tracker.sessionAverage ?? {
    totalTokens: 0,
    totalDurationMs: 0,
    totalTtftMs: 0,
    ttftMessageCount: 0,
    tpsMessageCount: 0,
  };

  tracker.sessionAverage = {
    totalTokens: totals.totalTokens + resolvedTokens,
    totalDurationMs: totals.totalDurationMs + (resolvedTokens > 0 ? durationMs : 0),
    totalTtftMs: totals.totalTtftMs + ttftMs,
    ttftMessageCount: totals.ttftMessageCount + 1,
    tpsMessageCount: totals.tpsMessageCount + (resolvedTokens > 0 ? 1 : 0),
  };
}

function updateStatus(ctx: ExtensionContext, tracker: TpsTracker, now = performance.now()): void {
  pruneSamples(tracker, now);
  ctx.ui.setStatus("pi-tps", ctx.ui.theme.fg("muted", statusText(tracker, now)));
}

function handleStreamEvent(tracker: TpsTracker, event: AssistantMessageEvent, at: number): void {
  if (event.type !== "text_delta" && event.type !== "thinking_delta" && event.type !== "toolcall_delta") {
    return;
  }
  if (event.delta.length === 0) return;

  recordResponseEvent(tracker, at);
  const bytes = Buffer.byteLength(event.delta, "utf8");
  if (tracker.currentResponse) tracker.currentResponse.outputBytes += bytes;
  appendStreamSample(tracker, { at, bytes });
}

export default function piTpsExtension(pi: ExtensionAPI): void {
  const tracker = createTracker();
  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  const stopRefreshTimer = (): void => {
    if (refreshTimer === undefined) return;
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  };

  const resetTracker = (): void => {
    tracker.samples = [];
    tracker.currentResponse = undefined;
    tracker.pendingRequestStartAt = undefined;
    tracker.sessionAverage = undefined;
    tracker.streaming = false;
  };

  pi.on("session_start", (_event, ctx) => {
    stopRefreshTimer();
    resetTracker();
    updateStatus(ctx, tracker);

    refreshTimer = setInterval(() => {
      updateStatus(ctx, tracker);
    }, STATUS_REFRESH_MS);
  });

  pi.on("session_shutdown", (_event, ctx) => {
    stopRefreshTimer();
    ctx.ui.setStatus("pi-tps", undefined);
  });

  pi.on("before_provider_request", () => {
    tracker.pendingRequestStartAt = performance.now();
  });

  pi.on("message_start", (event, ctx) => {
    if (event.message.role !== "assistant") return;

    tracker.samples = [];
    tracker.currentResponse = {
      requestStartAt: tracker.pendingRequestStartAt ?? performance.now(),
      outputBytes: 0,
    };
    tracker.pendingRequestStartAt = undefined;
    tracker.streaming = event.message.stopReason === "pending";
    updateStatus(ctx, tracker);
  });

  pi.on("message_update", (event, ctx) => {
    if (event.message.role !== "assistant") return;

    const at = performance.now();
    if (!tracker.currentResponse) {
      tracker.currentResponse = {
        requestStartAt: tracker.pendingRequestStartAt ?? at,
        outputBytes: 0,
      };
      tracker.pendingRequestStartAt = undefined;
    }

    handleStreamEvent(tracker, event.assistantMessageEvent, at);
    updateStatus(ctx, tracker, at);
  });

  pi.on("message_end", (event, ctx) => {
    if (event.message.role !== "assistant") return;

    finishResponse(tracker, event.message.usage?.output, performance.now());
    updateStatus(ctx, tracker);
  });

  pi.on("agent_end", (_event, ctx) => {
    tracker.samples = [];
    tracker.currentResponse = undefined;
    tracker.pendingRequestStartAt = undefined;
    tracker.streaming = false;
    updateStatus(ctx, tracker);
  });
}
