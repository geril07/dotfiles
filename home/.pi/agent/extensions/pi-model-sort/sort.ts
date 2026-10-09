/**
 * Shared constants, types, and utilities for pi-model-sort.
 */

import { type SessionEntry, sessionEntryToContextMessages } from "@earendil-works/pi-coding-agent";

/** Default config file name (placed in ~/.pi/agent/extensions/). */
export const CONFIG_FILENAME = "pi-model-sort.json";

/** Thinking levels supported by pi. Mirrors ThinkingLevel from pi-agent-core. */
export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

/** All valid thinking levels, ascending. */
export const THINKING_LEVELS: readonly ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

/** Type guard for ThinkingLevel. */
export function isThinkingLevel(value: unknown): value is ThinkingLevel {
	return typeof value === "string" && (THINKING_LEVELS as readonly string[]).includes(value);
}

export interface ModelSortConfig {
	/** Map of "provider/modelId" → last-used Unix timestamp (ms). */
	lastUsed: Record<string, number>;
}

/**
 * Parse a raw config file payload into a ModelSortConfig, dropping malformed
 * entries. Unknown fields are ignored; missing fields default to empty maps.
 */
export function parseConfig(raw: unknown): ModelSortConfig {
	const config: ModelSortConfig = { lastUsed: {} };
	if (typeof raw !== "object" || raw === null) return config;

	const obj = raw as Record<string, unknown>;
	if (typeof obj.lastUsed === "object" && obj.lastUsed !== null) {
		for (const [key, value] of Object.entries(obj.lastUsed)) {
			if (typeof value === "number" && Number.isFinite(value)) {
				config.lastUsed[key] = value;
			}
		}
	}
	return config;
}

/** Parse a model key into [provider, modelId]. Returns undefined if malformed. */
export function parseModelKey(key: string): [provider: string, modelId: string] | undefined {
	const idx = key.indexOf("/");
	if (idx === -1) return undefined;
	return [key.substring(0, idx), key.substring(idx + 1)];
}

/** Build a stable model key from provider and model id. */
export function buildModelKey(provider: string, modelId: string): string {
	return `${provider}/${modelId}`;
}

/** Reasons pi reports for session_start events. */
export type SessionStartReason = "startup" | "reload" | "new" | "resume" | "fork";

/**
 * Whether the session branch produces context messages — pi core's own
 * continuation predicate (`buildSessionContext().messages.length > 0`).
 *
 * pi seeds every NEW session with `model_change` and `thinking_level_change`
 * entries during `createAgentSession` — BEFORE extensions are bound and
 * `session_start` fires (installed pi 0.84.3, dist/core/sdk.js:241-252) — so
 * raw branch length is always > 0 by the time extensions observe it. Context
 * messages come from more than literal `message` entries: pi's
 * `sessionEntryToContextMessages` also projects `custom_message`, non-empty
 * `branch_summary`, and `compaction` entries (dist/core/session-manager.js:
 * 162-188), so a summarized branch with no literal message still counts as
 * continued for core — and must for us too.
 */
export function hasContextMessages(entries: readonly SessionEntry[]): boolean {
	return entries.flatMap(sessionEntryToContextMessages).length > 0;
}

/**
 * Whether the MRU (most recently used) startup override should apply for a
 * session start.
 *
 * Fresh starts and `/new` switch to the most recently used model. A continued
 * session (`pi -c`, `--session`) has already restored the model saved in its
 * session file — the override is skipped so global MRU does not clobber it.
 * `/resume` and forked sessions keep the session's own model as well.
 *
 * @param reason session_start reason reported by pi
 * @param hasSessionMessages whether the session branch produces context messages
 */
export function shouldApplyMruOverride(reason: SessionStartReason, hasSessionMessages: boolean): boolean {
	if (reason === "startup" && hasSessionMessages) return false;
	return reason === "startup" || reason === "new";
}

/**
 * Whether the process was launched with an explicit `--model` argument.
 *
 * Pi does not tell extensions whether the starting model came from the CLI,
 * so this inspects the argv pi was started with. An explicit model must win
 * over the MRU override: callers such as bb's Pi provider (`pi --mode rpc
 * --model provider/id`), scripts, and anyone typing `pi --model ...` expect
 * the model they asked for, and bb aborts the thread when the model pi
 * reports back differs from the one it requested.
 *
 * Only pi's own spelling counts: `--model <value>` (pi 0.84.x has no `-m`
 * alias). `--model=value` is accepted too in case pi adds it. `--models` is
 * a scope list, not a selection, and is ignored. A trailing `--model` with no
 * value is ignored.
 *
 * @param argv process arguments to inspect (normally `process.argv`)
 */
export function hasExplicitModelArg(argv: readonly string[]): boolean {
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--model") {
			const value = argv[i + 1];
			if (value !== undefined && value !== "" && !value.startsWith("-")) return true;
			continue;
		}
		if (arg.startsWith("--model=") && arg.length > "--model=".length) return true;
	}
	return false;
}

/** Explicit CLI thinking must not be reset by a startup MRU model switch. */
export function hasExplicitThinkingArg(argv: readonly string[]): boolean {
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--") break;
		for (const flag of ["--thinking", "--model", "--models"]) {
			const value = arg === flag ? argv[i + 1] : arg.startsWith(`${flag}=`) ? arg.slice(flag.length + 1) : undefined;
			if (!value || value.startsWith("-")) continue;
			if (flag === "--thinking" && isThinkingLevel(value)) return true;
			if (flag !== "--thinking" && value.split(",").some((model) => isThinkingLevel(model.slice(model.lastIndexOf(":") + 1)))) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Whether the model pi restored for this session start should be recorded as
 * last-used. Pi 0.84.3 restores a continued session's model during
 * construction without emitting `model_select`, so recency would otherwise
 * never update for continuations.
 *
 * Only starts of a session that already carries context count (continued
 * `startup`, `resume`, `fork`). "new" is excluded — a fresh session has no
 * restored model even when a `setup` hook appended messages before
 * `session_start`. "reload" is excluded — it rebuilds the extension runner
 * around the same live session without a construction-time restore, and the
 * active model was already recorded when it became active.
 *
 * @param reason session_start reason reported by pi
 * @param hasSessionMessages whether the session branch produces context messages
 */
export function shouldTimestampRestoredModel(reason: SessionStartReason, hasSessionMessages: boolean): boolean {
	if (!hasSessionMessages) return false;
	return reason === "startup" || reason === "resume" || reason === "fork";
}

/**
 * Sort an array of models (or model-like objects) by last-usage recency.
 *
 * Sort order:
 *   1. Current model first (if currentModelKey is provided)
 *   2. Most recently used (highest timestamp) first
 *   3. Provider name alphabetically
 *   4. Model id alphabetically
 *
 * Models with no recorded usage get timestamp 0 (sorted last).
 */
export function sortByLastUsed<T extends { provider: string; id: string }>(
	items: T[],
	lastUsed: Record<string, number>,
	currentModelKey: string | null,
): T[] {
	const sorted = [...items];
	sorted.sort((a, b) => {
		const aKey = buildModelKey(a.provider, a.id);
		const bKey = buildModelKey(b.provider, b.id);

		if (currentModelKey !== null) {
			const aIsCurrent = aKey === currentModelKey;
			const bIsCurrent = bKey === currentModelKey;
			if (aIsCurrent && !bIsCurrent) return -1;
			if (!aIsCurrent && bIsCurrent) return 1;
		}

		const aLast = lastUsed[aKey] ?? 0;
		const bLast = lastUsed[bKey] ?? 0;
		if (aLast !== bLast) return bLast - aLast;

		return a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id);
	});
	return sorted;
}

/**
 * MRU model lookup — finds the most recently used model that exists in the
 * registry and has auth configured. Returns undefined if no usable model is
 * found. `find`/`hasConfiguredAuth` match the pi 0.84.3 ModelRegistry
 * extension facade surface.
 */
export function findMruModel(
	lastUsed: Record<string, number>,
	registry: { find(provider: string, modelId: string): unknown; hasConfiguredAuth(model: unknown): boolean },
): unknown | undefined {
	const sorted = Object.entries(lastUsed).sort(([, a], [, b]) => b - a);
	for (const [key] of sorted) {
		const parsed = parseModelKey(key);
		if (!parsed) continue;
		const [provider, modelId] = parsed;
		const model = registry.find(provider, modelId);
		if (model && registry.hasConfiguredAuth(model)) {
			return model;
		}
	}
	return undefined;
}
