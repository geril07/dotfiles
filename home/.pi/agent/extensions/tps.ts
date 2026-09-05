import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type ResponseTiming = {
	requestStartMs: number;
	firstTokenMs?: number;
	outputBytes: number;
};

type ResponseMetric = {
	outputTokens: number;
	decodeMs: number;
	ttftMs: number;
};

function isAssistantMessage(message: unknown): message is AssistantMessage {
	if (!message || typeof message !== "object") return false;
	const role = (message as { role?: unknown }).role;
	return role === "assistant";
}

function estimateBytesTokens(bytes: number): number {
	return Number.isFinite(bytes) && bytes > 0 ? Math.ceil(bytes / 5) : 0;
}

function hasPositiveValue(value: number | undefined): value is number {
	return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export default function (pi: ExtensionAPI) {
	let agentStartMs: number | null = null;
	let pendingRequestStartMs: number | null = null;
	let currentResponse: ResponseTiming | null = null;
	let responseMetrics: ResponseMetric[] = [];

	pi.on("agent_start", () => {
		agentStartMs = performance.now();
		pendingRequestStartMs = null;
		currentResponse = null;
		responseMetrics = [];
	});

	pi.on("before_provider_request", () => {
		pendingRequestStartMs = performance.now();
	});

	pi.on("message_start", (event) => {
		if (event.message.role !== "assistant") return;

		currentResponse = {
			requestStartMs: pendingRequestStartMs ?? performance.now(),
			outputBytes: 0,
		};
		pendingRequestStartMs = null;
	});

	pi.on("message_update", (event) => {
		if (event.message.role !== "assistant") return;

		const streamEvent = event.assistantMessageEvent;
		if (
			streamEvent.type !== "text_delta" &&
			streamEvent.type !== "thinking_delta" &&
			streamEvent.type !== "toolcall_delta"
		) {
			return;
		}
		if (streamEvent.delta.length === 0) return;

		const at = performance.now();
		currentResponse ??= {
			requestStartMs: pendingRequestStartMs ?? at,
			outputBytes: 0,
		};
		pendingRequestStartMs = null;
		currentResponse.firstTokenMs ??= at;
		currentResponse.outputBytes += Buffer.byteLength(streamEvent.delta, "utf8");
	});

	pi.on("message_end", (event) => {
		if (event.message.role !== "assistant") return;

		const timing = currentResponse;
		currentResponse = null;
		if (!timing || timing.firstTokenMs === undefined) return;

		const outputTokens = hasPositiveValue(event.message.usage?.output)
			? event.message.usage.output
			: estimateBytesTokens(timing.outputBytes);
		if (outputTokens <= 0) return;

		responseMetrics.push({
			outputTokens,
			decodeMs: Math.max(performance.now() - timing.firstTokenMs, 1),
			ttftMs: Math.max(timing.firstTokenMs - timing.requestStartMs, 0),
		});
	});

	pi.on("agent_end", (event, ctx) => {
		if (!ctx.hasUI) return;
		if (agentStartMs === null) return;

		const metrics = responseMetrics;
		agentStartMs = null;
		pendingRequestStartMs = null;
		currentResponse = null;
		responseMetrics = [];

		const outputTokens = metrics.reduce((sum, metric) => sum + metric.outputTokens, 0);
		const decodeMs = metrics.reduce((sum, metric) => sum + metric.decodeMs, 0);
		if (outputTokens <= 0 || decodeMs <= 0) return;

		let input = 0;
		let cacheRead = 0;
		let cacheWrite = 0;
		let totalTokens = 0;

		for (const message of event.messages) {
			if (!isAssistantMessage(message)) continue;
			input += message.usage.input || 0;
			cacheRead += message.usage.cacheRead || 0;
			cacheWrite += message.usage.cacheWrite || 0;
			totalTokens += message.usage.totalTokens || 0;
		}

		const tokensPerSecond = outputTokens / (decodeMs / 1000);
		const ttftMs = metrics.reduce((sum, metric) => sum + metric.ttftMs, 0) / metrics.length;
		const message = `TPS ${tokensPerSecond.toFixed(1)} tok/s. TTFT ${(ttftMs / 1000).toFixed(1)}s. out ${outputTokens.toLocaleString()}, in ${input.toLocaleString()}, cache r/w ${cacheRead.toLocaleString()}/${cacheWrite.toLocaleString()}, total ${totalTokens.toLocaleString()}, decode ${(decodeMs / 1000).toFixed(1)}s`;
		ctx.ui.notify(message, "info");
	});
}
